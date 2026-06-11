from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Assignment, Asset, AssetStatus, User, UserRole
from app.schemas import AssignmentCreate, AssignmentOut
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[AssignmentOut])
async def list_assignments(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Assignment)
        .options(selectinload(Assignment.asset), selectinload(Assignment.user))
        .order_by(Assignment.assigned_date.desc())
    )
    if user.role != UserRole.ADMIN:
        stmt = stmt.where(Assignment.user_id == user.id)
    if active_only:
        stmt = stmt.where(Assignment.returned_date.is_(None))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=AssignmentOut)
async def create_assignment(
    body: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Asset).where(Asset.id == body.asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status != AssetStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Asset is not available")
    result = await db.execute(select(User).where(User.id == body.user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    assignment = Assignment(
        asset_id=body.asset_id,
        user_id=body.user_id,
        assigned_by=user.id,
        expected_return_date=date.fromisoformat(body.expected_return_date) if body.expected_return_date else None,
        notes=body.notes,
    )
    asset.status = AssetStatus.ASSIGNED
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    stmt = (
        select(Assignment)
        .where(Assignment.id == assignment.id)
        .options(selectinload(Assignment.asset), selectinload(Assignment.user))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.put("/{assignment_id}/return", response_model=AssignmentOut)
async def return_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(selectinload(Assignment.asset), selectinload(Assignment.user))
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if assignment.returned_date:
        raise HTTPException(status_code=400, detail="Already returned")
    if user.role != UserRole.ADMIN and assignment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your assignment")
    assignment.returned_date = datetime.utcnow()
    assignment.asset.status = AssetStatus.AVAILABLE
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.get("/my", response_model=list[AssignmentOut])
async def my_assignments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Assignment)
        .options(selectinload(Assignment.asset), selectinload(Assignment.user))
        .where(Assignment.user_id == user.id, Assignment.returned_date.is_(None))
        .order_by(Assignment.assigned_date.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
