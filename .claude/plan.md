# Plan: Integración Pasarela de Pago Redsys para Licencias Federativas

## Resumen Ejecutivo

Implementar una pasarela de pago con Redsys para gestionar y cobrar licencias federativas de miembros de clubes de artes marciales, incluyendo:

- **Tipos de licencias**: Grado técnico (Dan/Kyu), Categoría instructor (Fukushidoin/Shidoin), Categoría edad (Infantil/Adulto)
- **Seguros opcionales**: Accidentes y Responsabilidad Civil (contratación separada)
- **Funcionalidades**: Cálculo automático de precios, renovación anual, facturas PDF, histórico de pagos, notificaciones de vencimiento, panel admin

---

## Arquitectura de la Solución

### Backend (Hexagonal Architecture)
- **RedsysService**: Encriptación 3DES + firma HMAC-SHA256
- **Nuevas entidades**: PriceConfiguration, Invoice
- **Modificación License**: 3 campos de categoría separados
- **Servicios**: Email (aiosmtplib), PDF (ReportLab)

### Frontend (Feature-based Architecture)
- **Nueva feature**: license-prices (admin CRUD)
- **Componentes**: LicenseRenewalForm, PaymentSuccess/CancelledPage
- **Dashboard**: ExpiringLicensesAlert
- **Flujo Redsys**: Auto-submit form → Redirect → Status polling

---

## Plan de Implementación (7 Fases)

### FASE 1: Backend Foundation
**Objetivo**: Preparar la base del backend

1. Añadir dependencias:
   ```bash
   poetry add pycryptodome reportlab pillow aiosmtplib jinja2 python-dateutil
   ```

2. Crear módulo de configuración (`/backend/src/config/settings.py`):
   - RedsysSettings (merchant_code, terminal, secret_key, environment)
   - EmailSettings (SMTP configuration)
   - InvoiceSettings (company info)

3. Actualizar entidad License:
   - Reemplazar `license_type` por 3 campos: `grado_tecnico`, `categoria_instructor`, `categoria_edad`
   - Añadir `last_payment_id` para tracking

4. Crear nuevas entidades:
   - `PriceConfiguration`: Precios por combinación de categorías
   - `Invoice`: Facturas con line items y totales

5. Añadir excepciones:
   - `RedsysSignatureError`, `RedsysEncryptionError`
   - `PriceNotFoundError`

---

### FASE 2: Application Layer
**Objetivo**: Implementar lógica de negocio

1. Repository Ports:
   - `PriceConfigurationRepositoryPort`
   - `InvoiceRepositoryPort`
   - `EmailServicePort`
   - `PDFServicePort`

2. Use Cases nuevos:
   - `CalculateLicensePriceUseCase`: Calcular precio según tipo de licencia
   - `RenewLicenseWithPaymentUseCase`: Renovar licencia tras pago completado
   - `GenerateInvoiceUseCase`: Crear factura desde pago
   - `GenerateInvoicePDFUseCase`: Generar PDF con ReportLab
   - `SendLicenseRenewalNotificationsUseCase`: Enviar emails de recordatorio

---

### FASE 3: Infrastructure Services
**Objetivo**: Implementar servicios externos

1. **RedsysService** (CRÍTICO):
   - Encriptación 3DES CBC con IV de ceros
   - Generación de firma HMAC-SHA256
   - Verificación de firma de webhook
   - Formateo de Order ID (4-12 chars, primeros 4 numéricos)

2. **EmailService**:
   - Envío async vía aiosmtplib
   - Templates Jinja2 para recordatorios y facturas
   - Soporte para adjuntos PDF

3. **PDFService**:
   - Generación de facturas con ReportLab
   - Logo de empresa, line items, totales
   - Numeración secuencial (YYYY000001)

4. **MongoDB Repositories**:
   - `MongoDBPriceConfigurationRepository`
   - `MongoDBInvoiceRepository`

---

### FASE 4: Web Layer
**Objetivo**: Exponer APIs

1. Actualizar Payment Router:
   - `POST /api/v1/payments/redsys/initiate` - Iniciar pago
   - `POST /api/v1/payments/webhook` - Webhook Redsys (sin auth)
   - `GET /api/v1/payments/{id}/status` - Estado del pago
   - `GET /api/v1/payments/{id}/invoice` - Descargar PDF

2. Nuevo Price Configuration Router:
   - CRUD completo para precios de licencias

3. Nuevo Invoice Router:
   - Listado y descarga de facturas

4. Actualizar Dependencies:
   - Añadir getters para nuevos servicios y use cases

---

### FASE 5: Frontend Foundation
**Objetivo**: Preparar base del frontend

