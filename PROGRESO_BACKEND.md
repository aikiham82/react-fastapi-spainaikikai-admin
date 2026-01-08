# Progreso de Implementación del Backend - Sistema de Gestión para Asociación de Aikido

## Completado ✅

### 1. Entidades del Dominio (Domain Layer)
- ✅ Association (`backend/src/domain/entities/association.py`)
- ✅ Club (`backend/src/domain/entities/club.py`)
- ✅ Member (`backend/src/domain/entities/member.py`)
- ✅ License (`backend/src/domain/entities/license.py`)
- ✅ Seminar (`backend/src/domain/entities/seminar.py`)
- ✅ Payment (`backend/src/domain/entities/payment.py`)
- ✅ Insurance (`backend/src/domain/entities/insurance.py`)

### 2. Excepciones del Dominio
- ✅ Association exceptions
- ✅ Club exceptions
- ✅ Member exceptions
- ✅ License exceptions
- ✅ Seminar exceptions
- ✅ Payment exceptions
- ✅ Insurance exceptions

### 3. Repository Ports (Application Layer)
- ✅ AssociationRepositoryPort
- ✅ ClubRepositoryPort
- ✅ MemberRepositoryPort
- ✅ LicenseRepositoryPort
- ✅ SeminarRepositoryPort
- ✅ PaymentRepositoryPort
- ✅ InsuranceRepositoryPort

### 4. MongoDB Repository Implementations (Infrastructure Layer)
- ✅ MongoDBAssociationRepository
- ✅ MongoDBClubRepository
- ✅ MongoDBMemberRepository
- ✅ MongoDBLicenseRepository
- ✅ MongoDBSeminarRepository
- ✅ MongoDBPaymentRepository
- ✅ MongoDBInsuranceRepository

## Próximos Pasos 📋

### 5. DTOs (Data Transfer Objects) - INFRASTRUCTURE
Crear DTOs para todas las entidades para validar requests/responses:
- Association DTOs (Create, Update, Response)
- Club DTOs (Create, Update, Response)
- Member DTOs (Create, Update, Response)
- License DTOs (Create, Update, Response)
- Seminar DTOs (Create, Update, Response)
- Payment DTOs (Create, Response)
- Insurance DTOs (Create, Update, Response)

### 6. Routers/Endpoints - INFRASTRUCTURE
Crear routers con todos los endpoints REST:
- Association Router: CRUD operations
- Club Router: CRUD operations
- Member Router: CRUD operations + search
- License Router: CRUD operations + renewals
- Seminar Router: CRUD operations + participants management
- Payment Router: CRUD operations + Redsys integration
- Insurance Router: CRUD operations + expiration tracking

### 7. Use Cases - APPLICATION
Crear use cases para todas las entidades:
- Association Use Cases
- Club Use Cases
- Member Use Cases
- License Use Cases
- Seminar Use Cases
- Payment Use Cases
- Insurance Use Cases

### 8. Mappers - INFRASTRUCTURE
Crear mappers para convertir entre DTOs y entidades del dominio:
- Association Mapper
- Club Mapper
- Member Mapper
- License Mapper
- Seminar Mapper
- Payment Mapper
- Insurance Mapper

### 9. Dependency Injection - INFRASTRUCTURE
Actualizar `backend/src/infrastructure/web/dependencies.py` para incluir:
- Todos los repositorios
- Todos los use cases

### 10. App Router Integration
Actualizar `backend/src/app.py` para incluir todos los routers

## Estructura de Endpoints Propuesta

### Association Endpoints (/api/v1/associations)
- GET / - List all associations
- GET /{id} - Get association by ID
- POST / - Create association (Association Admin only)
- PUT /{id} - Update association (Association Admin only)
- DELETE /{id} - Delete association (Association Admin only)

### Club Endpoints (/api/v1/clubs)
- GET / - List all clubs (filtered by association if not association admin)
- GET /{id} - Get club by ID
- GET /association/{association_id} - Get clubs by association
- POST / - Create club (Association/Club Admin)
- PUT /{id} - Update club (Club Admin)
- DELETE /{id} - Delete club (Club Admin)

### Member Endpoints (/api/v1/members)
- GET / - List all members (filtered by club)
- GET /{id} - Get member by ID
- GET /club/{club_id} - Get members by club
- GET /search?name={name} - Search members by name
- POST / - Create member
- PUT /{id} - Update member
- DELETE /{id} - Delete member

### License Endpoints (/api/v1/licenses)
- GET / - List all licenses (filtered by club/member)
- GET /{id} - Get license by ID
- GET /member/{member_id} - Get licenses by member
- GET /expiring - Get licenses expiring soon
- POST / - Create license
- PUT /{id}/renew - Renew license
- PUT /{id} - Update license
- DELETE /{id} - Delete license

### Seminar Endpoints (/api/v1/seminars)
- GET / - List all seminars (filtered by club)
- GET /{id} - Get seminar by ID
- GET /upcoming - Get upcoming seminars
- POST / - Create seminar
- PUT /{id} - Update seminar
- PUT /{id}/cancel - Cancel seminar
- PUT /{id}/participants - Add/remove participants
- DELETE /{id} - Delete seminar

### Payment Endpoints (/api/v1/payments)
- GET / - List all payments (filtered by club/member)
- GET /{id} - Get payment by ID
- POST /initiate - Initiate payment (Redsys)
- POST /webhook - Redsys webhook callback
- PUT /{id}/refund - Refund payment
- GET /{id}/status - Check payment status

### Insurance Endpoints (/api/v1/insurances)
- GET / - List all insurances (filtered by club/member)
- GET /{id} - Get insurance by ID
- GET /member/{member_id} - Get insurances by member
- GET /expiring - Get insurances expiring soon
- POST / - Create insurance
- PUT /{id} - Update insurance
- DELETE /{id} - Delete insurance

### Import/Export Endpoints (/api/v1/data)
- POST /import/members - Import members from XLSX
- GET /export/members - Export members to XLSX
- POST /import/clubs - Import clubs from XLSX
- GET /export/clubs - Export clubs to XLSX

