# Monorepo Migration Context Session

## Objetivo
Convertir el repositorio actual a un monorepo con pnpm y Turborepo.

## Estado Actual del Proyecto

### Estructura Actual
```
/
├── backend/              # FastAPI (Poetry - Python 3.11+)
├── frontend/             # React 19 web app (npm)
├── frontend-mobile/      # React 18 mobile app (npm/Ionic/Capacitor)
├── docker-compose.yml    # Deployment config (Dokploy)
├── docs/
└── .claude/, .vscode/, .cursor/
```

### Tecnologías por Aplicación

| Aplicación | Package Manager | Framework | Versión React | Build Tool |
|------------|-----------------|-----------|---------------|------------|
| backend | Poetry | FastAPI | N/A | Uvicorn |
| frontend | npm | React | 19 | Vite |
| frontend-mobile | npm | Ionic React | 18 | Vite |

### Problemas Identificados

1. **Gestión de dependencias fragmentada**:
   - npm para frontends (lock files separados)
   - Poetry para backend
   - node_modules duplicados: ~747MB total

2. **Sin orquestación de builds**:
   - Builds manuales en cada directorio
   - Sin caché de compilación
   - Sin pipelines paralelos

3. **Código duplicado potencial**:
   - Ambos frontends usan axios, jwt-decode, etc.
   - No hay paquetes compartidos

4. **Configuración dispersa**:
   - TypeScript configs separados
   - ESLint/Prettier separados
   - Sin root package.json

5. **Versiones de React incompatibles**:
   - frontend: React 19
   - frontend-mobile: React 18

### Docker & CI/CD
- Docker Compose configurado para Dokploy
- Sin GitHub Actions ni CI/CD pipeline
- Dockerfiles individuales por app

---

## Análisis de Migración

### Estructura Propuesta Monorepo
```
/
├── apps/
│   ├── web/              # React 19 web app (antes frontend/)
│   ├── mobile/           # Ionic/Capacitor app (antes frontend-mobile/)
│   └── api/              # FastAPI backend (antes backend/)
├── packages/
│   ├── ui/               # Componentes UI compartidos (opcional)
│   ├── shared/           # Utilidades compartidas (opcional)
│   └── tsconfig/         # Configuraciones TypeScript compartidas
├── turbo.json            # Configuración Turborepo
├── pnpm-workspace.yaml   # Configuración workspace pnpm
├── package.json          # Root package.json
├── docker-compose.yml
└── .github/
    └── workflows/        # CI/CD (opcional)
```

### Archivos Clave a Crear

1. **Root level**:
   - `package.json` - Scripts globales y workspace config
   - `pnpm-workspace.yaml` - Definición de workspaces
   - `turbo.json` - Pipeline de Turborepo
   - `.npmrc` - Configuración pnpm

2. **Por aplicación**:
   - Actualizar `package.json` con nombres de workspace
   - Ajustar imports relativos si se crean paquetes compartidos

---

## Preguntas Pendientes

1. ¿Incluir el backend Python en el monorepo o mantenerlo separado?
2. ¿Crear paquetes compartidos (ui, utils) entre frontends?
3. ¿Configurar CI/CD con GitHub Actions?
4. ¿Migrar frontend-mobile a React 19 para unificar versiones?

---

## Plan de Implementación

*Pendiente de decisiones del usuario*

---

## Notas de Subagentes

*Se actualizará conforme se consulten subagentes*
