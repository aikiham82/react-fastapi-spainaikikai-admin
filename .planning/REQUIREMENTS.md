# Requirements: Spain Aikikai Admin — Seminar Images + Oficialidad

**Defined:** 2026-02-27
**Core Value:** Los clubes pueden gestionar sus socios y la federación puede supervisar y monetizar el ecosistema aikido español desde un único panel.

## v1 Requirements

### Seminar Image Upload

- [ ] **IMG-01**: Club admin puede subir una imagen de portada (JPEG/PNG/WebP, máx 5MB) desde el formulario de edición del seminario
- [ ] **IMG-02**: El servidor valida el tipo de archivo por magic bytes (no solo MIME header) y rechaza archivos no-imagen
- [ ] **IMG-03**: El servidor redimensiona automáticamente la imagen a 800×450px (ratio 16:9) al guardarla
- [ ] **IMG-04**: La aplicación rechaza archivos mayores de 5MB con mensaje de error claro para el usuario
- [ ] **IMG-05**: Club admin puede eliminar la imagen de portada existente de un seminario
- [ ] **IMG-06**: Los seminarios con imagen de portada muestran la imagen en la tarjeta del listado
- [ ] **IMG-07**: Los seminarios con imagen de portada muestran la imagen en la página de detalle del seminario

### Oficialidad Payment Flow

- [ ] **OFIC-01**: Super admin puede configurar el precio de la oficialidad desde la sección de Configuración de Precios
- [ ] **OFIC-02**: Club admin ve el botón "Solicitar Oficialidad" en el detalle de un seminario no oficial que él gestiona
- [ ] **OFIC-03**: Club admin puede iniciar el pago de oficialidad vía Redsys desde el detalle del seminario
- [ ] **OFIC-04**: Tras el pago exitoso de Redsys, el seminario queda automáticamente marcado como oficial (sin intervención manual de Spain Aikikai)
- [ ] **OFIC-05**: Los seminarios oficiales muestran el sello/badge de Spain Aikikai en la tarjeta del listado
- [ ] **OFIC-06**: Los seminarios oficiales muestran el sello/badge de Spain Aikikai en la página de detalle
- [ ] **OFIC-07**: Si el seminario ya es oficial, el botón "Solicitar Oficialidad" no es visible ni accesible para el club
- [ ] **OFIC-08**: El sistema previene doble-pago: si el seminario ya es oficial, el endpoint de iniciación de pago devuelve 409
- [ ] **OFIC-09**: El webhook de Redsys es idempotente — un webhook duplicado para el mismo pago no cambia el estado dos veces

## v2 Requirements

### Notificaciones

- **NOTF-01**: El club recibe email de confirmación tras el pago exitoso de oficialidad
- **NOTF-02**: Spain Aikikai recibe notificación cuando un seminario pasa a ser oficial

### Facturación

- **FACT-01**: El pago de oficialidad genera una factura PDF descargable (igual que pagos de licencias)

### Multimedia

- **MEDIA-01**: Galería de fotos múltiples en el seminario (actualmente solo portada)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Aprobación manual de oficialidad | Descartado — flujo automático es la decisión tomada |
| Revocación de oficialidad | No contemplado en v1; requiere decisión de negocio |
| Galería de fotos | Solo imagen de portada en v1; galería es v2 |
| OAuth/SSO login | Fuera del scope de este milestone |
| Almacenamiento en objeto storage (S3/GCS) | Local filesystem suficiente para v1; migración es v2 si hace falta |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | Phase 1 | Pending |
| IMG-02 | Phase 1 | Pending |
| IMG-03 | Phase 1 | Pending |
| IMG-04 | Phase 1 | Pending |
| IMG-05 | Phase 1 | Pending |
| IMG-06 | Phase 1 | Pending |
| IMG-07 | Phase 1 | Pending |
| OFIC-01 | Phase 2 | Pending |
| OFIC-02 | Phase 2 | Pending |
| OFIC-03 | Phase 2 | Pending |
| OFIC-04 | Phase 2 | Pending |
| OFIC-05 | Phase 2 | Pending |
| OFIC-06 | Phase 2 | Pending |
| OFIC-07 | Phase 2 | Pending |
| OFIC-08 | Phase 2 | Pending |
| OFIC-09 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
