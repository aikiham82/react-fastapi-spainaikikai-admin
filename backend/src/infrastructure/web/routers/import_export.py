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
    ImportMembersResponse,
    ImportLicensesRequest,
    ImportInsurancesRequest
)
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_create_member_use_case,
    get_all_licenses_use_case,
    get_all_insurances_use_case,
    get_create_license_use_case,
    get_create_insurance_use_case,
    get_member_repository
)
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.authorization import AuthContext, get_club_filter_ctx
from src.domain.entities.license import LicenseStatus, TechnicalGrade, InstructorCategory, AgeCategory
from src.domain.entities.insurance import InsuranceType, InsuranceStatus

router = APIRouter(prefix="/import-export", tags=["import-export"])


def _parse_date(value) -> Optional[datetime]:
    """Parse a date value from Excel data, supporting multiple formats."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None


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
    # Enforce club isolation: club users can only export their own club's members
    effective_club_id = get_club_filter_ctx(ctx)
    if effective_club_id is not None:
        # Club user - force their club_id (ignore query param)
        members = await get_all_use_case.execute(limit, effective_club_id)
    elif club_id:
        # Super admin with explicit club filter
        members = await get_all_use_case.execute(limit, club_id)
    else:
        # Super admin - export all
        members = await get_all_use_case.execute(limit, None)

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


@router.get("/licenses/export")
async def export_licenses(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    club_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    technical_grade: Optional[str] = Query(None),
    age_category: Optional[str] = Query(None),
    get_all_use_case=Depends(get_all_licenses_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Export licenses to Excel file. Super admin only."""
    if not ctx.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los super administradores pueden exportar licencias"
        )

    licenses = await get_all_use_case.execute(limit=limit, club_id=club_id)

    # Post-filter by status, technical_grade, age_category
    if status:
        try:
            status_enum = LicenseStatus(status)
            licenses = [lic for lic in licenses if lic.status == status_enum]
        except ValueError:
            pass

    if technical_grade:
        try:
            grade_enum = TechnicalGrade(technical_grade)
            licenses = [lic for lic in licenses if lic.technical_grade == grade_enum]
        except ValueError:
            pass

    if age_category:
        try:
            age_enum = AgeCategory(age_category)
            licenses = [lic for lic in licenses if lic.age_category == age_enum]
        except ValueError:
            pass

    # Batch member lookup
    member_ids = list(set([lic.member_id for lic in licenses if lic.member_id]))
    member_map = {}
    for mid in member_ids:
        member = await member_repo.find_by_id(mid)
        if member:
            member_map[mid] = member

    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Licencias"

    headers = [
        "Nº Licencia", "Nombre", "Apellidos", "DNI", "Club",
        "Grado Técnico", "Cat. Instructor", "Cat. Edad",
        "Estado", "Fecha Emisión", "Fecha Expiración", "Renovada"
    ]

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4A5568", end_color="4A5568", fill_type="solid")

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for row_idx, lic in enumerate(licenses, 2):
        member = member_map.get(lic.member_id)
        ws.cell(row=row_idx, column=1, value=lic.license_number)
        ws.cell(row=row_idx, column=2, value=member.first_name if member else '')
        ws.cell(row=row_idx, column=3, value=member.last_name if member else '')
        ws.cell(row=row_idx, column=4, value=member.dni if member else '')
        ws.cell(row=row_idx, column=5, value=member.club_id if member else '')
        ws.cell(row=row_idx, column=6, value=lic.technical_grade.value if lic.technical_grade else '')
        ws.cell(row=row_idx, column=7, value=lic.instructor_category.value if lic.instructor_category else '')
        ws.cell(row=row_idx, column=8, value=lic.age_category.value if lic.age_category else '')
        ws.cell(row=row_idx, column=9, value=lic.status.value if lic.status else '')
        ws.cell(row=row_idx, column=10, value=lic.issue_date.strftime('%d/%m/%Y') if lic.issue_date else '')
        ws.cell(row=row_idx, column=11, value=lic.expiration_date.strftime('%d/%m/%Y') if lic.expiration_date else '')
        ws.cell(row=row_idx, column=12, value='Sí' if lic.is_renewed else 'No')

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

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"licencias_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/insurances/export")
async def export_insurances(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    club_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    insurance_type: Optional[str] = Query(None),
    get_all_use_case=Depends(get_all_insurances_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Export insurances to Excel file. Super admin only."""
    if not ctx.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los super administradores pueden exportar seguros"
        )

    insurances = await get_all_use_case.execute(limit=limit, club_id=club_id)

    # Post-filter by status, insurance_type
    if status:
        try:
            status_enum = InsuranceStatus(status)
            insurances = [ins for ins in insurances if ins.status == status_enum]
        except ValueError:
            pass

    if insurance_type:
        try:
            type_enum = InsuranceType(insurance_type)
            insurances = [ins for ins in insurances if ins.insurance_type == type_enum]
        except ValueError:
            pass

    # Batch member lookup
    member_ids = list(set([ins.member_id for ins in insurances if ins.member_id]))
    member_map = {}
    for mid in member_ids:
        member = await member_repo.find_by_id(mid)
        if member:
            member_map[mid] = member

    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Seguros"

    headers = [
        "Nº Póliza", "Nombre", "Apellidos", "DNI", "Club",
        "Tipo Seguro", "Compañía", "Cobertura",
        "Estado", "Fecha Inicio", "Fecha Fin"
    ]

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4A5568", end_color="4A5568", fill_type="solid")

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for row_idx, ins in enumerate(insurances, 2):
        member = member_map.get(ins.member_id)
        ws.cell(row=row_idx, column=1, value=ins.policy_number)
        ws.cell(row=row_idx, column=2, value=member.first_name if member else '')
        ws.cell(row=row_idx, column=3, value=member.last_name if member else '')
        ws.cell(row=row_idx, column=4, value=member.dni if member else '')
        ws.cell(row=row_idx, column=5, value=member.club_id if member else '')
        ws.cell(row=row_idx, column=6, value=ins.insurance_type.value if ins.insurance_type else '')
        ws.cell(row=row_idx, column=7, value=ins.insurance_company or '')
        ws.cell(row=row_idx, column=8, value=str(ins.coverage_amount) if ins.coverage_amount else '')
        ws.cell(row=row_idx, column=9, value=ins.status.value if ins.status else '')
        ws.cell(row=row_idx, column=10, value=ins.start_date.strftime('%d/%m/%Y') if ins.start_date else '')
        ws.cell(row=row_idx, column=11, value=ins.end_date.strftime('%d/%m/%Y') if ins.end_date else '')

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

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"seguros_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/licenses/import", response_model=ImportMembersResponse)
async def import_licenses(
    request: ImportLicensesRequest,
    create_license_use_case=Depends(get_create_license_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Import licenses from Excel data. Super admin only."""
    if not ctx.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los super administradores pueden importar licencias"
        )

    imported = 0
    failed = 0
    errors = []

    for idx, row in enumerate(request.licenses):
        try:
            license_number = row.get('license_number') or row.get('Nº Licencia') or row.get('nº licencia') or ''
            dni = row.get('dni') or row.get('DNI') or row.get('Dni') or ''
            grade = row.get('grade') or row.get('Grado') or row.get('grado') or ''
            technical_grade = row.get('technical_grade') or row.get('Grado Técnico') or row.get('grado_tecnico') or 'kyu'
            instructor_category = row.get('instructor_category') or row.get('Cat. Instructor') or row.get('cat_instructor') or 'none'
            age_category = row.get('age_category') or row.get('Cat. Edad') or row.get('cat_edad') or 'adulto'
            issue_date_str = row.get('issue_date') or row.get('Fecha Emisión') or row.get('fecha_emision') or None
            expiration_date_str = row.get('expiration_date') or row.get('Fecha Expiración') or row.get('fecha_expiracion') or None

            if not license_number:
                errors.append(f"Fila {idx + 1}: Nº de licencia es obligatorio")
                failed += 1
                continue

            if not grade:
                errors.append(f"Fila {idx + 1}: Grado es obligatorio")
                failed += 1
                continue

            if not dni:
                errors.append(f"Fila {idx + 1}: DNI es obligatorio para buscar el miembro")
                failed += 1
                continue

            # Lookup member by DNI
            member = await member_repo.find_by_dni(dni)
            if not member:
                errors.append(f"Fila {idx + 1}: No se encontró miembro con DNI {dni}")
                failed += 1
                continue

            issue_date = _parse_date(issue_date_str)
            expiration_date = _parse_date(expiration_date_str)

            # Validate enums
            try:
                TechnicalGrade(technical_grade.lower())
            except ValueError:
                errors.append(f"Fila {idx + 1}: Grado técnico inválido '{technical_grade}'. Use: dan, kyu")
                failed += 1
                continue

            try:
                InstructorCategory(instructor_category.lower())
            except ValueError:
                errors.append(f"Fila {idx + 1}: Categoría instructor inválida '{instructor_category}'. Use: none, fukushidoin, shidoin")
                failed += 1
                continue

            try:
                AgeCategory(age_category.lower())
            except ValueError:
                errors.append(f"Fila {idx + 1}: Categoría edad inválida '{age_category}'. Use: infantil, adulto")
                failed += 1
                continue

            await create_license_use_case.execute(
                license_number=license_number,
                member_id=member.id,
                club_id=member.club_id or '',
                grade=grade,
                license_type=technical_grade.lower(),
                issue_date=issue_date,
                expiration_date=expiration_date
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


@router.post("/insurances/import", response_model=ImportMembersResponse)
async def import_insurances(
    request: ImportInsurancesRequest,
    create_insurance_use_case=Depends(get_create_insurance_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Import insurances from Excel data. Super admin only."""
    if not ctx.is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo los super administradores pueden importar seguros"
        )

    imported = 0
    failed = 0
    errors = []

    for idx, row in enumerate(request.insurances):
        try:
            policy_number = row.get('policy_number') or row.get('Nº Póliza') or row.get('nº poliza') or ''
            dni = row.get('dni') or row.get('DNI') or row.get('Dni') or ''
            ins_type = row.get('insurance_type') or row.get('Tipo Seguro') or row.get('tipo_seguro') or 'accident'
            company = row.get('insurance_company') or row.get('Compañía') or row.get('compania') or ''
            coverage_str = row.get('coverage_amount') or row.get('Cobertura') or row.get('cobertura') or None
            start_date_str = row.get('start_date') or row.get('Fecha Inicio') or row.get('fecha_inicio') or None
            end_date_str = row.get('end_date') or row.get('Fecha Fin') or row.get('fecha_fin') or None

            if not policy_number:
                errors.append(f"Fila {idx + 1}: Nº de póliza es obligatorio")
                failed += 1
                continue

            if not company:
                errors.append(f"Fila {idx + 1}: Compañía es obligatoria")
                failed += 1
                continue

            if not dni:
                errors.append(f"Fila {idx + 1}: DNI es obligatorio para buscar el miembro")
                failed += 1
                continue

            # Lookup member by DNI
            member = await member_repo.find_by_dni(dni)
            if not member:
                errors.append(f"Fila {idx + 1}: No se encontró miembro con DNI {dni}")
                failed += 1
                continue

            start_date = _parse_date(start_date_str)
            end_date = _parse_date(end_date_str)

            if not start_date or not end_date:
                errors.append(f"Fila {idx + 1}: Fechas de inicio y fin son obligatorias")
                failed += 1
                continue

            # Validate insurance type
            ins_type_normalized = ins_type.lower().replace(' ', '_')
            if ins_type_normalized in ('accidente', 'accident'):
                ins_type_normalized = 'accident'
            elif ins_type_normalized in ('rc', 'responsabilidad_civil', 'civil_liability'):
                ins_type_normalized = 'civil_liability'

            try:
                InsuranceType(ins_type_normalized)
            except ValueError:
                errors.append(f"Fila {idx + 1}: Tipo de seguro inválido '{ins_type}'. Use: accident, civil_liability")
                failed += 1
                continue

            coverage_amount = None
            if coverage_str:
                try:
                    coverage_amount = float(str(coverage_str).replace(',', '.'))
                except (ValueError, TypeError):
                    pass

            await create_insurance_use_case.execute(
                member_id=member.id,
                policy_number=policy_number,
                insurance_company=company,
                start_date=start_date,
                end_date=end_date,
                insurance_type=ins_type_normalized,
                coverage_amount=coverage_amount
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
