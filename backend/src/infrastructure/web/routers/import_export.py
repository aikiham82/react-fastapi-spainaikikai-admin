"""Import/Export routes."""

from typing import Optional
from io import BytesIO
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

from src.infrastructure.web.dto.import_export_dto import (
    ImportMembersRequest,
    ImportMembersResponse
)
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_create_member_use_case
)
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.authorization import AuthContext

router = APIRouter(prefix="/import-export", tags=["import-export"])


@router.post("/members/import", response_model=ImportMembersResponse)
async def import_members(
    request: ImportMembersRequest,
    create_member_use_case=Depends(get_create_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Import members from Excel data."""
    imported = 0
    failed = 0
    errors = []

    for idx, row in enumerate(request.members):
        try:
            # Map Excel column names to entity fields
            first_name = row.get('first_name') or row.get('Nombre') or row.get('nombre') or ''
            email = row.get('email') or row.get('Email') or row.get('EMAIL') or ''

            if not first_name or not email:
                errors.append(f"Fila {idx + 1}: Nombre y email son obligatorios")
                failed += 1
                continue

            last_name = row.get('last_name') or row.get('Apellidos') or row.get('apellidos') or ''
            dni = row.get('dni') or row.get('DNI') or row.get('Dni') or ''
            phone = row.get('phone') or row.get('Teléfono') or row.get('telefono') or ''
            address = row.get('address') or row.get('Dirección') or row.get('direccion') or ''
            city = row.get('city') or row.get('Ciudad') or row.get('ciudad') or ''
            province = row.get('province') or row.get('Provincia') or row.get('provincia') or ''
            postal_code = row.get('postal_code') or row.get('Código Postal') or row.get('codigo_postal') or ''
            country = row.get('country') or row.get('País') or row.get('pais') or 'España'
            club_id = row.get('club_id') or row.get('Club ID') or None
            birth_date_str = row.get('birth_date') or row.get('Fecha Nacimiento') or row.get('fecha_nacimiento') or None

            birth_date = None
            if birth_date_str:
                try:
                    if isinstance(birth_date_str, datetime):
                        birth_date = birth_date_str
                    elif isinstance(birth_date_str, str):
                        # Try different date formats
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                            try:
                                birth_date = datetime.strptime(birth_date_str, fmt)
                                break
                            except ValueError:
                                continue
                except Exception:
                    pass

            await create_member_use_case.execute(
                first_name=first_name,
                last_name=last_name,
                dni=dni,
                email=email,
                phone=phone,
                address=address,
                city=city,
                province=province,
                postal_code=postal_code,
                country=country,
                club_id=club_id,
                birth_date=birth_date
            )
            imported += 1

        except Exception as e:
            failed += 1
            errors.append(f"Fila {idx + 1}: {str(e)}")

    return ImportMembersResponse(
        success=failed == 0,
        imported=imported,
        failed=failed,
        errors=errors
    )


@router.get("/members/export")
async def export_members(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    club_id: Optional[str] = Query(None),
    get_all_use_case=Depends(get_all_members_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Export members to Excel file."""
    members = await get_all_use_case.execute(limit, club_id)

    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Miembros"

    # Define headers
    headers = [
        "ID", "Nombre", "Apellidos", "DNI", "Email", "Teléfono",
        "Fecha Nacimiento", "Dirección", "Ciudad", "Provincia",
        "Código Postal", "País", "Club ID", "Estado", "Fecha Creación"
    ]

    # Style for header
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4A5568", end_color="4A5568", fill_type="solid")

    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    # Write data
    for row_idx, member in enumerate(members, 2):
        ws.cell(row=row_idx, column=1, value=member.id)
        ws.cell(row=row_idx, column=2, value=member.first_name)
        ws.cell(row=row_idx, column=3, value=member.last_name or '')
        ws.cell(row=row_idx, column=4, value=member.dni or '')
        ws.cell(row=row_idx, column=5, value=member.email)
        ws.cell(row=row_idx, column=6, value=member.phone or '')
        ws.cell(row=row_idx, column=7, value=member.birth_date.strftime('%d/%m/%Y') if member.birth_date else '')
        ws.cell(row=row_idx, column=8, value=member.address or '')
        ws.cell(row=row_idx, column=9, value=member.city or '')
        ws.cell(row=row_idx, column=10, value=member.province or '')
        ws.cell(row=row_idx, column=11, value=member.postal_code or '')
        ws.cell(row=row_idx, column=12, value=member.country or '')
        ws.cell(row=row_idx, column=13, value=member.club_id or '')
        ws.cell(row=row_idx, column=14, value=member.status.value if member.status else '')
        ws.cell(row=row_idx, column=15, value=member.created_at.strftime('%d/%m/%Y %H:%M') if member.created_at else '')

    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column].width = adjusted_width

    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    # Generate filename with timestamp
    filename = f"miembros_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
