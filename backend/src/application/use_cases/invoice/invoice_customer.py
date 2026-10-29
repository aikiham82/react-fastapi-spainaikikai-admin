"""Who an invoice is addressed to: the member who paid, or else the club."""

from dataclasses import dataclass
from typing import Optional

from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort
from src.domain.entities.payment import Payment


@dataclass(frozen=True)
class InvoiceCustomer:
    name: str = ""
    email: str = ""
    address: str = ""
    phone: str = ""


def _address_line(address: str, postal_code: str, city: str, province: str) -> str:
    place = " ".join(part for part in (postal_code, city, f"({province})" if province else "") if part)
    return ", ".join(part for part in (address, place) if part)


async def build_invoice_customer(
    payment: Payment,
    member_repository: Optional[MemberRepositoryPort],
    club_repository: Optional[ClubRepositoryPort],
) -> InvoiceCustomer:
    if payment.member_id and member_repository:
        member = await member_repository.find_by_id(payment.member_id)
        if member:
            return InvoiceCustomer(
                name=member.get_full_name().strip(),
                email=member.email or "",
                address=_address_line(member.address, member.postal_code, member.city, member.province),
                phone=member.phone or "",
            )

    if payment.club_id and club_repository:
        club = await club_repository.find_by_id(payment.club_id)
        if club:
            return InvoiceCustomer(
                name=club.name,
                email=club.email or "",
                address=_address_line(club.address, club.postal_code, club.city, club.province),
                phone=club.phone or "",
            )

    return InvoiceCustomer(name=payment.payer_name or "")
