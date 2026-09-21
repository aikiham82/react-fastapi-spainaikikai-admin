"""User and authentication routes."""

from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.domain.exceptions.user import (
    UserNotFoundError,
    UserAlreadyExistsError,
    EmailAlreadyInUseError,
)
from src.infrastructure.web.dto.user_dto import (
    UserCreate,
    UserResponse,
    UserMeResponse,
    UpdateUserEmailDTO,
    Token,
)
from src.infrastructure.web.dto.password_reset_dto import AdminPasswordResetLinkResponseDTO
from src.infrastructure.web.dependencies import (
    get_all_users_use_case,
    get_user_by_id_use_case,
    get_create_user_use_case,
    get_authenticate_user_use_case,
    get_auth_context,
    get_generate_admin_password_reset_link_use_case,
    get_user_by_member_id_use_case,
    get_update_user_email_use_case,
)
from src.infrastructure.web.authorization import AuthContext, require_super_admin
from src.infrastructure.web.mappers import UserMapper
from src.infrastructure.web.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from src.application.use_cases.user_use_cases import (
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    GetUserByMemberIdUseCase,
    CreateUserUseCase,
    UpdateUserEmailUseCase,
    AuthenticateUserUseCase
)
from src.application.use_cases.password_reset import GenerateAdminPasswordResetLinkUseCase


router = APIRouter(tags=["users"])


@router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    create_user_use_case: CreateUserUseCase = Depends(get_create_user_use_case)
):
    """Register a new user."""
    try:
        hashed_password = get_password_hash(user_data.password)
        user = await create_user_use_case.execute(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password
        )
        
        # Create access token for the new user
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.post("/auth/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    authenticate_user_use_case: AuthenticateUserUseCase = Depends(get_authenticate_user_use_case)
):
    """Login user and return JWT token.

    The identifier is an email or a user name, and a user name can belong to
    more than one account, so the password decides which one signs in.
    """
    candidates = await authenticate_user_use_case.execute(form_data.username)

    user = next(
        (candidate for candidate in candidates
         if verify_password(form_data.password, candidate.hashed_password)),
        None
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    
    return Token(access_token=access_token)


@router.get("/users/me", response_model=UserMeResponse)
async def read_users_me(ctx: AuthContext = Depends(get_auth_context)):
    """Get current user information with member-derived fields."""
    response = UserMapper.to_response(ctx.user)
    return UserMeResponse(
        **response.model_dump(),
        club_role=ctx.member.club_role.value if ctx.member else None,
        club_id=ctx.member.club_id if ctx.member else None,
    )


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    limit: int = 0,
    get_all_users_use_case: GetAllUsersUseCase = Depends(get_all_users_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all users (super admin only).

    Every login email in the association is in this response, which is the
    same data the per-member endpoint gates.
    """
    require_super_admin(ctx)

    users = await get_all_users_use_case.execute(limit)
    return UserMapper.to_response_list(users)


@router.get(
    "/users/by-member/{member_id}",
    response_model=UserResponse,
    summary="Get the login account of a member",
    description="Read the account a member signs in with, including its login email."
)
async def get_user_by_member(
    member_id: str,
    use_case: GetUserByMemberIdUseCase = Depends(get_user_by_member_id_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get the login account linked to a member (super admin only).

    The login email lives only on the account, so it is invisible anywhere
    else in the product. Support needs to see it to explain why the
    self-service reset never reaches the club.
    """
    require_super_admin(ctx)

    try:
        user = await use_case.execute(member_id)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user account linked to member {member_id}"
        )

    return UserMapper.to_response(user)


@router.patch(
    "/users/{user_id}/email",
    response_model=UserResponse,
    summary="Correct the login email of an account",
    description="Change the email an account signs in with, so self-service reset reaches it."
)
async def update_user_email(
    user_id: str,
    request: UpdateUserEmailDTO,
    use_case: UpdateUserEmailUseCase = Depends(get_update_user_email_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Correct the login email of an account (super admin only).

    Clubs whose account holds an address they never read cannot recover their
    password on their own. Fixing it here is what stops the ticket recurring.
    """
    require_super_admin(ctx)

    try:
        user = await use_case.execute(user_id, request.email)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    except EmailAlreadyInUseError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ese correo ya pertenece a otra cuenta"
        )

    return UserMapper.to_response(user)


@router.post(
    "/users/{user_id}/password-reset-link",
    response_model=AdminPasswordResetLinkResponseDTO,
    summary="Issue a password reset link",
    description="Generate a password reset link and return it instead of emailing it."
)
async def generate_password_reset_link(
    user_id: str,
    use_case: GenerateAdminPasswordResetLinkUseCase = Depends(
        get_generate_admin_password_reset_link_use_case
    ),
    ctx: AuthContext = Depends(get_auth_context)
) -> AdminPasswordResetLinkResponseDTO:
    """Issue a password reset link for an account (super admin only).

    Clubs whose login email is unreachable cannot use the self-service flow,
    so the link is handed to a super admin for delivery by another channel.
    """
    require_super_admin(ctx)

    try:
        result = await use_case.execute(user_id, issued_by=ctx.user.id)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    return AdminPasswordResetLinkResponseDTO(
        url=result.url,
        email=result.email,
        expires_at=result.expires_at
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    get_user_by_id_use_case: GetUserByIdUseCase = Depends(get_user_by_id_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get user by ID (requires authentication)."""
    try:
        user = await get_user_by_id_use_case.execute(user_id)
        return UserMapper.to_response(user)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )