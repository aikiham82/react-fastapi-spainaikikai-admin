# Import/Export: Licencias y Seguros

## Fecha: 2026-02-06

## Resumen

Extender la sección de Importar/Exportar para soportar licencias y seguros además de miembros, con control de acceso por rol.

## Decisiones de Diseño

### UI: Tabs por entidad
- 3 tabs: `Miembros | Licencias | Seguros`
- Cada tab mantiene layout de dos columnas: Importar (izq) | Exportar (der)
- Tabs de Licencias y Seguros solo visibles para super_admin
- Club_admin solo ve tab de Miembros

### Operaciones por rol
| Operación | super_admin | club_admin |
|-----------|-------------|------------|
| Import Miembros | Si | Si (su club) |
| Export Miembros | Si | Si (su club) |
| Import Licencias | Si | No |
| Export Licencias | Si | No |
| Import Seguros | Si | No |
| Export Seguros | Si | No |

### Filtros de exportación
- **Licencias**: estado (active/expired/pending), club, grado técnico (dan/kyu), categoría de edad (infantil/adulto)
- **Seguros**: estado (active/expired), club, tipo de seguro (accidente/RC)

### Columnas Excel exportadas
- **Licencias**: Nº Licencia, Nombre, Apellidos, DNI, Club, Grado Técnico, Cat. Instructor, Cat. Edad, Estado, Fecha Emisión, Fecha Expiración, Renovada
- **Seguros**: Nº Póliza, Nombre, Apellidos, DNI, Club, Tipo Seguro, Compañía, Cobertura, Estado, Fecha Inicio, Fecha Fin

### Columnas Excel importadas
- **Licencias**: Nº Licencia, DNI (lookup miembro), Grado Técnico, Cat. Instructor, Cat. Edad, Fecha Emisión, Fecha Expiración
- **Seguros**: Nº Póliza, DNI (lookup miembro), Tipo Seguro, Compañía, Cobertura, Fecha Inicio, Fecha Fin

## Backend

### Nuevos endpoints

#### Exportación
- `GET /api/v1/import-export/licenses/export` — Query params: club_id, status, technical_grade, age_category, limit, offset
- `GET /api/v1/import-export/insurances/export` — Query params: club_id, status, insurance_type, limit, offset

#### Importación
- `POST /api/v1/import-export/licenses/import` — Body: array de filas de licencia
- `POST /api/v1/import-export/insurances/import` — Body: array de filas de seguro

### Patrón de lookup de miembro (export)
1. Obtener entidades del repositorio
2. Recoger member_ids únicos
3. Consulta batch al repositorio de miembros
4. Mapear nombre/DNI en memoria
5. Generar Excel con datos resueltos

### Patrón de importación
1. Parsear filas del Excel
2. Mapear cabeceras español → campos internos
3. Lookup miembro por DNI
4. Validar enums y campos obligatorios
5. Crear entidad vía use case
6. Retornar resumen {success, imported, failed, errors[]}

### Autorización
- Endpoints de export de licencias/seguros: requieren `ctx.is_super_admin`
- Endpoints de import de licencias/seguros: requieren `ctx.is_super_admin`
- Endpoints de import/export de miembros: mantienen comportamiento actual (ambos roles)
- Club_admin filtra automáticamente por su club_id

## Frontend

### Servicios nuevos (import-export.service.ts)
- `exportLicenses(filters)` → GET licenses/export
- `exportInsurances(filters)` → GET insurances/export
- `importLicenses(data)` → POST licenses/import
- `importInsurances(data)` → POST insurances/import

### Schemas nuevos (import-export.schema.ts)
- `ExportLicensesFilters`: { club_id?, status?, technical_grade?, age_category? }
- `ExportInsurancesFilters`: { club_id?, status?, insurance_type? }
- `ImportLicenseRow`: { license_number, dni, technical_grade, instructor_category, age_category, issue_date, expiration_date }
- `ImportInsuranceRow`: { policy_number, dni, insurance_type, insurance_company, coverage_amount?, start_date, end_date }

### Mutations nuevas
- `useExportLicensesMutation()` — descarga licencias_export_*.xlsx
- `useExportInsurancesMutation()` — descarga seguros_export_*.xlsx
- `useImportLicensesMutation()` — invalida query 'licenses'
- `useImportInsurancesMutation()` — invalida query 'insurances'

### Componente ImportExportPage
- Estado `activeTab` controla tab visible
- Renderizado condicional de filtros, parser y mutations por tab
- Tabs Licencias/Seguros solo se renderizan si role === 'super_admin'
- Columna Importar visible solo para super_admin (en tabs licencias/seguros)
