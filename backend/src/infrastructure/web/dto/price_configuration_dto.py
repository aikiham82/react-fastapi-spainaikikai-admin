"""Price Configuration DTOs for request/response validation."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PriceConfigurationBase(BaseModel):
    """Base Price Configuration DTO."""
    key: str
    price: float
    description: str = ""
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class PriceConfigurationCreate(PriceConfigurationBase):
    """DTO for creating a new price configuration."""
    pass


class PriceConfigurationUpdate(BaseModel):
    """DTO for updating a price configuration."""
    price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class PriceConfigurationResponse(PriceConfigurationBase):
    """DTO for price configuration response."""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LicensePriceQuery(BaseModel):
    """DTO for querying license price."""
    grado_tecnico: str
    categoria_instructor: str
    categoria_edad: str


class LicensePriceResponse(BaseModel):
    """DTO for license price response."""
    key: str
    price: float
    description: str
