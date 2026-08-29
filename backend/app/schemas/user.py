from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
from backend.app.models.user import UserRole
from backend.app.schemas.facility import FacilityResponse

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.CLINIC_STAFF
    facility_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

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
