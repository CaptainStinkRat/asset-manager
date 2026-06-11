from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ChangeRequest, ChangeRequestStatus, User, UserRole
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
        )
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
    await db.commit()
    await db.refresh(cr)
    return cr
