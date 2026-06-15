"""
SCOPE Studio — Auth Router.

Handles user registration, login, and profile retrieval.
Uses async SQLAlchemy sessions and Pydantic EmailStr validation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db.models import DBUser
from app.schemas.auth import AuthResponse, SignInRequest, SignUpRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignUpRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Register a new user account."""
    # Check for existing email
    result = await session.execute(
        select(DBUser).where(DBUser.email == request.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create the user
    user = DBUser(
        email=request.email,
        name=request.name,
        hashed_password=hash_password(request.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Issue JWT
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
    })

    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name),
    )


@router.post("/signin", response_model=AuthResponse)
async def signin(
    request: SignInRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Authenticate with email + password."""
    result = await session.execute(
        select(DBUser).where(DBUser.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
    })

    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
) -> UserResponse:
    """Get the currently authenticated user's profile from their JWT."""
    return UserResponse(
        id=current_user.get("sub", ""),
        email=current_user.get("email", ""),
        name=current_user.get("name", ""),
    )