1. Actualizar schemas:
   - License: 3 campos de categoría
   - Payment: campos Redsys, invoice_pdf_url
   - Nuevo: LicensePrice schema

2. Nuevos service methods:
   - `initiateRedsysPayment()`
   - `getPaymentStatus()` (para polling)
   - `downloadInvoice()` (blob)
   - `getLicenseRenewalPreview()`

3. Nuevas queries:
   - `useLicenseRenewalPreviewQuery`
   - `usePaymentStatusQuery` (con refetchInterval)
   - `useExpiringLicensesQuery`

---

### FASE 6: Frontend Components
**Objetivo**: Implementar UI

1. **Feature: License Prices** (Admin):
   - LicensePriceContext
   - LicensePriceList (tabla con CRUD)
   - LicensePriceForm (crear/editar)

2. **Renewal Flow**:
   - LicenseRenewalForm (selección categorías + preview precio)
   - PaymentSuccessPage (polling status + descarga factura)
   - PaymentCancelledPage

3. **Dashboard Integration**:
   - ExpiringLicensesAlert (badge contador + lista top 5)
   - PaymentHistoryTable (con botón descarga factura)

4. **Rutas nuevas**:
   - `/licenses/:id/renew`
   - `/payments/success`
   - `/payments/cancelled`
   - `/admin/license-prices`

---

### FASE 7: Testing & Documentation
**Objetivo**: Asegurar calidad

1. Backend Tests:
   - RedsysService: encryption/signature
   - Use cases: business logic
   - Integration tests: flujo completo

2. Manual Testing con Redsys Test:
   - URL: `https://sis-t.redsys.es:25443/sis/realizarPago`
   - Tarjeta: `4548812049400004`, Exp: 12/30, CVV: 123

3. Frontend Tests:
   - Status polling behavior
   - Form validation
   - Error handling

---

## Detalles Técnicos Críticos

### Redsys Order ID
- **CRÍTICO**: Primeros 4 caracteres DEBEN ser numéricos
- Longitud: 4-12 caracteres alfanuméricos
- Solución: Contador secuencial con prefijo año (2026001234)

### Importes
- Redsys espera céntimos (entero)
- 50.00 EUR → 5000

### Webhook Security
- Endpoint SIN autenticación (Redsys no puede autenticarse)
- Seguridad: Verificación firma HMAC-SHA256
- Usar `hmac.compare_digest()` para comparación constant-time

### Flujo Frontend Redsys
1. Frontend llama `/payments/redsys/initiate`
2. Backend retorna params encriptados
3. Frontend crea form oculto y auto-submit a Redsys
4. Usuario completa pago en página Redsys
5. Redsys redirige a `/payments/success?payment_id=X`
6. Frontend hace polling cada 3s hasta estado final

---

## Variables de Entorno Requeridas

```env
# Redsys
REDSYS_MERCHANT_CODE=999008881
REDSYS_TERMINAL=1
REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7
REDSYS_ENVIRONMENT=test  # 'test' o 'production'
REDSYS_CURRENCY=978

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourclub.com

# Invoice
INVOICE_COMPANY_NAME=Your Martial Arts Federation
INVOICE_COMPANY_ADDRESS=Street, City, Postal Code
INVOICE_COMPANY_TAX_ID=B12345678

# URLs
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:8000
```

---

## Archivos a Crear/Modificar

### Backend (30+ archivos)
- **Nuevos**: settings.py, price_configuration.py, invoice.py, redsys_service.py, email_service.py, pdf_service.py, repositories, routers, use cases
- **Modificar**: license.py, payment use cases, dependencies.py

### Frontend (25+ archivos)
- **Nuevos**: license-prices feature (8), renewal components (3), payment pages (2), dashboard (2)
- **Modificar**: schemas, services, queries, mutations, router

---

## Preguntas Resueltas

| Pregunta | Respuesta |
|----------|-----------|
| Credenciales Redsys | Tiene producción y pruebas |
| Estructura precios | Precio fijo por tipo |
| Categorías licencia | Campos separados (3) |
| Seguros | Opcionales, contratación separada |
| Precios | Configurables desde admin |
| Notificaciones | Email + dashboard |
| Flujo pago | Solo admin del club |
| Facturas | PDF descargable |

---

## Documentación Detallada

- **Backend**: `.claude/doc/redsys_payment_gateway/backend.md` (2300+ líneas)
- **Frontend**: `.claude/doc/redsys_payment_gateway/frontend.md` (1580+ líneas)
- **Contexto**: `.claude/sessions/context_session_redsys_payment_gateway.md`

---

## Siguiente Paso

Una vez aprobado este plan, comenzaré con la **Fase 1: Backend Foundation**, instalando dependencias y creando el módulo de configuración.
