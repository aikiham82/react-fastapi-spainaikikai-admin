"""Import/Export DTOs for request/response validation."""

from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class MemberImportRow(BaseModel):
    """DTO for a single member import row."""
    first_name: str
    email: str
    last_name: Optional[str] = None
    dni: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "España"
    club_id: Optional[str] = None


class ImportMembersRequest(BaseModel):
    """DTO for importing members."""
    members: List[dict]
    mode: str = "upsert"  # "create" or "upsert"


class ImportMembersResponse(BaseModel):
    """DTO for import response."""
    success: bool
    imported: int
    updated: int = 0
    failed: int
    errors: List[str]


class ImportLicensesRequest(BaseModel):
    """DTO for importing licenses."""
    licenses: List[dict]
    mode: str = "upsert"  # "create" or "upsert"


class ImportInsurancesRequest(BaseModel):
    """DTO for importing insurances."""
    insurances: List[dict]
    mode: str = "upsert"  # "create" or "upsert"


class ImportPaymentsRequest(BaseModel):
    """DTO for importing member payments."""
    payments: List[dict]
    mode: str = "upsert"  # "create" or "upsert"


class MemberExportRow(BaseModel):
    """DTO for a single member export row."""
    id: str
    first_name: str
    last_name: Optional[str] = None
    dni: Optional[str] = None
    email: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    club_id: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None
