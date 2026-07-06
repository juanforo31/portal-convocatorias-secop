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

- **[2026-07-02] Cierre Día 4 — bookmarks/perfil/UI, vía subagent-driven-development.**
  Se ejecutó `docs/superpowers/plans/2026-07-02-cierre-dia4-frontend.md` (11 tareas)
  en un worktree aislado (`worktree-cierre-dia4-frontend`), con un subagente
  implementador + un subagente revisor por tarea. Modelos: **Haiku** para tareas
  mecánicas de transcripción (utils puros, componentes sin lógica, Tailwind
  setup, polish de Login/Register); **Sonnet** para tareas de integración
  multi-archivo (App.jsx, Home.jsx, Detail.jsx, Profile.jsx) y para todas las
  revisiones. Cerró:
  - Contrato de API: `DELETE /api/bookmarks/{proceso_id}` (antes ID interno) y
    `POST/GET /api/saved-searches` con `filters` como objeto (antes JSON string
    manual) — ambos con tests pytest nuevos (primera suite de tests del backend).
  - Frontend: filtros completos + paginación + favoritos + "guardar búsqueda" en
    Home; favorito en Detail; página de Perfil (favoritos + búsquedas guardadas
    re-ejecutables); normalización de `"No Definido"`/`"No Adjudicado"`.
  - Dirección visual "gaceta/expediente oficial": Tailwind v4 instalado de
    verdad (nunca lo estuvo, ver bloqueo arriba), tokens de color/tipografía,
    componente `EstadoStamp` (sello de estado) como elemento de firma visual.
  - Dos bloqueos reales detectados en revisión y corregidos antes de avanzar:
    el interceptor 401 vs. login (arriba) y un `setSearchParams` sin
    `{replace: true}` que llenaba el historial del navegador con una entrada
    por cada tecla escrita en los filtros (Task 7), además de agregarle
    debounce de 400ms al fetch de convocatorias.
  - **Limitación de esta sesión:** ni el controlador ni los subagentes tuvieron
    acceso a un navegador real — toda la verificación de frontend fue
    `npm run build` + llamadas curl contra el backend real (puerto 8001,
    aislado del server de desarrollo) + trazas estáticas del código. Falta un
    recorrido manual real en navegador antes de dar el flujo por 100% probado
    visualmente (ver Definition of Done en `docs/SPEC.md §10`).

## Qué mejoraría o pediría
- Con más tiempo: dropdowns con valores reales de SECOP para los filtros (hoy
  son texto libre), conteo total de resultados en `/api/convocatorias`
  ("página X de Y" en vez de solo Anterior/Siguiente), y un framework de tests
  de frontend (no existe ninguno en el proyecto — toda la verificación de
  React fue build-check + curl + trazas manuales, nunca clicks reales).
- **Deuda documentada de la revisión final de rama (2026-07-02, todos Minor,
  ninguno bloquea el merge):**
  1. Lógica de toggle de favorito duplicada en `Home.jsx`, `Detail.jsx` y
     `Profile.jsx` (patrón "409/404 = éxito" copiado 3 veces) — candidata a un
     hook compartido `useBookmarkToggle`.
  2. `Profile.jsx`'s `fetchAll` no maneja errores (a diferencia de Home/Detail);
     un fallo no-401 en cualquiera de las 3 llamadas deja el perfil en blanco
     sin mensaje.
  3. `proceso_id` no pasa por `encodeURIComponent` en las rutas `DELETE`
     (`Home.jsx`, `Detail.jsx`, `Profile.jsx`) — no es un bug real con los IDs
     actuales de SECOP, pero es hardening defensivo barato.
  4. El campo `titulo` no pasa por `displayValue` en `Home.jsx`/`Detail.jsx`
     (sí en `Profile.jsx`) — inconsistencia menor de normalización.
- Una condición de carrera de baja probabilidad quedó como deuda conocida: en
  Home/Detail, el fetch de `GET /bookmarks` al montar no tiene
  `AbortController` ni guard de staleness frente a un toggle de favorito
  disparado justo después — el debounce de Home mitiga la ventana pero no la
  elimina.
- Recomendación fuerte antes de la demo: hacer el recorrido manual completo en
  navegador (login → filtros → favorito → perfil → guardar/re-ejecutar
  búsqueda → logout) descrito en el plan de cierre Día 4 §8, ya que esta
  sesión no pudo verificarlo visualmente por falta de herramienta de navegador.

## Enlace al repositorio
https://github.com/juanforo31/portal-convocatorias-secop

- **[2026-07-06] Recorrido manual en navegador real (pendiente desde Día 4).**
  Se hizo el recorrido completo con un navegador real (Playwright/Chromium
  headless, no solo curl/build): registro → login → browse con datos reales de
  SECOP → marcar favorito en Home y en Detail → guardar búsqueda (diálogo
  `window.prompt`) → perfil (favoritos y búsqueda guardada visibles) →
  re-ejecutar búsqueda guardada → logout → re-login confirmando que el
  favorito y la búsqueda guardada **persisten** → login con credenciales
  incorrectas mostrando "Credenciales incorrectas" (confirma que el fix del
  interceptor 401 sigue funcionando) → `GET /api/bookmarks` sin token responde
  401. Cero errores de consola o HTTP durante toda la sesión.
- **[2026-07-06] `backend/requirements.txt` no era instalable desde cero.**
  Fijaba `pydantic==2.5.0` junto a `pydantic-settings==2.5.0` (que exige
  `pydantic>=2.7.0`) — conflicto de resolución de pip. Además, esas versiones
  viejas de `pydantic-core` no tienen wheel prebuilt para Python 3.14, así que
  ni siquiera compilaban desde código fuente. Esto explica las cuatro carpetas
  de venv distintas que había en `backend/` (intentos previos hasta encontrar
  una combinación que instalara). Se subieron `fastapi`, `uvicorn`,
  `sqlalchemy`, `pydantic`, `python-jose`, `httpx` y `python-dotenv` a
  versiones verificadas: instalación limpia en un venv nuevo, backend arranca,
  y los 6 tests de pytest pasan.
- **[2026-07-06] `README.md` creado** (no existía) para cerrar el último
  ítem pendiente del Definition of Done (`docs/SPEC.md §10`).
