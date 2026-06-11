from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Asset, AssetStatus, ChangeRequest, ChangeRequestStatus, Assignment, User
from app.schemas import DashboardStats, EOLAlert
from app.dependencies import get_current_user, require_admin

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count(Asset.id)))).scalar() or 0
    available = (
        await db.execute(
            select(func.count(Asset.id)).where(Asset.status == AssetStatus.AVAILABLE)
        )
    ).scalar() or 0
    assigned = (
        await db.execute(
            select(func.count(Asset.id)).where(Asset.status == AssetStatus.ASSIGNED)
        )
    ).scalar() or 0
    retired = (
        await db.execute(
            select(func.count(Asset.id)).where(Asset.status == AssetStatus.RETIRED)
        )
    ).scalar() or 0

    threshold = date.today() + timedelta(days=90)
    eol_soon = (
        await db.execute(
            select(func.count(Asset.id)).where(
                Asset.eol_date.isnot(None),
                Asset.eol_date <= threshold,
                Asset.status != AssetStatus.RETIRED,
            )
        )
    ).scalar() or 0

    pending = (
        await db.execute(
            select(func.count(ChangeRequest.id)).where(
                ChangeRequest.status == ChangeRequestStatus.PENDING
            )
        )
    ).scalar() or 0

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    active_assignments = (
        await db.execute(
            select(func.count(Assignment.id)).where(Assignment.returned_date.is_(None))
        )
    ).scalar() or 0

    return DashboardStats(
        total_assets=total,
        available_assets=available,
        assigned_assets=assigned,
        retired_assets=retired,
        eol_soon=eol_soon,
        pending_requests=pending,
        total_users=total_users,
        active_assignments=active_assignments,
    )


@router.get("/eol-alerts", response_model=list[EOLAlert])
async def eol_alerts(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    threshold = date.today() + timedelta(days=days)
    result = await db.execute(
        select(Asset).where(
            Asset.eol_date.isnot(None),
            Asset.eol_date <= threshold,
            Asset.status != AssetStatus.RETIRED,
        ).order_by(Asset.eol_date)
    )
    assets = result.scalars().all()
    return [
        EOLAlert(asset=a, days_remaining=(a.eol_date - date.today()).days)
        for a in assets
    ]
