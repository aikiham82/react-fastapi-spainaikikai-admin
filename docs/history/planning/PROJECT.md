# Spain Aikikai Admin

## What This Is

Backoffice de gestión para la federación Spain Aikikai que permite administrar clubes, socios, licencias, pagos, seminarios y seguros. La plataforma tiene dos niveles de acceso: super admin (Spain Aikikai) y club admin (cada club gestiona sus propios socios). El sistema incluye integración con Redsys para procesamiento de pagos.

## Core Value

Los clubes pueden gestionar sus socios y la federación puede supervisar y monetizar el ecosistema aikido español desde un único panel.

## Requirements

### Validated

- ✓ Autenticación OAuth2 con JWT — existente
- ✓ Sistema de roles de dos niveles (super_admin / club_admin / member) — existente
- ✓ Gestión de clubes (CRUD) — existente
- ✓ Gestión de socios (CRUD, filtros, importación/exportación) — existente
- ✓ Gestión de licencias con renovación — existente
- ✓ Gestión de seminarios (CRUD) — existente
- ✓ Pagos con Redsys (flujo de pago, webhooks, facturas) — existente
- ✓ Seguros y pagos anuales — existente
- ✓ Generación de PDFs e informes Excel — existente
- ✓ Notificaciones por email con scheduler — existente
- ✓ Configuración de precios por super admin — existente

### Active

- [ ] Los seminarios pueden tener imagen de portada (subida de archivo por el club admin)
- [ ] Los clubes pueden solicitar la "oficialidad" de un seminario pagando vía Redsys
- [ ] El super admin configura el precio de la oficialidad desde el panel
- [ ] Tras el pago, el seminario queda automáticamente marcado como oficial (sin aprobación manual)
- [ ] Los seminarios oficiales muestran el sello/logo de Spain Aikikai en la tarjeta del listado y en la página de detalle

### Out of Scope

- Aprobación manual de la oficialidad por Spain Aikikai — se descartó para simplificar el flujo (automático tras pago)
- Galería de fotos múltiples en seminarios — solo imagen de portada en esta iteración
- Pérdida o revocación de la oficialidad — no contemplado en v1

## Context

Codebase brownfield con arquitectura hexagonal en el backend (FastAPI + Motor + MongoDB) y arquitectura por features en el frontend (React 19 + TypeScript + React Query + Radix UI). La integración con Redsys ya está implementada y funcionando para pagos de licencias/seguros. Los seminarios ya tienen entidad de dominio, use cases, repositorio MongoDB y componentes React.

**Integración Redsys existente:**
- `RedsysService` en `src/infrastructure/adapters/services/`
- Use cases: `InitiateRedsysPaymentUseCase`, `ProcessRedsysWebhookUseCase`
- Webhook en `/api/v1/payments/redsys/webhook`

**Seminarios existentes:**
- Feature frontend en `src/features/seminars/`
- Router backend en `src/infrastructure/web/routers/seminars.py`
- Entidad `Seminar` en `src/domain/entities/`

## Constraints

- **Tech stack**: Backend Python/FastAPI, Frontend React/TypeScript — no cambiar stack
- **Pagos**: Solo Redsys (ya configurado, no añadir otra pasarela)
- **Arquitectura**: Mantener hexagonal en backend y feature-based en frontend
- **Imágenes**: Subida de archivo al servidor (pillow ya disponible para procesamiento)
- **Base de datos**: MongoDB (Motor async)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Oficialidad automática tras pago | Elimina fricción de aprobación manual, Spain Aikikai ya confía en quien paga | — Pending |
| Solo imagen de portada (no galería) | Alcance mínimo viable, galería es v2 | — Pending |
| Precio de oficialidad configurable por super admin | Flexibilidad sin necesidad de deploy para cambiar precio | — Pending |
| Sello visible en listado y detalle | Mayor visibilidad del valor de la oficialidad | — Pending |

---
*Last updated: 2026-02-27 after initialization*
