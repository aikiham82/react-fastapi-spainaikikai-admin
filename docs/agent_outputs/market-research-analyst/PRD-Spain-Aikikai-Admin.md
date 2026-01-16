# Product Requirements Document (PRD)
# Spain Aikikai Admin - Sistema de Gestion Administrativa

---

| **Metadata del Documento** | |
|---------------------------|---|
| **Producto** | Spain Aikikai Admin |
| **Version** | 1.0 |
| **Fecha** | Enero 2026 |
| **Estado** | En Desarrollo |
| **Autor** | Market Research Analyst Agent |

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Vision del Producto](#2-vision-del-producto)
3. [Usuarios Objetivo](#3-usuarios-objetivo)
4. [Problemas a Resolver](#4-problemas-a-resolver)
5. [Funcionalidades Principales](#5-funcionalidades-principales)
6. [Requisitos Funcionales](#6-requisitos-funcionales)
7. [Requisitos No Funcionales](#7-requisitos-no-funcionales)
8. [Metricas de Exito](#8-metricas-de-exito)
9. [Consideraciones Tecnicas](#9-consideraciones-tecnicas)
10. [Roadmap Sugerido](#10-roadmap-sugerido)
11. [Riesgos y Mitigaciones](#11-riesgos-y-mitigaciones)
12. [Anexos](#12-anexos)

---

## 1. Resumen Ejecutivo

### 1.1 Descripcion General

**Spain Aikikai Admin** es una aplicacion backoffice integral diseñada para la gestion administrativa completa de la federacion de Aikido de España (Spain Aikikai) y sus clubs asociados. La plataforma centraliza y digitaliza todos los procesos administrativos relacionados con la gestion de clubs, miembros, licencias, pagos, seminarios y seguros.

### 1.2 Propuesta de Valor

La plataforma ofrece una solucion unificada que permite:

- **Centralizacion**: Toda la informacion administrativa en un unico punto de acceso
- **Automatizacion**: Alertas proactivas de expiracion de licencias y seguros
- **Eficiencia**: Reduccion del tiempo dedicado a tareas administrativas manuales
- **Transparencia**: Visibilidad completa del estado de la federacion en tiempo real
- **Cumplimiento**: Gestion adecuada de seguros obligatorios y licencias federativas

### 1.3 Beneficios Clave

| Beneficio | Impacto Estimado |
|-----------|------------------|
| Reduccion de tiempo administrativo | 60-70% |
| Eliminacion de errores manuales | 90% |
| Mejora en cobro de cuotas | 25-30% |
| Visibilidad de datos en tiempo real | 100% |
| Cumplimiento normativo de seguros | 100% |

### 1.4 Alcance del Producto

El sistema abarca la gestion completa de:
- 1 Asociacion/Federacion principal
- Multiples clubs de Aikido
- Miles de miembros practicantes
- Licencias federativas (KYU, DAN, Instructor)
- Pagos integrados con pasarela Redsys
- Seguros de accidente y responsabilidad civil
- Seminarios y eventos formativos

---

## 2. Vision del Producto

### 2.1 Mision

> Facilitar la gestion administrativa integral de Spain Aikikai, permitiendo que los responsables de la federacion y los clubs dediquen su tiempo a lo que realmente importa: la practica y difusion del Aikido.

### 2.2 Vision a Largo Plazo

> Convertirse en la plataforma de referencia para la gestion de federaciones y asociaciones de artes marciales en España, expandible a otras disciplinas y paises.

### 2.3 Principios Rectores

1. **Simplicidad**: Interfaces intuitivas que no requieren formacion tecnica
2. **Fiabilidad**: Sistema robusto con alta disponibilidad
3. **Seguridad**: Proteccion de datos personales conforme a RGPD
4. **Escalabilidad**: Capacidad de crecimiento sin degradacion del servicio
5. **Integracion**: Compatibilidad con sistemas de pago y comunicacion existentes

### 2.4 Diferenciadores Competitivos

| Aspecto | Spain Aikikai Admin | Soluciones Genericas |
|---------|---------------------|---------------------|
| Especializacion en Aikido | Si (grados KYU/DAN) | No |
| Integracion Redsys | Nativa | Requiere desarrollo |
| Gestion de seminarios | Integrada | Separada |
| Sistema de licencias | Especifico por tipo | Generico |
| Alertas de expiracion | Automaticas | Manual |

---

## 3. Usuarios Objetivo

### 3.1 Segmentos de Usuario

#### 3.1.1 Administrador de la Asociacion (Federacion)

**Persona: Carlos Martinez**

| Atributo | Descripcion |
|----------|-------------|
| **Rol** | Secretario General de Spain Aikikai |
| **Edad** | 45-60 años |
| **Perfil Tecnico** | Usuario intermedio de tecnologia |
| **Dedicacion** | 10-15 horas semanales a tareas administrativas |
| **Responsabilidades** | Supervision global, emision de licencias DAN, gestion economica |

**Necesidades Principales:**
- Vision global del estado de la federacion
- Control de todos los clubs y sus miembros
- Gestion de licencias de grado DAN
- Supervision de pagos y cobros
- Organizacion de seminarios nacionales
- Generacion de informes y estadisticas

**Pain Points Actuales:**
- Hojas de calculo dispersas
- Comunicacion por email desorganizada
- Dificultad para rastrear renovaciones pendientes
- Falta de visibilidad sobre seguros vencidos

**Objetivos:**
- Reducir tiempo en tareas administrativas
- Tener datos actualizados en tiempo real
- Mejorar la comunicacion con los clubs
- Asegurar cumplimiento normativo

---

#### 3.1.2 Administrador de Club

**Persona: Maria Garcia**

| Atributo | Descripcion |
|----------|-------------|
| **Rol** | Responsable del Club Aikido Madrid |
| **Edad** | 35-50 años |
| **Perfil Tecnico** | Usuario basico de tecnologia |
| **Dedicacion** | 5-8 horas semanales a tareas administrativas |
| **Responsabilidades** | Gestion de altas/bajas, cobro de cuotas, seguros |

**Necesidades Principales:**
- Registro y gestion de miembros del club
- Control de pagos de cuotas
- Gestion de seguros de practicantes
- Solicitud de licencias KYU
- Inscripcion en seminarios

**Pain Points Actuales:**
- Gestion manual de altas y bajas
- Dificultad para recordar vencimientos
- Proceso tedioso de solicitud de licencias
- Falta de historico de pagos

**Objetivos:**
- Simplificar la gestion diaria
- Automatizar recordatorios
- Tener control de pagos pendientes
- Reducir errores administrativos

---

#### 3.1.3 Usuario Estandar (Consulta)

**Persona: Pablo Rodriguez**

| Atributo | Descripcion |
|----------|-------------|
| **Rol** | Instructor de Aikido / Miembro del consejo |
| **Edad** | 30-55 años |
| **Perfil Tecnico** | Usuario basico |
| **Dedicacion** | 1-2 horas semanales |
| **Responsabilidades** | Consulta de informacion, lectura de noticias |

**Necesidades Principales:**
- Consulta de datos de miembros
- Acceso a noticias y comunicados
- Visualizacion de seminarios proximos
- Verificacion de estado de licencias

**Objetivos:**
- Acceso rapido a informacion relevante
- Mantenerse informado de novedades

---

### 3.2 Matriz de Permisos por Rol

| Funcionalidad | Admin Asociacion | Admin Club | Usuario Estandar |
|---------------|------------------|------------|------------------|
| **Dashboard Global** | Total | Solo su club | Solo lectura |
| **Gestion Clubs** | CRUD completo | Solo lectura propio | Solo lectura |
| **Gestion Miembros** | CRUD todos | CRUD su club | Solo lectura |
| **Licencias DAN** | CRUD completo | Solo lectura | Solo lectura |
| **Licencias KYU** | CRUD completo | Solicitar/Ver | Solo lectura |
| **Pagos** | CRUD todos | CRUD su club | Solo lectura |
| **Seminarios** | CRUD completo | Inscribir miembros | Solo lectura |
| **Seguros** | CRUD todos | CRUD su club | Solo lectura |
| **Noticias** | CRUD publicas | Ver todas | Ver todas |
| **Import/Export** | Todos los datos | Solo su club | No disponible |

---

## 4. Problemas a Resolver

### 4.1 Problemas Actuales Identificados

#### 4.1.1 Gestion Manual de Licencias

**Situacion Actual:**
- Las solicitudes de licencia se realizan por email o formularios fisicos
- El seguimiento de renovaciones es manual mediante hojas de calculo
- No hay alertas automaticas de expiracion
- Riesgo de practicantes sin licencia vigente

**Impacto:**
- Tiempo perdido: 8-10 horas/semana en la federacion
- Errores humanos: 5-10% de licencias con datos incorrectos
- Incumplimiento: Practicantes sin cobertura durante semanas

**Solucion Propuesta:**
- Sistema centralizado de gestion de licencias
- Alertas automaticas 30/15/7 dias antes de expiracion
- Proceso de renovacion digital integrado con pagos
- Validacion automatica de datos

---

#### 4.1.2 Control Disperso de Pagos

**Situacion Actual:**
- Pagos por transferencia sin trazabilidad automatica
- Conciliacion manual de pagos recibidos
- Dificultad para identificar morosos
- Sin integracion con sistemas contables

**Impacto:**
- Tiempo de conciliacion: 4-6 horas/semana
- Deuda incobrable: 10-15% de cuotas anuales
- Falta de liquidez por retrasos en cobros

**Solucion Propuesta:**
- Integracion con pasarela Redsys
- Pagos online con confirmacion inmediata
- Dashboard de pagos pendientes
- Recordatorios automaticos de pago

---

#### 4.1.3 Gestion de Seguros

**Situacion Actual:**
- Seguros gestionados individualmente por cada club
- Sin visibilidad centralizada de coberturas
- Riesgo de practicantes sin seguro activo
- Exposicion legal de la federacion

**Impacto:**
- Riesgo legal: Alto
- Cobertura real: Desconocida con precision
- Tiempo de verificacion: Manual y tedioso

**Solucion Propuesta:**
- Registro centralizado de seguros
- Alertas de expiracion automaticas
- Vinculacion seguro-miembro obligatoria
- Reportes de cobertura en tiempo real

---

#### 4.1.4 Organizacion de Seminarios

**Situacion Actual:**
- Inscripciones por email o telefono
- Control manual de aforo
- Pagos no integrados
- Comunicacion fragmentada

**Impacto:**
- Overbooking ocasional
- Perdida de inscripciones
- Cobros no realizados

**Solucion Propuesta:**
- Sistema de inscripcion online
- Control automatico de aforo
- Pago integrado en inscripcion
- Notificaciones automaticas

---

### 4.2 Oportunidades de Mejora

| Area | Oportunidad | Beneficio Esperado |
|------|-------------|-------------------|
| Comunicacion | Panel de noticias centralizado | Mejor engagement |
| Datos | Import/Export masivo | Migracion y reportes |
| Movilidad | Diseño responsive | Acceso desde cualquier dispositivo |
| Automatizacion | Workflows de aprobacion | Reduccion de carga manual |

---

## 5. Funcionalidades Principales

### 5.1 Modulo de Autenticacion y Usuarios

#### 5.1.1 Descripcion
Sistema de autenticacion seguro basado en OAuth2 con tokens JWT para gestionar el acceso de usuarios con diferentes roles y permisos.

#### 5.1.2 Funcionalidades
- **Login/Logout**: Acceso seguro con credenciales
- **Registro de usuarios**: Alta de nuevos usuarios por administradores
- **Gestion de roles**: Asignacion de permisos por rol
- **Sesiones**: Manejo de sesiones con expiracion configurable
- **Recuperacion de contraseña**: Proceso seguro de reset

#### 5.1.3 Flujo de Usuario
```
Usuario -> Login -> Validacion -> Token JWT -> Acceso segun rol
```

---

### 5.2 Modulo de Clubs

#### 5.2.1 Descripcion
Gestion completa de los clubs de Aikido afiliados a la federacion.

#### 5.2.2 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Alta de Club** | Registro de nuevo club con todos sus datos |
| **Edicion** | Modificacion de datos del club |
| **Baja** | Desactivacion de club (soft delete) |
| **Listado** | Vista de todos los clubs con filtros |
| **Detalle** | Vista completa de un club y sus miembros |
| **Asociacion** | Vinculacion con la federacion |

#### 5.2.3 Datos del Club
- Nombre del club
- Direccion completa (calle, ciudad, provincia, CP)
- Telefono de contacto
- Email
- Asociacion a la que pertenece
- Estado (activo/inactivo)

---

### 5.3 Modulo de Miembros

#### 5.3.1 Descripcion
Gestion de todos los practicantes de Aikido registrados en los clubs.

#### 5.3.2 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Alta de Miembro** | Registro con datos personales completos |
| **Edicion** | Actualizacion de informacion personal |
| **Baja/Suspension** | Cambio de estado del miembro |
| **Busqueda Avanzada** | Filtros por nombre, DNI, club, estado |
| **Cambio de Club** | Transferencia entre clubs |
| **Historial** | Registro de cambios y actividad |

#### 5.3.3 Estados del Miembro
```
PENDING -> ACTIVE -> INACTIVE/SUSPENDED
```

- **PENDING**: Pendiente de aprobacion/pago
- **ACTIVE**: Miembro activo con cuotas al dia
- **INACTIVE**: Miembro dado de baja voluntariamente
- **SUSPENDED**: Miembro suspendido por impago u otra razon

#### 5.3.4 Datos del Miembro
- Nombre y apellidos
- DNI/NIE
- Email y telefono
- Direccion completa
- Fecha de nacimiento
- Club al que pertenece
- Fecha de registro
- Estado actual

---

### 5.4 Modulo de Licencias

#### 5.4.1 Descripcion
Gestion de licencias federativas que acreditan el nivel de practica y permiten participar en eventos oficiales.

#### 5.4.2 Tipos de Licencia
| Tipo | Descripcion | Requisitos |
|------|-------------|------------|
| **KYU** | Grados de principiante (6o a 1er kyu) | Tiempo de practica |
| **DAN** | Grados de cinturon negro (1o dan en adelante) | Examen oficial |
| **INSTRUCTOR** | Habilitacion para enseñar | Grado minimo + curso |

#### 5.4.3 Estados de Licencia
```
PENDING -> ACTIVE -> EXPIRED/REVOKED
```

- **PENDING**: Solicitud en tramite
- **ACTIVE**: Licencia vigente
- **EXPIRED**: Licencia caducada (renovable)
- **REVOKED**: Licencia revocada (no renovable)

#### 5.4.4 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Emision** | Creacion de nueva licencia |
| **Renovacion** | Proceso de renovacion con nueva fecha |
| **Consulta** | Verificacion de estado y validez |
| **Alertas** | Notificaciones de expiracion proxima |
| **Historial** | Registro de todas las licencias del miembro |
| **Actualizacion de grado** | Cambio de nivel tras examen |

#### 5.4.5 Datos de Licencia
- Numero de licencia (unico)
- Miembro asociado
- Club asociado
- Tipo de licencia
- Grado actual
- Fecha de emision
- Fecha de expiracion
- Estado de renovacion

---

### 5.5 Modulo de Pagos

#### 5.5.1 Descripcion
Sistema integral de gestion de pagos con integracion a la pasarela Redsys para procesar transacciones de forma segura.

#### 5.5.2 Tipos de Pago
| Tipo | Descripcion | Periodicidad |
|------|-------------|--------------|
| **LICENSE** | Pago de licencia federativa | Anual |
| **ACCIDENT_INSURANCE** | Seguro de accidentes | Anual |
| **CIVIL_LIABILITY_INSURANCE** | Seguro de responsabilidad civil | Anual |
| **ANNUAL_QUOTA** | Cuota anual del club | Anual |
| **SEMINAR** | Inscripcion a seminario | Por evento |

#### 5.5.3 Estados de Pago
```
PENDING -> PROCESSING -> COMPLETED/FAILED
                      -> REFUNDED/CANCELLED
```

- **PENDING**: Pago pendiente de iniciar
- **PROCESSING**: Transaccion en curso
- **COMPLETED**: Pago completado exitosamente
- **FAILED**: Transaccion fallida
- **REFUNDED**: Pago devuelto
- **CANCELLED**: Pago cancelado antes de procesar

#### 5.5.4 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Crear Pago** | Registro de nuevo pago pendiente |
| **Procesar** | Integracion con Redsys |
| **Confirmar** | Recepcion de webhook de confirmacion |
| **Reembolsar** | Devolucion total o parcial |
| **Consultar** | Estado y detalle del pago |
| **Historial** | Todos los pagos de un miembro/club |

#### 5.5.5 Integracion Redsys
- Generacion de formulario de pago
- Redireccion a pasarela segura
- Recepcion de notificacion webhook
- Actualizacion automatica de estado
- Almacenamiento de respuesta para auditoria

---

### 5.6 Modulo de Seminarios

#### 5.6.1 Descripcion
Gestion completa de seminarios y eventos formativos de Aikido.

#### 5.6.2 Estados de Seminario
```
UPCOMING -> ONGOING -> COMPLETED
         -> CANCELLED
```

- **UPCOMING**: Seminario programado
- **ONGOING**: Seminario en curso
- **COMPLETED**: Seminario finalizado
- **CANCELLED**: Seminario cancelado

#### 5.6.3 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Crear Seminario** | Programacion de nuevo evento |
| **Editar** | Modificacion de datos |
| **Cancelar** | Cancelacion con notificacion |
| **Inscripciones** | Gestion de participantes |
| **Control de Aforo** | Limite de plazas |
| **Listado** | Vista de seminarios por estado |
| **Pagos** | Integracion con sistema de pagos |

#### 5.6.4 Datos del Seminario
- Titulo y descripcion
- Nombre del instructor
- Sede (venue, direccion, ciudad, provincia)
- Fechas de inicio y fin
- Precio
- Aforo maximo
- Participantes actuales
- Club/Asociacion organizadora
- Estado

---

### 5.7 Modulo de Seguros

#### 5.7.1 Descripcion
Gestion de seguros obligatorios para la practica de Aikido.

#### 5.7.2 Tipos de Seguro
| Tipo | Descripcion | Cobertura |
|------|-------------|-----------|
| **ACCIDENT** | Seguro de accidentes deportivos | Lesiones durante practica |
| **CIVIL_LIABILITY** | Responsabilidad civil | Daños a terceros |

#### 5.7.3 Estados de Seguro
```
PENDING -> ACTIVE -> EXPIRED
                  -> CANCELLED
```

#### 5.7.4 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Alta** | Registro de nueva poliza |
| **Renovacion** | Actualizacion de fechas |
| **Consulta** | Verificacion de cobertura |
| **Alertas** | Notificacion de vencimiento |
| **Documentos** | Almacenamiento de polizas |
| **Reporte** | Cobertura por club/miembro |

#### 5.7.5 Datos del Seguro
- Numero de poliza
- Compañia aseguradora
- Miembro asegurado
- Club
- Tipo de seguro
- Fechas de inicio y fin
- Importe de cobertura
- Estado
- Documento adjunto (opcional)
- Pago asociado

---

### 5.8 Modulo de Noticias

#### 5.8.1 Descripcion
Panel de noticias y comunicados con funcionalidad de gestion de lectura tipo Kanban.

#### 5.8.2 Categorias de Noticias
| Categoria | Uso |
|-----------|-----|
| **GENERAL** | Noticias generales de la federacion |
| **RESEARCH** | Articulos tecnicos de Aikido |
| **PRODUCT** | Novedades del sistema |
| **COMPANY** | Noticias institucionales |
| **TUTORIAL** | Guias y tutoriales |
| **OPINION** | Articulos de opinion |

#### 5.8.3 Estados de Lectura
```
PENDING -> READING -> READ
```

#### 5.8.4 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Crear Noticia** | Publicacion de nuevo contenido |
| **Drag & Drop** | Cambio de estado arrastrando |
| **Favoritos** | Marcar noticias importantes |
| **Filtros** | Por categoria, estado, favoritos |
| **Visibilidad** | Noticias publicas o privadas |

---

### 5.9 Modulo de Dashboard

#### 5.9.1 Descripcion
Panel de control con vision general del estado de la federacion y alertas importantes.

#### 5.9.2 Metricas Mostradas
| Metrica | Descripcion |
|---------|-------------|
| **Total Clubs** | Numero de clubs activos |
| **Total Miembros** | Miembros registrados |
| **Miembros Activos** | Miembros con estado activo |
| **Total Pagos** | Volumen total de pagos |
| **Pagos Mensuales** | Pagos del mes actual |
| **Pagos Pendientes** | Pagos sin completar |
| **Seminarios Proximos** | Eventos programados |
| **Licencias por Expirar** | Alertas de vencimiento |

#### 5.9.3 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Resumen Global** | KPIs principales |
| **Alertas** | Notificaciones importantes |
| **Graficos** | Visualizacion de tendencias |
| **Accesos Rapidos** | Links a acciones frecuentes |

---

### 5.10 Modulo de Importacion/Exportacion

#### 5.10.1 Descripcion
Herramientas para carga y descarga masiva de datos.

#### 5.10.2 Funcionalidades
| Funcionalidad | Descripcion |
|---------------|-------------|
| **Importar CSV** | Carga masiva de miembros |
| **Importar Excel** | Carga desde hojas de calculo |
| **Exportar CSV** | Descarga de datos filtrados |
| **Exportar Excel** | Generacion de reportes |
| **Plantillas** | Descarga de templates |
| **Validacion** | Verificacion antes de importar |

---

## 6. Requisitos Funcionales

### 6.1 RF-AUTH: Autenticacion y Autorizacion

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-AUTH-01 | El sistema debe permitir login con email y contraseña | Alta |
| RF-AUTH-02 | Las contraseñas deben almacenarse hasheadas con bcrypt | Alta |
| RF-AUTH-03 | El sistema debe emitir tokens JWT con expiracion configurable | Alta |
| RF-AUTH-04 | Cada usuario debe tener un rol asignado | Alta |
| RF-AUTH-05 | Los endpoints deben validar permisos segun rol | Alta |
| RF-AUTH-06 | Debe existir proceso de recuperacion de contraseña | Media |
| RF-AUTH-07 | Las sesiones inactivas deben expirar automaticamente | Media |

### 6.2 RF-CLUB: Gestion de Clubs

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-CLUB-01 | Crear club con nombre, direccion, email y telefono | Alta |
| RF-CLUB-02 | Editar datos de club existente | Alta |
| RF-CLUB-03 | Desactivar club (no eliminar fisicamente) | Alta |
| RF-CLUB-04 | Listar clubs con paginacion y filtros | Alta |
| RF-CLUB-05 | Ver detalle de club con sus miembros | Alta |
| RF-CLUB-06 | Asociar club a federacion | Alta |
| RF-CLUB-07 | Validar email con formato correcto | Alta |
| RF-CLUB-08 | El nombre del club debe ser unico | Media |

### 6.3 RF-MEMBER: Gestion de Miembros

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-MEMBER-01 | Crear miembro con datos personales completos | Alta |
| RF-MEMBER-02 | Validar DNI/NIE unico en el sistema | Alta |
| RF-MEMBER-03 | Validar formato de email | Alta |
| RF-MEMBER-04 | Asignar miembro a un club | Alta |
| RF-MEMBER-05 | Cambiar estado del miembro | Alta |
| RF-MEMBER-06 | Buscar por nombre, DNI, email | Alta |
| RF-MEMBER-07 | Filtrar por club y estado | Alta |
| RF-MEMBER-08 | Transferir miembro entre clubs | Media |
| RF-MEMBER-09 | Ver historial de cambios | Baja |

### 6.4 RF-LICENSE: Gestion de Licencias

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-LICENSE-01 | Crear licencia con numero unico | Alta |
| RF-LICENSE-02 | Asignar licencia a miembro y club | Alta |
| RF-LICENSE-03 | Definir tipo (KYU/DAN/INSTRUCTOR) y grado | Alta |
| RF-LICENSE-04 | Establecer fechas de emision y expiracion | Alta |
| RF-LICENSE-05 | Renovar licencia actualizando expiracion | Alta |
| RF-LICENSE-06 | Listar licencias por expirar en X dias | Alta |
| RF-LICENSE-07 | Actualizar estado automaticamente si expira | Alta |
| RF-LICENSE-08 | Actualizar grado tras examen | Media |
| RF-LICENSE-09 | Revocar licencia con motivo | Baja |

### 6.5 RF-PAYMENT: Gestion de Pagos

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-PAYMENT-01 | Crear pago con tipo y monto | Alta |
| RF-PAYMENT-02 | Asociar pago a miembro y club | Alta |
| RF-PAYMENT-03 | Iniciar proceso de pago con Redsys | Alta |
| RF-PAYMENT-04 | Recibir webhook de confirmacion | Alta |
| RF-PAYMENT-05 | Actualizar estado tras respuesta | Alta |
| RF-PAYMENT-06 | Almacenar respuesta de Redsys | Alta |
| RF-PAYMENT-07 | Procesar reembolsos totales o parciales | Media |
| RF-PAYMENT-08 | Validar que reembolso no exceda pago | Alta |
| RF-PAYMENT-09 | Listar pagos con filtros por estado/tipo | Alta |

### 6.6 RF-SEMINAR: Gestion de Seminarios

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-SEMINAR-01 | Crear seminario con datos completos | Alta |
| RF-SEMINAR-02 | Validar que fecha inicio < fecha fin | Alta |
| RF-SEMINAR-03 | Definir aforo maximo opcional | Alta |
| RF-SEMINAR-04 | Controlar inscripciones vs aforo | Alta |
| RF-SEMINAR-05 | Cancelar seminario si no ha finalizado | Alta |
| RF-SEMINAR-06 | Listar seminarios proximos | Alta |
| RF-SEMINAR-07 | Actualizar estado segun fechas | Media |
| RF-SEMINAR-08 | Registrar participantes | Alta |

### 6.7 RF-INSURANCE: Gestion de Seguros

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-INSURANCE-01 | Crear seguro con numero de poliza unico | Alta |
| RF-INSURANCE-02 | Definir tipo (accidente/RC) | Alta |
| RF-INSURANCE-03 | Asociar a miembro y club | Alta |
| RF-INSURANCE-04 | Validar fechas inicio < fin | Alta |
| RF-INSURANCE-05 | Listar seguros por expirar | Alta |
| RF-INSURANCE-06 | Actualizar estado si expira | Alta |
| RF-INSURANCE-07 | Calcular dias hasta expiracion | Alta |
| RF-INSURANCE-08 | Alertar seguros expirando en 30 dias | Alta |
| RF-INSURANCE-09 | Vincular pago de seguro | Media |

### 6.8 RF-NEWS: Gestion de Noticias

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-NEWS-01 | Crear noticia con titulo, resumen, link | Media |
| RF-NEWS-02 | Asignar categoria | Media |
| RF-NEWS-03 | Cambiar estado via drag & drop | Media |
| RF-NEWS-04 | Marcar/desmarcar favorito | Media |
| RF-NEWS-05 | Filtrar por categoria y estado | Media |
| RF-NEWS-06 | Definir visibilidad publica/privada | Baja |

### 6.9 RF-DASHBOARD: Panel de Control

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-DASH-01 | Mostrar total de clubs activos | Alta |
| RF-DASH-02 | Mostrar total y activos de miembros | Alta |
| RF-DASH-03 | Mostrar resumen de pagos | Alta |
| RF-DASH-04 | Mostrar seminarios proximos | Alta |
| RF-DASH-05 | Mostrar licencias por expirar | Alta |
| RF-DASH-06 | Alertas de seguros por vencer | Alta |
| RF-DASH-07 | Pagos pendientes de completar | Alta |

### 6.10 RF-IMPORT: Importacion/Exportacion

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-IMPORT-01 | Importar miembros desde CSV | Media |
| RF-IMPORT-02 | Validar datos antes de importar | Alta |
| RF-IMPORT-03 | Reportar errores de validacion | Alta |
| RF-IMPORT-04 | Exportar datos a CSV | Media |
| RF-IMPORT-05 | Exportar datos a Excel | Baja |
| RF-IMPORT-06 | Descargar plantillas de importacion | Media |

---

## 7. Requisitos No Funcionales

### 7.1 RNF-PERF: Rendimiento

| ID | Requisito | Metrica |
|----|-----------|---------|
| RNF-PERF-01 | Tiempo de respuesta de APIs | < 500ms para el 95% |
| RNF-PERF-02 | Tiempo de carga de paginas | < 3 segundos |
| RNF-PERF-03 | Soporte de usuarios concurrentes | Minimo 100 |
| RNF-PERF-04 | Paginacion en listados | Maximo 50 items/pagina |

### 7.2 RNF-SEC: Seguridad

| ID | Requisito | Implementacion |
|----|-----------|----------------|
| RNF-SEC-01 | Autenticacion OAuth2 | JWT con expiracion |
| RNF-SEC-02 | Encriptacion de contraseñas | bcrypt |
| RNF-SEC-03 | Comunicacion HTTPS | TLS 1.2+ |
| RNF-SEC-04 | Proteccion CSRF | Tokens en formularios |
| RNF-SEC-05 | Validacion de entrada | Pydantic/Zod |
| RNF-SEC-06 | Rate limiting | Limitar peticiones/minuto |
| RNF-SEC-07 | Cumplimiento RGPD | Consentimiento, derecho al olvido |

### 7.3 RNF-DISP: Disponibilidad

| ID | Requisito | Objetivo |
|----|-----------|----------|
| RNF-DISP-01 | Uptime del sistema | 99.5% |
| RNF-DISP-02 | Tiempo maximo de caida | 4 horas/mes |
| RNF-DISP-03 | Backups de base de datos | Diarios |
| RNF-DISP-04 | Plan de recuperacion | RPO < 24h, RTO < 4h |

### 7.4 RNF-USAB: Usabilidad

| ID | Requisito | Criterio |
|----|-----------|----------|
| RNF-USAB-01 | Diseño responsive | Mobile-first |
| RNF-USAB-02 | Accesibilidad | WCAG 2.1 AA |
| RNF-USAB-03 | Internacionalizacion | Español inicial |
| RNF-USAB-04 | Mensajes de error | Claros y accionables |
| RNF-USAB-05 | Feedback visual | Loading states, confirmaciones |

### 7.5 RNF-MANT: Mantenibilidad

| ID | Requisito | Practica |
|----|-----------|----------|
| RNF-MANT-01 | Arquitectura modular | Hexagonal backend |
| RNF-MANT-02 | Cobertura de tests | > 80% |
| RNF-MANT-03 | Documentacion de API | OpenAPI/Swagger |
| RNF-MANT-04 | Logs estructurados | JSON format |
| RNF-MANT-05 | Versionado de API | Semantic versioning |

### 7.6 RNF-SCAL: Escalabilidad

| ID | Requisito | Capacidad |
|----|-----------|-----------|
| RNF-SCAL-01 | Clubs soportados | > 500 |
| RNF-SCAL-02 | Miembros soportados | > 50,000 |
| RNF-SCAL-03 | Transacciones/dia | > 1,000 |
| RNF-SCAL-04 | Crecimiento horizontal | Contenedores Docker |

---

## 8. Metricas de Exito

### 8.1 KPIs de Adopcion

| Metrica | Objetivo | Plazo |
|---------|----------|-------|
| Clubs registrados | 100% de clubs activos | 6 meses |
| Usuarios activos mensuales | > 80% de administradores | 3 meses |
| Miembros migrados | 100% de datos historicos | 3 meses |

### 8.2 KPIs de Eficiencia

| Metrica | Baseline | Objetivo | Mejora |
|---------|----------|----------|--------|
| Tiempo en tareas administrativas | 15h/semana | 5h/semana | 67% |
| Errores en licencias | 5-10% | < 1% | 90% |
| Tiempo de emision de licencia | 5-7 dias | < 24h | 85% |

### 8.3 KPIs Financieros

| Metrica | Baseline | Objetivo | Mejora |
|---------|----------|----------|--------|
| Tasa de cobro de cuotas | 85% | 95% | 12% |
| Tiempo medio de cobro | 30 dias | 7 dias | 77% |
| Licencias renovadas a tiempo | 70% | 95% | 36% |

### 8.4 KPIs de Calidad

| Metrica | Objetivo |
|---------|----------|
| NPS (Net Promoter Score) | > 50 |
| Satisfaccion de usuario | > 4.0/5.0 |
| Tickets de soporte/mes | < 10 |
| Tiempo resolucion tickets | < 48h |

### 8.5 KPIs Tecnicos

| Metrica | Objetivo |
|---------|----------|
| Disponibilidad del sistema | > 99.5% |
| Tiempo respuesta API (p95) | < 500ms |
| Errores en produccion | < 0.1% |
| Cobertura de tests | > 80% |

---

## 9. Consideraciones Tecnicas

### 9.1 Arquitectura General

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|    Frontend      |<--->|    Backend       |<--->|    Database      |
|    (React)       |     |    (FastAPI)     |     |    (MongoDB)     |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
         |                       |
         v                       v
+------------------+     +------------------+
|                  |     |                  |
|    CDN/Static    |     |    Redsys        |
|    Assets        |     |    (Payments)    |
|                  |     |                  |
+------------------+     +------------------+
```

### 9.2 Stack Tecnologico

#### 9.2.1 Backend
| Componente | Tecnologia | Justificacion |
|------------|------------|---------------|
| Framework | FastAPI | Async, tipado, autodoc |
| ORM/ODM | Motor (async) | MongoDB async nativo |
| Validacion | Pydantic | Tipado y validacion robusta |
| Auth | OAuth2 + JWT | Estandar industria |
| Tests | Pytest | Cobertura completa |

#### 9.2.2 Frontend
| Componente | Tecnologia | Justificacion |
|------------|------------|---------------|
| Framework | React 19 | Ultima version estable |
| Lenguaje | TypeScript | Tipado estatico |
| Build | Vite | Rapido, moderno |
| Estilos | TailwindCSS | Utility-first |
| UI Components | Radix UI | Accesibilidad nativa |
| State | React Query | Cache y sync de datos |
| Routing | React Router | Navegacion SPA |
| Validacion | Zod | Schemas tipados |

#### 9.2.3 Infraestructura
| Componente | Tecnologia | Justificacion |
|------------|------------|---------------|
| Database | MongoDB | Flexibilidad de esquema |
| Contenedores | Docker | Portabilidad |
| Orquestacion | Docker Compose | Desarrollo local |

### 9.3 Arquitectura Backend (Hexagonal)

```
+------------------------------------------+
|              Web Layer                    |
|  +------+  +------+  +------+  +------+  |
|  |Router|  | DTOs |  |Mapper|  | Deps |  |
|  +------+  +------+  +------+  +------+  |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|           Application Layer              |
|  +------------+  +-------------------+   |
|  | Use Cases  |  |      Ports        |   |
|  +------------+  | (Repo Interfaces) |   |
|                  +-------------------+   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|             Domain Layer                 |
|  +------------+  +-------------------+   |
|  |  Entities  |  |    Exceptions     |   |
|  +------------+  +-------------------+   |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
|          Infrastructure Layer            |
|  +-----------------------------------+   |
|  |    Adapters (Repositories)        |   |
|  +-----------------------------------+   |
+------------------------------------------+
```

### 9.4 Arquitectura Frontend (Feature-based)

```
src/
├── core/                    # Infraestructura compartida
│   ├── data/               # API client, storage
│   └── hooks/              # Hooks globales
├── components/             # UI Components (Radix)
│   └── ui/                 # Componentes base
├── features/               # Modulos de negocio
│   ├── auth/
│   │   ├── components/
│   │   ├── data/
│   │   └── hooks/
│   ├── clubs/
│   ├── members/
│   ├── licenses/
│   ├── payments/
│   ├── seminars/
│   ├── insurance/
│   ├── news/
│   ├── dashboard/
│   └── import-export/
└── pages/                  # Rutas/Vistas
```

### 9.5 Integraciones Externas

#### 9.5.1 Redsys (Pagos)
- **Tipo**: Pasarela de pago bancario
- **Metodo**: POST con firma HMAC SHA256
- **Flujo**: Redireccion a TPV virtual
- **Notificacion**: Webhook asincrono

#### 9.5.2 Email (Futuro)
- **Uso**: Notificaciones y alertas
- **Opciones**: SendGrid, AWS SES, SMTP

### 9.6 Seguridad

| Aspecto | Implementacion |
|---------|----------------|
| Autenticacion | OAuth2 + JWT |
| Autorizacion | RBAC (Role-Based Access Control) |
| Encriptacion passwords | bcrypt |
| Transporte | HTTPS/TLS 1.2+ |
| Validacion entrada | Pydantic (back) + Zod (front) |
| CORS | Configurado por origen |
| Rate limiting | Por IP/usuario |
| RGPD | Consentimiento + derecho al olvido |

### 9.7 Base de Datos

#### 9.7.1 Colecciones MongoDB
- users
- associations
- clubs
- members
- licenses
- payments
- seminars
- insurances
- news_items

#### 9.7.2 Indices Recomendados
```javascript
// members
{ "dni": 1 } // unique
{ "email": 1 }
{ "club_id": 1, "status": 1 }

// licenses
{ "license_number": 1 } // unique
{ "member_id": 1 }
{ "expiration_date": 1, "status": 1 }

// payments
{ "member_id": 1 }
{ "status": 1, "payment_type": 1 }
{ "transaction_id": 1 }

// insurances
{ "policy_number": 1 } // unique
{ "end_date": 1, "status": 1 }
```

---

## 10. Roadmap Sugerido

### 10.1 Fase 1: MVP (Meses 1-3)

**Objetivo**: Sistema funcional con funcionalidades core

| Sprint | Entregable | Prioridad |
|--------|------------|-----------|
| Sprint 1-2 | Autenticacion y usuarios | Alta |
| Sprint 3-4 | Gestion de clubs | Alta |
| Sprint 5-6 | Gestion de miembros | Alta |
| Sprint 7-8 | Gestion de licencias | Alta |
| Sprint 9-10 | Dashboard basico | Alta |

**Criterios de Exito MVP:**
- [ ] Login/logout funcional
- [ ] CRUD completo de clubs
- [ ] CRUD completo de miembros
- [ ] CRUD completo de licencias
- [ ] Dashboard con metricas basicas

### 10.2 Fase 2: Version 1.0 (Meses 4-6)

**Objetivo**: Sistema completo con pagos y seguros

| Sprint | Entregable | Prioridad |
|--------|------------|-----------|
| Sprint 11-12 | Integracion Redsys | Alta |
| Sprint 13-14 | Gestion de pagos completa | Alta |
| Sprint 15-16 | Gestion de seguros | Alta |
| Sprint 17-18 | Sistema de alertas | Alta |
| Sprint 19-20 | Import/Export | Media |

**Criterios de Exito V1.0:**
- [ ] Pagos online funcionando
- [ ] Seguros gestionados
- [ ] Alertas de expiracion activas
- [ ] Importacion masiva de datos

### 10.3 Fase 3: Version 2.0 (Meses 7-9)

**Objetivo**: Funcionalidades avanzadas y optimizacion

| Sprint | Entregable | Prioridad |
|--------|------------|-----------|
| Sprint 21-22 | Gestion de seminarios | Media |
| Sprint 23-24 | Panel de noticias | Media |
| Sprint 25-26 | Reportes avanzados | Media |
| Sprint 27-28 | Optimizacion rendimiento | Media |
| Sprint 29-30 | App movil (PWA) | Baja |

**Criterios de Exito V2.0:**
- [ ] Seminarios con inscripcion online
- [ ] Panel de noticias funcional
- [ ] Reportes exportables
- [ ] Rendimiento optimizado

### 10.4 Fase 4: Mejora Continua (Mes 10+)

**Objetivo**: Iteracion basada en feedback

- Mejoras de UX basadas en uso real
- Nuevas integraciones (email, notificaciones push)
- Funcionalidades solicitadas por usuarios
- Expansion a otras federaciones/artes marciales

### 10.5 Diagrama de Gantt Simplificado

```
Mes        1    2    3    4    5    6    7    8    9    10+
           |----|----|----|----|----|----|----|----|----|--->
MVP        [=========]
  Auth     [==]
  Clubs        [==]
  Members          [==]
  Licenses            [==]
  Dashboard              [=]
V1.0                 [=========]
  Payments           [====]
  Insurance               [==]
  Alerts                      [=]
  Import                       [=]
V2.0                          [=========]
  Seminars                    [==]
  News                            [==]
  Reports                              [==]
  PWA                                      [==]
Mejora                                         [======>
```

---

## 11. Riesgos y Mitigaciones

### 11.1 Riesgos Tecnicos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Integracion Redsys compleja | Media | Alto | Usar SDK oficial, sandbox de pruebas |
| Rendimiento con muchos datos | Baja | Medio | Indices optimizados, paginacion |
| Seguridad de datos | Baja | Alto | Auditorias, encriptacion, RGPD |
| Compatibilidad navegadores | Baja | Bajo | Testing cross-browser |

### 11.2 Riesgos de Negocio

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Baja adopcion por usuarios | Media | Alto | Formacion, UX intuitiva |
| Resistencia al cambio | Media | Medio | Migracion gradual, soporte |
| Datos historicos inconsistentes | Alta | Medio | Validacion en importacion |
| Requisitos cambiantes | Media | Medio | Metodologia agil |

### 11.3 Riesgos Operativos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Caida del servicio | Baja | Alto | Backups, monitorizacion |
| Perdida de datos | Muy baja | Muy alto | Backups diarios, replicacion |
| Falta de soporte | Media | Medio | Documentacion, formacion |

---

## 12. Anexos

### 12.1 Glosario de Terminos

| Termino | Definicion |
|---------|------------|
| **Aikido** | Arte marcial japones fundado por Morihei Ueshiba |
| **KYU** | Grados de principiante (6o kyu a 1er kyu) |
| **DAN** | Grados de cinturon negro (1er dan en adelante) |
| **Dojo** | Lugar de practica (equivalente a club) |
| **Sensei** | Instructor/Maestro |
| **Shihan** | Maestro de alto grado |
| **Federation** | Organizacion que agrupa clubs |
| **Redsys** | Pasarela de pagos bancaria española |
| **RGPD** | Reglamento General de Proteccion de Datos |

### 12.2 Referencias

- Aikikai Foundation: https://www.aikikai.or.jp/
- Redsys Documentation: https://pagosonline.redsys.es/
- RGPD: https://www.aepd.es/

### 12.3 Historial de Cambios del Documento

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Market Research Analyst Agent | Creacion inicial |

---

## Conclusiones

Spain Aikikai Admin representa una solucion integral para la modernizacion de la gestion administrativa de la federacion de Aikido de España. El sistema propuesto aborda los principales pain points identificados:

1. **Digitalizacion completa**: Eliminacion de procesos manuales basados en papel y hojas de calculo
2. **Centralizacion de datos**: Una unica fuente de verdad para toda la informacion de la federacion
3. **Automatizacion de alertas**: Notificaciones proactivas de vencimientos de licencias y seguros
4. **Integracion de pagos**: Cobro eficiente y trazabilidad completa con Redsys
5. **Escalabilidad**: Arquitectura preparada para crecer con la federacion

La implementacion exitosa del sistema permitira:
- Reducir en un 67% el tiempo dedicado a tareas administrativas
- Mejorar la tasa de cobro de cuotas del 85% al 95%
- Garantizar el 100% de cumplimiento en seguros obligatorios
- Proporcionar visibilidad en tiempo real del estado de la federacion

El roadmap propuesto permite un despliegue gradual que minimiza riesgos y permite validar el producto con usuarios reales desde las primeras fases.

---

*Documento generado por Market Research Analyst Agent*
*Spain Aikikai Admin - PRD v1.0*
