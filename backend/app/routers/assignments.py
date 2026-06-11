from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Assignment, Asset, AssetStatus, User, UserRole, Group
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
        .options(selectinload(Assignment.asset), selectinload(Assignment.user), selectinload(Assignment.group))
        .order_by(Assignment.assigned_date.desc())
    )
    if user.role != UserRole.ADMIN:
        stmt = stmt.where(Assignment.user_id == user.id)
    if active_only:
        stmt = stmt.where(Assignment.returned_date.is_(None))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=list[AssignmentOut], status_code=201)
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
    if not body.user_id and not body.group_id:
        raise HTTPException(status_code=400, detail="Provide user_id or group_id")

    return_date = date.fromisoformat(body.expected_return_date) if body.expected_return_date else None

    targets: list[User] = []
    group = None
    if body.group_id:
        result = await db.execute(
            select(Group).where(Group.id == body.group_id).options(selectinload(Group.members))
        )
        group = result.scalar_one_or_none()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        targets = group.members
    elif body.user_id:
        result = await db.execute(select(User).where(User.id == body.user_id))
        target = result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        targets = [target]

    assignments = []
    for t in targets:
        assignment = Assignment(
            asset_id=body.asset_id,
            user_id=t.id,
            group_id=group.id if group else None,
            assigned_by=user.id,
            expected_return_date=return_date,
            notes=body.notes,
        )
        db.add(assignment)
        assignments.append(assignment)

    asset.status = AssetStatus.ASSIGNED
    await db.commit()

    for a in assignments:
        await db.refresh(a)

    ids = [a.id for a in assignments]
    stmt = (
        select(Assignment)
        .where(Assignment.id.in_(ids))
        .options(selectinload(Assignment.asset), selectinload(Assignment.user), selectinload(Assignment.group))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{assignment_id}/return", response_model=AssignmentOut)
async def return_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(selectinload(Assignment.asset), selectinload(Assignment.user), selectinload(Assignment.group))
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
        .options(selectinload(Assignment.asset), selectinload(Assignment.user), selectinload(Assignment.group))
        .where(Assignment.user_id == user.id, Assignment.returned_date.is_(None))
        .order_by(Assignment.assigned_date.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
