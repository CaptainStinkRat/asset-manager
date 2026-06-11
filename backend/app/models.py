import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, Date, ForeignKey, Enum, Boolean, Table
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class AssetStatus(str, enum.Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    RETIRED = "retired"
    MAINTENANCE = "maintenance"


class ChangeRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"


class RequestType(str, enum.Enum):
    ASSIGN = "assign"
    RETURN = "return"
    TRANSFER = "transfer"
    RETIRE = "retire"
    EOL_EXTENSION = "eol_extension"
    MAINTENANCE = "maintenance"
    OTHER = "other"


group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    members = relationship("User", secondary="group_members", back_populates="groups", lazy="selectin")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    assignments = relationship("Assignment", foreign_keys="Assignment.user_id", back_populates="user")
    change_requests = relationship("ChangeRequest", foreign_keys="ChangeRequest.requester_id", back_populates="requester")
    groups = relationship("Group", secondary="group_members", back_populates="members", lazy="selectin")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    category = Column(String(100), nullable=False)
    serial_number = Column(String(200), unique=True, nullable=True)
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Float, nullable=True)
    eol_date = Column(Date, nullable=True)
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    assignments = relationship("Assignment", back_populates="asset")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_date = Column(DateTime, default=datetime.datetime.utcnow)
    expected_return_date = Column(Date, nullable=True)
    returned_date = Column(DateTime, nullable=True)
    notes = Column(Text, default="")

    asset = relationship("Asset", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id], back_populates="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])
    group = relationship("Group", lazy="selectin")


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_type = Column(Enum(RequestType), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    description = Column(Text, nullable=False)
    justification = Column(Text, default="")
    status = Column(Enum(ChangeRequestStatus), default=ChangeRequestStatus.PENDING, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    requester = relationship("User", foreign_keys=[requester_id], back_populates="change_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    asset = relationship("Asset")
    target_user = relationship("User", foreign_keys=[target_user_id])
    target_group = relationship("Group", lazy="selectin")
