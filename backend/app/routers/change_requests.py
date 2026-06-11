from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Asset, AssetStatus, Assignment, ChangeRequest, ChangeRequestStatus, User, UserRole, Group
from app.schemas import ChangeRequestCreate, ChangeRequestOut, ChangeRequestReview
from app.dependencies import get_current_user, require_admin

router = APIRouter()


@router.get("", response_model=list[ChangeRequestOut])
async def list_requests(
    status: ChangeRequestStatus | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(ChangeRequest)
        .options(
            selectinload(ChangeRequest.requester),
            selectinload(ChangeRequest.reviewer),
            selectinload(ChangeRequest.asset),
            selectinload(ChangeRequest.target_user),
            selectinload(ChangeRequest.target_group),
        )
        .order_by(ChangeRequest.created_at.desc())
    )
    if user.role != UserRole.ADMIN:
        stmt = stmt.where(ChangeRequest.requester_id == user.id)
    if status:
        stmt = stmt.where(ChangeRequest.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ChangeRequestOut)
async def create_request(
    body: ChangeRequestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cr = ChangeRequest(
        requester_id=user.id,
        request_type=body.request_type,
        asset_id=body.asset_id,
        target_user_id=body.target_user_id,
        target_group_id=body.target_group_id,
        description=body.description,
        justification=body.justification,
    )
    db.add(cr)
    await db.commit()
    await db.refresh(cr)
    stmt = (
        select(ChangeRequest)
        .where(ChangeRequest.id == cr.id)
        .options(
            selectinload(ChangeRequest.requester),
            selectinload(ChangeRequest.asset),
            selectinload(ChangeRequest.target_user),
            selectinload(ChangeRequest.target_group),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/{request_id}", response_model=ChangeRequestOut)
async def get_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(ChangeRequest)
        .where(ChangeRequest.id == request_id)
        .options(
            selectinload(ChangeRequest.requester),
            selectinload(ChangeRequest.reviewer),
            selectinload(ChangeRequest.asset),
            selectinload(ChangeRequest.target_user),
            selectinload(ChangeRequest.target_group),
        )
    result = await db.execute(stmt)
    cr = result.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="Request not found")
    if user.role != UserRole.ADMIN and cr.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    return cr


@router.put("/{request_id}/review", response_model=ChangeRequestOut)
async def review_request(
    request_id: int,
    body: ChangeRequestReview,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = (
        select(ChangeRequest)
        .where(ChangeRequest.id == request_id)
        .options(
            selectinload(ChangeRequest.requester),
            selectinload(ChangeRequest.reviewer),
            selectinload(ChangeRequest.asset),
            selectinload(ChangeRequest.target_user),
            selectinload(ChangeRequest.target_group),
        )
    )
    cr = (await db.execute(stmt)).scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="Request not found")
    if cr.status != ChangeRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request already reviewed")
    cr.status = body.status
    cr.reviewed_by = admin.id
    cr.review_notes = body.review_notes

    # Auto-assign when approved for assign/transfer with a target
    if body.status == ChangeRequestStatus.APPROVED and cr.asset_id:
        if cr.request_type in (RequestType.ASSIGN, RequestType.TRANSFER):
            targets: list[User] = []
            target_group = None
            if cr.target_group_id:
                result = await db.execute(
                    select(Group).where(Group.id == cr.target_group_id).options(selectinload(Group.members))
                )
                target_group = result.scalar_one_or_none()
                if target_group:
                    targets = target_group.members
            elif cr.target_user_id:
                result = await db.execute(select(User).where(User.id == cr.target_user_id))
                target = result.scalar_one_or_none()
                if target:
                    targets = [target]

            asset_result = await db.execute(select(Asset).where(Asset.id == cr.asset_id))
            asset = asset_result.scalar_one_or_none()
            if asset and targets:
                for t in targets:
                    db.add(Assignment(
                        asset_id=cr.asset_id,
                        user_id=t.id,
                        group_id=target_group.id if target_group else None,
                        assigned_by=admin.id,
                    ))
                asset.status = AssetStatus.ASSIGNED

    await db.commit()
    await db.refresh(cr)
    return cr
