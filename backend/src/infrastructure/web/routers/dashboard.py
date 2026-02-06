"""Dashboard routes for statistics and metrics."""

from datetime import datetime, timedelta
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.infrastructure.database import get_database
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.authorization import AuthContext, get_club_filter_ctx

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_clubs: int
    total_members: int
    active_members: int
    annual_payments: int
    pending_payments: int
    upcoming_seminars: int
    expiring_licenses: int


class ExpiringLicense(BaseModel):
    """Expiring license info."""
    id: str
    member_name: str
    license_number: str
    expiry_date: str
    days_remaining: int


class UpcomingSeminar(BaseModel):
    """Upcoming seminar info."""
    id: str
    title: str
    date: str
    time: str
    location: str
    participants: int
    max_participants: int
    price: float


class RecentActivity(BaseModel):
    """Recent activity item."""
    id: str
    type: str
    message: str
    user: str
    time: str


class DashboardData(BaseModel):
    """Complete dashboard data response."""
    stats: DashboardStats
    expiring_licenses: List[ExpiringLicense]
    upcoming_seminars: List[UpcomingSeminar]
    recent_activity: List[RecentActivity]


@router.get("/stats", response_model=DashboardData)
async def get_dashboard_stats(
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get dashboard statistics and data."""
    db = get_database()
    now = datetime.utcnow()

    # Club-scoped filtering
    club_id = get_club_filter_ctx(ctx)
    member_filter = {"club_id": club_id} if club_id else {}
    license_filter = {"club_id": club_id} if club_id else {}
    payment_filter = {"club_id": club_id} if club_id else {}

    # Get counts
    if club_id:
        total_clubs = 1
    else:
        total_clubs = await db["clubs"].count_documents({})
    total_members = await db["members"].count_documents(member_filter)
    active_members = await db["members"].count_documents({**member_filter, "status": "active"})

    # Annual payments (current year)
    current_year = now.year
    annual_payments = await db["payments"].count_documents({
        **payment_filter,
        "payment_year": current_year
    })
    pending_payments = await db["payments"].count_documents({**payment_filter, "status": "pending"})

    # Upcoming seminars (next 30 days)
    upcoming_seminars_count = await db["seminars"].count_documents({
        "start_date": {"$gte": now, "$lte": now + timedelta(days=30)},
        "status": {"$ne": "cancelled"}
    })

    # Expiring licenses (next 30 days)
    expiring_licenses_count = await db["licenses"].count_documents({
        **license_filter,
        "expiration_date": {"$gte": now, "$lte": now + timedelta(days=30)},
        "status": "active"
    })

    stats = DashboardStats(
        total_clubs=total_clubs,
        total_members=total_members,
        active_members=active_members,
        annual_payments=annual_payments,
        pending_payments=pending_payments,
        upcoming_seminars=upcoming_seminars_count,
        expiring_licenses=expiring_licenses_count
    )

    # Get expiring licenses details
    expiring_licenses_cursor = db["licenses"].find({
        **license_filter,
        "expiration_date": {"$gte": now, "$lte": now + timedelta(days=30)},
        "status": "active"
    }).sort("expiration_date", 1).limit(5)

    expiring_licenses_docs = await expiring_licenses_cursor.to_list(length=5)
    expiring_licenses = []

    for lic in expiring_licenses_docs:
        # Get member name
        member_id = lic.get("member_id")
        member = None
        if member_id:
            try:
                member = await db["members"].find_one({"_id": ObjectId(member_id)})
            except Exception:
                pass
        member_name = f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() if member else "Desconocido"

        expiry_date = lic.get("expiration_date")
        days_remaining = (expiry_date - now).days if expiry_date else 0

        expiring_licenses.append(ExpiringLicense(
            id=str(lic.get("_id")),
            member_name=member_name,
            license_number=lic.get("license_number", ""),
            expiry_date=expiry_date.isoformat() if expiry_date else "",
            days_remaining=max(0, days_remaining)
        ))

    # Get upcoming seminars details
    seminars_cursor = db["seminars"].find({
        "start_date": {"$gte": now},
        "status": {"$ne": "cancelled"}
    }).sort("start_date", 1).limit(3)

    seminars_docs = await seminars_cursor.to_list(length=3)
    upcoming_seminars = []

    for sem in seminars_docs:
        start_date = sem.get("start_date")
        upcoming_seminars.append(UpcomingSeminar(
            id=str(sem.get("_id")),
            title=sem.get("title", ""),
            date=start_date.strftime("%Y-%m-%d") if start_date else "",
            time=start_date.strftime("%H:%M") if start_date else "",
            location=f"{sem.get('venue', '')}, {sem.get('city', '')}",
            participants=sem.get("current_participants", 0),
            max_participants=sem.get("max_participants", 0),
            price=float(sem.get("price", 0))
        ))

    # Get recent activity (combine recent members, payments, licenses)
    recent_activity = []

    # Recent members (last 24 hours)
    recent_members_cursor = db["members"].find({
        **member_filter,
        "created_at": {"$gte": now - timedelta(hours=24)}
    }).sort("created_at", -1).limit(3)
    recent_members = await recent_members_cursor.to_list(length=3)

    for member in recent_members:
        created_at = member.get("created_at")
        time_diff = _format_time_diff(now, created_at)
        recent_activity.append(RecentActivity(
            id=str(member.get("_id")),
            type="member",
            message="Nuevo miembro registrado",
            user=f"{member.get('first_name', '')} {member.get('last_name', '')}",
            time=time_diff
        ))

    # Recent payments (last 24 hours)
    recent_payments_cursor = db["payments"].find({
        **payment_filter,
        "created_at": {"$gte": now - timedelta(hours=24)}
    }).sort("created_at", -1).limit(3)
    recent_payments = await recent_payments_cursor.to_list(length=3)

    for payment in recent_payments:
        created_at = payment.get("created_at")
        time_diff = _format_time_diff(now, created_at)
        # Get member name
        member_id = payment.get("member_id")
        member = None
        if member_id:
            try:
                member = await db["members"].find_one({"_id": ObjectId(member_id)})
            except Exception:
                pass
        member_name = f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() if member else "Desconocido"
        recent_activity.append(RecentActivity(
            id=str(payment.get("_id")),
            type="payment",
            message="Pago recibido",
            user=member_name,
            time=time_diff
        ))

    # Recent license renewals (last 24 hours)
    recent_licenses_cursor = db["licenses"].find({
        **license_filter,
        "updated_at": {"$gte": now - timedelta(hours=24)},
        "is_renewed": True
    }).sort("updated_at", -1).limit(2)
    recent_licenses = await recent_licenses_cursor.to_list(length=2)

    for lic in recent_licenses:
        updated_at = lic.get("updated_at")
        time_diff = _format_time_diff(now, updated_at)
        member_id = lic.get("member_id")
        member = None
        if member_id:
            try:
                member = await db["members"].find_one({"_id": ObjectId(member_id)})
            except Exception:
                pass
        member_name = f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() if member else "Desconocido"
        recent_activity.append(RecentActivity(
            id=str(lic.get("_id")),
            type="license",
            message="Licencia renovada",
            user=member_name,
            time=time_diff
        ))

    # Sort by recency and limit to 5
    recent_activity = sorted(
        recent_activity,
        key=lambda x: _parse_time_diff(x.time),
        reverse=False
    )[:5]

    return DashboardData(
        stats=stats,
        expiring_licenses=expiring_licenses,
        upcoming_seminars=upcoming_seminars,
        recent_activity=recent_activity
    )


def _format_time_diff(now: datetime, timestamp: Optional[datetime]) -> str:
    """Format time difference as human readable string."""
    if not timestamp:
        return "Desconocido"

    diff = now - timestamp
    minutes = int(diff.total_seconds() / 60)
    hours = int(minutes / 60)
    days = int(hours / 24)

    if minutes < 1:
        return "Ahora mismo"
    elif minutes < 60:
        return f"Hace {minutes} minuto{'s' if minutes != 1 else ''}"
    elif hours < 24:
        return f"Hace {hours} hora{'s' if hours != 1 else ''}"
    else:
        return f"Hace {days} día{'s' if days != 1 else ''}"


def _parse_time_diff(time_str: str) -> int:
    """Parse time diff string to minutes for sorting."""
    if "Ahora" in time_str:
        return 0
    elif "minuto" in time_str:
        try:
            return int(time_str.split()[1])
        except (IndexError, ValueError):
            return 0
    elif "hora" in time_str:
        try:
            return int(time_str.split()[1]) * 60
        except (IndexError, ValueError):
            return 0
    elif "día" in time_str:
        try:
            return int(time_str.split()[1]) * 60 * 24
        except (IndexError, ValueError):
            return 0
    return 9999
