from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
from backend.app.models.user import UserRole
from backend.app.schemas.facility import FacilityResponse
from backend.app.models.facility import FacilityType

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    role: UserRole = UserRole.CLINIC_STAFF
    facility_id: Optional[int] = None
    is_active: bool = True

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.CLINIC_STAFF

    facility_id: Optional[int] = None
    facility_name: Optional[str] = None
    facility_type: Optional[FacilityType] = None

    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: int
    last_login_at: Optional[datetime] = None
    created_at: datetime
    facility: Optional[FacilityResponse] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None
    facility_id: Optional[int] = None
