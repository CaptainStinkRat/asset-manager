from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import Asset, AssetStatus, Assignment, User, UserRole, group_members
from app.schemas import AssetCreate, AssetUpdate, AssetOut
from app.dependencies import get_current_user, require_admin

router = APIRouter()


@router.get("", response_model=list[AssetOut])
async def list_assets(
    category: Optional[str] = None,
    status: Optional[AssetStatus] = None,
    search: Optional[str] = None,
    group_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Asset)
    if category:
        stmt = stmt.where(Asset.category.ilike(f"%{category}%"))
    if status:
        stmt = stmt.where(Asset.status == status)
    if search:
        stmt = stmt.where(
            Asset.name.ilike(f"%{search}%")
            | Asset.serial_number.ilike(f"%{search}%")
            | Asset.description.ilike(f"%{search}%")
        )
    if group_id:
        stmt = stmt.where(
            Asset.id.in_(
                select(Assignment.asset_id).where(
                    Assignment.returned_date.is_(None),
                    Assignment.user_id.in_(
                        select(group_members.c.user_id).where(group_members.c.group_id == group_id)
                    ),
                )
            )
        )
    stmt = stmt.order_by(Asset.name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=AssetOut)
async def create_asset(
    body: AssetCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    asset = Asset(
        name=body.name,
        description=body.description,
        category=body.category,
        serial_number=body.serial_number,
        purchase_date=date.fromisoformat(body.purchase_date) if body.purchase_date else None,
        purchase_price=body.purchase_price,
        eol_date=date.fromisoformat(body.eol_date) if body.eol_date else None,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetOut)
async def get_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.put("/{asset_id}", response_model=AssetOut)
async def update_asset(
    asset_id: int,
    body: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if body.name is not None:
        asset.name = body.name
    if body.description is not None:
        asset.description = body.description
    if body.category is not None:
        asset.category = body.category
    if body.serial_number is not None:
        asset.serial_number = body.serial_number
    if body.purchase_date is not None:
        asset.purchase_date = date.fromisoformat(body.purchase_date)
    if body.purchase_price is not None:
        asset.purchase_price = body.purchase_price
    if body.eol_date is not None:
        asset.eol_date = date.fromisoformat(body.eol_date)
    if body.status is not None:
        asset.status = body.status
    await db.commit()
    await db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)
    await db.commit()
