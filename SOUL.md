# SOUL.md — Portal de Convocatorias Públicas

> Resumen contextual del trabajo con Hermes + LLMs. Es la evidencia de **cómo**
> construí, no solo de qué construí. Se va llenando durante el reto (append-only).
> Reto AI-First · Fase 1 · Track DEV · Juan David Forero.

## Proyecto
Portal de Convocatorias Públicas: app web con autenticación donde usuarios
registrados exploran, filtran y guardan convocatorias públicas colombianas
consultadas en vivo desde datos.gov.co (SECOP, dataset `p6dx-8zbt`).
**Problema que resuelve:** el portal oficial de SECOP es difícil de filtrar y no
permite guardar favoritos ni reusar búsquedas; este portal sí.

## Stack y arquitectura
- **Backend:** FastAPI (Python) + SQLAlchemy + SQLite. Auth con JWT.
- **Frontend:** React + Vite.
- **Integración:** cliente a SECOP vía protocolo Socrata/SODA (sin API key).
- **Flujo:** React SPA → FastAPI (`/api`, JWT) → SECOP (en vivo); SQLite persiste
  usuarios, bookmarks y búsquedas guardadas.
- Diagrama y contrato completo: `docs/SPEC.md`.

## Cómo usé Hermes y los LLMs
> _(Ir registrando: skills/instrucciones clave, specs o prompts que mejor
> funcionaron, iteraciones, qué modelo se usó en cada momento y por qué.)_

- **[2026-06-30] Día 1 — Fundación.** Antes de generar código se definió el
  `docs/SPEC.md` (contrato funcional/técnico) y el `CLAUDE.md` (contrato operativo
  del agente). Se exploró la API de SECOP en vivo para aterrizar la integración en
  los 51 campos reales del dataset (no inventados).

- **[2026-07-02] Días 2 y 3 — Backend completo + primer frontend.** Se generó
  `backend/app/` siguiendo `docs/PLAN-DIA2-BACKEND.md` casi al pie de la letra
  (`config.py`, `database.py`, `models.py`, `schemas.py`, `deps.py`, `routers/auth.py`,
  `services/secop.py`), y se adelantó también el alcance del Día 3 (bookmarks y
  saved-searches) en la misma sesión. Modelo usado: **Claude Sonnet 4.6** para todo
  el tramo (scaffolding, lógica de negocio e integración SECOP) — no se necesitó
  escalar a un modelo más potente en estos pasos.
  - Se generó el primer frontend en React + Vite: login, registro, listado con
    búsqueda/filtros básicos, vista de detalle y navegación con `react-router-dom`.
  - **`$select` fijo vs. traer todos los campos:** se optó por `$select` fijo con
    los 14 campos que el portal realmente usa (ver `services/secop.py`), en vez de
    traer los 51 campos del dataset, para aligerar el payload de cada consulta a SECOP.
  - **Cómo se verificó `urlproceso` como objeto:** se confirmó en vivo contra la API
    real de SECOP (no se asumió por documentación) que el campo llega como
    `{"url": "..."}` y no como string; de ahí el `.get()` seguro en `_normalize()`.

## Decisiones y trade-offs
- **SQLite en vez de PostgreSQL:** cero infra, suficiente para el MVP; el spec
  permite ambos. Trade-off: menos realista para producción, pero más rápido de demostrar.
- **React (Vite):** más vistoso para la demo; trade-off: requiere build step vs. HTML vanilla.
- **Proxy del backend a SECOP** (el frontend nunca llama a SECOP directo): permite
  normalizar shape, manejar errores y cachear. Trade-off: un salto extra de red.
- **Snapshot de campos en `bookmarks`:** mostrar el favorito sin re-consultar SECOP;
  el `proceso_id` permite refrescar cuando se quiera.

## Bloqueos y cómo los resolví
> _(Registrar cada bloqueo real y su solución — esto puntúa: demuestra autonomía.)_

- **[2026-07-02] `passlib` incompatible con Python 3.14.** Al generar
  `security.py` según el plan (passlib `CryptContext` con esquema bcrypt), el
  hashing de contraseñas fallaba por incompatibilidad de `passlib` con la versión
  de Python del entorno (3.14). **Solución:** se reemplazó `passlib.CryptContext`
  por llamadas directas a la librería `bcrypt` (`bcrypt.hashpw` / `bcrypt.checkpw`),
  eliminando la dependencia de `passlib` sin cambiar el contrato de las funciones
  `hash_password` / `verify_password`. Nota para el spec: `docs/SPEC.md` y
  `docs/PLAN-DIA2-BACKEND.md` todavía mencionan `passlib[bcrypt]` como dependencia;
  el código real ya no la usa.

- **[2026-07-02] Tailwind nunca se instaló de verdad en el frontend.** Al
  diseñar la nueva dirección visual se descubrió que `frontend/package.json` no
  tiene `tailwindcss` y no existe `tailwind.config.js`. Las clases tipo
  `bg-red-500 text-white px-4 py-2 rounded` ya escritas en `Home.jsx`,
  `Detail.jsx`, `Login.jsx` y `Register.jsx` desde Días 2-3 son clases muertas —
  nunca se procesaron a CSS real, de ahí el look sin estilo del frontend actual.
  **Decisión (con visto bueno del usuario):** instalar Tailwind v4 (`tailwindcss`
  + `@tailwindcss/vite`) en vez de reescribir todo a CSS plano, para reaprovechar
  las clases ya presentes en el código. Detalle del plan en
  `docs/superpowers/specs/2026-07-02-cierre-dia4-frontend-design.md §9`.

- **[2026-07-02] Interceptor 401 global chocaba con el login.** Al ejecutar el
  plan de cierre Día 4 (Task 6, vía subagent-driven-development), el reviewer
  detectó que el nuevo interceptor de respuesta de axios en `App.jsx`
  interceptaba *cualquier* `401`, incluyendo el `401` legítimo de
  `POST /api/auth/login` con credenciales incorrectas (documentado en
  `SPEC.md §7`). Antes de que `Login.jsx` pudiera mostrar "Credenciales
  incorrectas" en su `catch`, el interceptor ya había limpiado el token y
  forzado un `window.location.href = '/login'` (recarga dura) — el usuario
  nunca veía el mensaje de error. **Solución (confirmada con el usuario):** el
  interceptor ahora excluye `/auth/login` y `/auth/register` del auto-logout
  (`error.config.url` termina en esas rutas → no limpia token ni redirige,
  pero sigue rechazando la promesa para que el `catch` de cada página siga
  funcionando). Detectado y corregido en la primera vuelta de revisión de
  Task 6, antes de tocar `Login.jsx`/`Register.jsx`.

## Qué mejoraría o pediría
> _(Cerrar al final: límites del MVP, qué haría con más tiempo/créditos.)_

## Enlace al repositorio
> _(Pegar la URL del repo público GitHub/GitLab.)_
