from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.models.user import UserAccount, UserRole
from backend.app.models.facility import Facility
from backend.app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from backend.app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new healthcare staff or admin user account.
    Returns access token and user profile for immediate sign-in.
    """
    # Check if email is already taken
    existing_user = db.query(UserAccount).filter(UserAccount.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # If facility_id provided, verify it exists
    if user_in.facility_id:
        facility = db.query(Facility).filter(Facility.facility_id == user_in.facility_id).first()
        if not facility:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Facility ID #{user_in.facility_id} does not exist"
            )

    hashed_pw = get_password_hash(user_in.password)

    new_user = UserAccount(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed_pw,
        role=user_in.role,
        facility_id=user_in.facility_id,
        is_active=True,
        last_login_at=datetime.now(timezone.utc)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_payload = {
        "sub": new_user.email,
        "user_id": new_user.user_id,
        "role": new_user.role.value,
        "facility_id": new_user.facility_id
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=new_user
    )

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Standard OAuth2 password grant login."""
    user = db.query(UserAccount).filter(UserAccount.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token_payload = {
        "sub": user.email,
        "user_id": user.user_id,
        "role": user.role.value,
        "facility_id": user.facility_id
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@router.post("/json-login", response_model=Token)
def json_login(login_data: UserLogin, db: Session = Depends(get_db)):
    """JSON body login endpoint for UI clients."""
    user = db.query(UserAccount).filter(UserAccount.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token_payload = {
        "sub": user.email,
        "user_id": user.user_id,
        "role": user.role.value,
        "facility_id": user.facility_id
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserAccount = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return current_user

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    """
    Returns available demo accounts to streamline evaluation and multi-role testing.
    """
    users = db.query(UserAccount).filter(UserAccount.is_active == True).all()
    demo_list = []
    for u in users:
        demo_list.append({
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "facility_id": u.facility_id,
            "facility_name": u.facility.name if u.facility else "Central Administration",
            "password": "password123"
        })
    return demo_list
