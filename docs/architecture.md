# Architecture — Portal de Convocatorias Públicas

> Vista de arquitectura aislada para lectura rápida. El contrato funcional y
> técnico completo (con el detalle de cada endpoint y regla de negocio) vive en
> `docs/SPEC.md` — este documento no lo duplica, lo resume desde el ángulo de
> "cómo está armado el sistema".

## Diagrama de componentes

```
React (Vite) SPA  ──HTTP/JWT──▶  FastAPI backend  ──HTTP──▶  datos.gov.co SECOP (SODA)
                                      │
                                      ▼
                                  SQLite (usuarios, bookmarks, búsquedas guardadas)
```

- **Backend — FastAPI (Python).** REST bajo `/api`. JWT para auth. SQLAlchemy + SQLite.
  Cliente `httpx` para SECOP con cache en memoria (TTL ~60 s) y timeouts.
- **Frontend — React + Vite.** React Router, sesión con JWT en `localStorage`,
  llamadas solo al backend propio (nunca a SECOP directo).
- **DB — SQLite** (archivo local, cero infra).

## Estructura de carpetas

```
portal-convocatorias-secop/
  backend/
    app/
      main.py            # app FastAPI, CORS, routers, startup
      config.py          # settings (env)
      database.py        # engine, SessionLocal, Base
      models.py          # User, Bookmark, SavedSearch
      schemas.py         # Pydantic in/out
      security.py        # hashing bcrypt + JWT encode/decode
      deps.py            # get_db, get_current_user
      routers/           # auth.py, convocatorias.py, bookmarks.py, saved_searches.py
      services/secop.py  # cliente SODA + normalización + cache
    tests/                # pytest (bookmarks, saved-searches)
    requirements.txt
  frontend/
    src/
      pages/              # Home, Detail, Profile, Login, Register
      components/         # Header, EstadoStamp
      utils/              # estadoFamilia, normalize
  docs/
    SPEC.md               # contrato funcional/técnico
    architecture.md        # este documento
    plan.md                 # plan por días, planeado vs. real
    agentes.md               # roles de IA y modelos usados
    skills.md                 # capacidades/skills de Hermes usadas
    GUION-DEMO.md              # guion de la demo
  CLAUDE.md               # contrato operativo del agente
  SOUL.md                  # bitácora append-only de decisiones y bloqueos
  README.md
```

## Modelo de datos (SQLite)

Tres tablas — detalle completo de columnas en `docs/SPEC.md §6`:

- **`users`**: cuenta del usuario (email único, password hasheado con `bcrypt`).
- **`bookmarks`**: favorito de una convocatoria SECOP, con `UNIQUE(user_id, proceso_id)`
  y un **snapshot** de los campos clave (título, entidad, estado, url) para no
  depender de una re-consulta a SECOP al mostrarlo.
- **`saved_searches`**: un conjunto de filtros con nombre (`filters_json`),
  re-ejecutable desde el perfil.

## Contrato de API (resumen — completo en `docs/SPEC.md §7`)

| Grupo | Rutas | Auth |
|---|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | login/register públicas, `me` con JWT |
| Convocatorias (proxy SECOP) | `GET /api/convocatorias`, `GET /api/convocatorias/{proceso_id}` | pública |
| Bookmarks | `GET/POST /api/bookmarks`, `DELETE /api/bookmarks/{proceso_id}` | JWT requerido |
| Búsquedas guardadas | `GET/POST /api/saved-searches`, `DELETE /api/saved-searches/{id}` | JWT requerido |
| Salud | `GET /api/health` | pública |

El backend **nunca** expone SECOP directo al frontend: todo pasa por
`/api/convocatorias`, que traduce filtros del portal a parámetros SODA
(`$q`, `$where`, `$order`, `$limit`/`$offset`) y normaliza cada item al shape
estable `{proceso_id, referencia, titulo, descripcion, entidad, departamento,
ciudad, estado, modalidad, tipo_contrato, fecha_publicacion, precio_base, url}`.

## Decisiones de arquitectura y sus trade-offs

Registradas con su razonamiento completo en `SOUL.md § Decisiones y trade-offs`;
resumen:

| Decisión | Por qué | Trade-off asumido |
|---|---|---|
| SQLite en vez de PostgreSQL | Cero infra, suficiente para el MVP | Menos realista para producción |
| React + Vite | Más vistoso para la demo | Requiere build step vs. HTML plano |
| Proxy del backend a SECOP (frontend nunca llama directo) | Permite normalizar shape, manejar errores y cachear en un solo lugar | Un salto extra de red |
| Snapshot de campos en `bookmarks` | Mostrar el favorito sin re-consultar SECOP; `proceso_id` permite refrescar | Datos del snapshot pueden quedar desactualizados frente a SECOP |
| `bcrypt` directo en vez de `passlib.CryptContext` | `passlib` incompatible con Python 3.14 del entorno (ver `docs/agentes.md`) | Ninguno relevante — mismo contrato de funciones |

## Deuda técnica conocida (no bloquea el MVP)

Ver el detalle completo en `SOUL.md § Qué mejoraría o pediría` y
`AI_FIRST_RESUMEN_JuanDavidForero_2026-07-06.md §6`. Resumen: lógica de
"toggle de favorito" duplicada en 3 componentes, `Profile.jsx.fetchAll` sin
manejo de errores, `proceso_id` sin `encodeURIComponent` en rutas DELETE, y
ausencia total de tests de frontend.
