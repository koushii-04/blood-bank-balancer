from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.models.user import UserAccount, UserRole
from backend.app.models.facility import Facility, FacilityType
from backend.app.schemas.user import UserCreate, UserUpdate, UserLogin, UserResponse, Token
from backend.app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    # ---------------------------------------------------------
    # 1. Check whether email already exists
    # ---------------------------------------------------------
    existing_user = (
        db.query(UserAccount)
        .filter(UserAccount.email == user_in.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    facility = None

    # ---------------------------------------------------------
    # 2. Handle facility for non-admin users
    # ---------------------------------------------------------
    if user_in.role != UserRole.ADMIN:
        if user_in.facility_id:
            facility = db.query(Facility).filter(Facility.facility_id == user_in.facility_id).first()
            if not facility:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Facility ID #{user_in.facility_id} does not exist"
                )
        elif user_in.facility_name and user_in.facility_name.strip():
            if user_in.facility_type is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Facility type is required"
                )

            if user_in.latitude is None or user_in.longitude is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Facility latitude and longitude are required"
                )

            if not -90 <= user_in.latitude <= 90:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Latitude must be between -90 and 90"
                )

            if not -180 <= user_in.longitude <= 180:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Longitude must be between -180 and 180"
                )

            facility_name = user_in.facility_name.strip()

            # -----------------------------------------------------
            # 3. Check whether facility already exists
            # -----------------------------------------------------
            facility = (
                db.query(Facility)
                .filter(Facility.name == facility_name)
                .first()
            )

            # -----------------------------------------------------
            # 4. Create new facility if it does not exist
            # -----------------------------------------------------
            if not facility:
                facility = Facility(
                    name=facility_name,
                    facility_type=user_in.facility_type,
                    latitude=user_in.latitude,
                    longitude=user_in.longitude,
                    is_active=True
                )

                db.add(facility)
                db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Facility ID or Facility name is required for healthcare staff"
            )

    # ---------------------------------------------------------
    # 5. Hash password
    # ---------------------------------------------------------
    hashed_pw = get_password_hash(user_in.password)

    # ---------------------------------------------------------
    # 6. Create user
    # ---------------------------------------------------------
    new_user = UserAccount(
        full_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        password_hash=hashed_pw,
        role=user_in.role,
        facility_id=facility.facility_id if facility else None,
        is_active=True,
        last_login_at=datetime.now(timezone.utc)
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. No changes were made."
        )

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

@router.patch("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    """Updates the profile details (name, email, phone number, password) of the authenticated user."""
    if profile_in.email and profile_in.email != current_user.email:
        existing = db.query(UserAccount).filter(
            UserAccount.email == profile_in.email,
            UserAccount.user_id != current_user.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already in use by another account"
            )
        current_user.email = profile_in.email

    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()

    if profile_in.phone_number is not None:
        current_user.phone_number = profile_in.phone_number.strip()

    # Password change
    if profile_in.new_password:
        if not profile_in.current_password or not verify_password(profile_in.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        if len(profile_in.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters"
            )
        current_user.password_hash = get_password_hash(profile_in.new_password)

    db.commit()
    db.refresh(current_user)
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
