"""
SCOPE Studio — Auth Schemas.

Pydantic models for signup, signin, and user profile responses.
"""

import uuid

from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    """Registration request payload."""

    name: str = Field(..., min_length=1, max_length=255, description="User display name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 chars)")


class SignInRequest(BaseModel):
    """Login request payload."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")


class UserResponse(BaseModel):
    """Public user profile."""

    id: uuid.UUID | str
    email: str
    name: str


class AuthResponse(BaseModel):
    """JWT token + user profile returned after signup/signin."""

    token: str
    user: UserResponse
