import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import UserRole, AssetStatus, ChangeRequestStatus, RequestType


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    name: str
    description: str = ""
    member_ids: list[int] = []


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[list[int]] = None


class GroupOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime.datetime
    members: list[UserOut] = []

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class LoginRequest(BaseModel):
    username: str
    password: str


class AssetCreate(BaseModel):
    name: str
    description: str = ""
    category: str
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    eol_date: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    eol_date: Optional[str] = None
    status: Optional[AssetStatus] = None


class AssetOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime.date] = None
    purchase_price: Optional[float] = None
    eol_date: Optional[datetime.date] = None
    status: AssetStatus
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    asset_id: int
    user_id: Optional[int] = None
    group_id: Optional[int] = None
    expected_return_date: Optional[str] = None
    notes: str = ""


class AssignmentOut(BaseModel):
    id: int
    asset_id: int
    user_id: int
    group_id: Optional[int] = None
    assigned_by: Optional[int] = None
    assigned_date: datetime.datetime
    expected_return_date: Optional[datetime.date] = None
    returned_date: Optional[datetime.datetime] = None
    notes: str
    asset: Optional[AssetOut] = None
    user: Optional[UserOut] = None
    group: Optional[GroupOut] = None

    model_config = {"from_attributes": True}


class ChangeRequestCreate(BaseModel):
    request_type: RequestType
    asset_id: Optional[int] = None
    target_user_id: Optional[int] = None
    target_group_id: Optional[int] = None
    description: str
    justification: str = ""


class ChangeRequestReview(BaseModel):
    status: ChangeRequestStatus
    review_notes: str = ""


class ChangeRequestOut(BaseModel):
    id: int
    requester_id: int
    request_type: RequestType
    asset_id: Optional[int] = None
    target_user_id: Optional[int] = None
    target_group_id: Optional[int] = None
    description: str
    justification: str
    status: ChangeRequestStatus
    reviewed_by: Optional[int] = None
    review_notes: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    requester: Optional[UserOut] = None
    reviewer: Optional[UserOut] = None
    asset: Optional[AssetOut] = None
    target_user: Optional[UserOut] = None
    target_group: Optional[GroupOut] = None

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_assets: int
    available_assets: int
    assigned_assets: int
    retired_assets: int
    eol_soon: int
    pending_requests: int
    total_users: int
    active_assignments: int


class EOLAlert(BaseModel):
    asset: AssetOut
    days_remaining: int
