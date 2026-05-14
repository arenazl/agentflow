from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    role: str = "vendedor"
    meta_conversaciones_diaria: int = 20


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    meta_conversaciones_diaria: Optional[int] = None
    is_active: Optional[bool] = None
    is_available: Optional[bool] = None


class AvailabilityUpdate(BaseModel):
    is_available: bool


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    foto_url: Optional[str] = None
    role: str
    meta_conversaciones_diaria: int
    is_active: bool
    is_available: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("role")
    def serialize_role(self, role):
        return role.value if hasattr(role, "value") else role
