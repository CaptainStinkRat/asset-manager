from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Group, User, UserRole, group_members
from app.schemas import GroupCreate, GroupUpdate, GroupOut
from app.dependencies import get_current_user, require_admin

router = APIRouter()


@router.get("", response_model=list[GroupOut])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Group).options(selectinload(Group.members)).order_by(Group.name)
    if user.role != UserRole.ADMIN:
        stmt = stmt.where(Group.members.any(User.id == user.id))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    body: GroupCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = await db.execute(select(Group).where(Group.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Group name already exists")
    group = Group(name=body.name, description=body.description)
    if body.member_ids:
        result = await db.execute(select(User).where(User.id.in_(body.member_ids)))
        group.members = list(result.scalars().all())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    stmt = select(Group).where(Group.id == group.id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/{group_id}", response_model=GroupOut)
async def get_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.role != UserRole.ADMIN and user not in group.members:
        raise HTTPException(status_code=403, detail="Access denied")
    return group


@router.put("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: int,
    body: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if body.name is not None:
        existing = await db.execute(select(Group).where(Group.name == body.name, Group.id != group_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Group name already exists")
        group.name = body.name
    if body.description is not None:
        group.description = body.description
    if body.member_ids is not None:
        result = await db.execute(select(User).where(User.id.in_(body.member_ids)))
        group.members = list(result.scalars().all())
    await db.commit()
    await db.refresh(group)
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    return result.scalar_one()


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await db.delete(group)
    await db.commit()


@router.post("/{group_id}/members", response_model=GroupOut)
async def add_members(
    group_id: int,
    body: list[int],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    result = await db.execute(select(User).where(User.id.in_(body)))
    members = list(result.scalars().all())
    existing_ids = {m.id for m in group.members}
    for m in members:
        if m.id not in existing_ids:
            group.members.append(m)
    await db.commit()
    await db.refresh(group)
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    return result.scalar_one()


@router.delete("/{group_id}/members/{user_id}", response_model=GroupOut)
async def remove_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group.members = [m for m in group.members if m.id != user_id]
    await db.commit()
    await db.refresh(group)
    stmt = select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    result = await db.execute(stmt)
    return result.scalar_one()
