"""User and authentication routes."""

from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.domain.exceptions.user import UserNotFoundError, UserAlreadyExistsError
from src.infrastructure.web.dto.user_dto import UserCreate, UserResponse, UserMeResponse, Token
from src.infrastructure.web.dependencies import (
    get_all_users_use_case,
    get_user_by_id_use_case,
    get_create_user_use_case,
    get_authenticate_user_use_case,
    get_auth_context,
)
from src.infrastructure.web.authorization import AuthContext
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
    CreateUserUseCase,
    AuthenticateUserUseCase
)


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
            data={"sub": user.email}, expires_delta=access_token_expires
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
    """Login user and return JWT token."""
    user = await authenticate_user_use_case.execute(form_data.username)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
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
    limit: int = 100,
    get_all_users_use_case: GetAllUsersUseCase = Depends(get_all_users_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all users (requires authentication)."""
    users = await get_all_users_use_case.execute(limit)
    return UserMapper.to_response_list(users)


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