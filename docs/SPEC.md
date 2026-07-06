# Spec — Portal de Convocatorias Públicas

> Especificación funcional y técnica del producto. Es el contrato que el agente
> (Hermes + LLM) usa para generar e iterar el código. **Vive y se versiona junto
> al repo.** Cuando algo cambia, se cambia aquí primero y luego se regenera.

Reto AI-First · Fase 1 · Track DEV · Autor: Juan David Forero

---

## 1. Problema y objetivo

Los procesos de contratación pública en Colombia se publican en SECOP
(datos.gov.co), pero el portal oficial es difícil de filtrar y no permite a un
usuario **guardar** lo que le interesa ni **repetir búsquedas**. 

El **Portal de Convocatorias Públicas** resuelve esto: un usuario se registra,
explora convocatorias en vivo desde SECOP, las filtra por entidad / ubicación /
estado / fecha, **guarda favoritos** y **guarda búsquedas** para volver a ellas.

**Objetivo del MVP:** demostrar el flujo end-to-end completo:
`registro/login → browse de convocatorias reales desde datos.gov.co → bookmark persistido en DB`.

## 2. Alcance

### Dentro del MVP (obligatorio)
- Registro e inicio de sesión con **JWT**; cada usuario tiene su perfil.
- Listado y búsqueda de convocatorias consultadas **en vivo** a SECOP.
- Filtros: texto libre, entidad, departamento/ciudad, estado, modalidad, rango de fechas.
- Paginación de resultados.
- **Bookmarks** (favoritos): guardar / quitar / listar, persistidos por usuario.
- **Búsquedas guardadas**: guardar un conjunto de filtros con un nombre y re-ejecutarlo.
- Vista de perfil: datos del usuario + sus bookmarks + sus búsquedas guardadas.

### Fuera del MVP (solo si sobra tiempo)
- Notificaciones por nuevas convocatorias de una búsqueda guardada.
- Roles/administración. Exportar a CSV. Modo oscuro. i18n.
- Cache persistente de respuestas SECOP (en MVP basta cache en memoria con TTL corto).

### No-objetivos
- No replicamos toda la base de SECOP en local; consultamos en vivo.
- No escribimos código a mano: todo se genera vía Hermes + LLM (regla del reto).

## 3. Usuarios y casos de uso

- **Usuario ciudadano / proveedor**: busca convocatorias relevantes a su sector y
  ubicación, guarda las que le interesan y reusa búsquedas frecuentes.

Flujos clave (happy paths):
1. Registro → login → token JWT en cliente.
2. Browse con filtros → ver detalle de una convocatoria.
3. Marcar como favorito → aparece en perfil → quitar favorito.
4. Aplicar filtros → "Guardar búsqueda" con nombre → re-ejecutar desde perfil.

## 4. Fuente de datos — datos.gov.co SECOP (Socrata / SODA)

- **Dataset:** `p6dx-8zbt` → `https://www.datos.gov.co/resource/p6dx-8zbt.json`
- **Protocolo:** Socrata Open Data API (SODA). No requiere API key para consultas básicas.
  (Opcional: enviar un `X-App-Token` si se obtiene, para subir el rate limit.)
- **Verificado en vivo:** el dataset trae procesos de contratación con 51 campos.

### Campos relevantes (los que el portal usa)

| Campo SECOP | Uso en el portal |
|---|---|
| `id_del_proceso` | **Identificador único** de la convocatoria (clave para bookmarks) |
| `referencia_del_proceso` | Referencia legible mostrada al usuario |
| `nombre_del_procedimiento` | Título de la convocatoria |
| `descripci_n_del_procedimiento` | Descripción / detalle |
| `entidad` | Entidad contratante — **filtro** |
| `nit_entidad` | NIT de la entidad |
| `departamento_entidad`, `ciudad_entidad` | Ubicación — **filtros** |
| `estado_del_procedimiento` | Estado (ej. "Seleccionado", "Convocado") — **filtro** |
| `estado_resumen` | Estado resumido para mostrar como badge |
| `fase` | Fase del proceso |
| `modalidad_de_contratacion` | Modalidad — **filtro** |
| `tipo_de_contrato` | Tipo de contrato — **filtro opcional** |
| `fecha_de_publicacion_del` | Fecha de publicación — **filtro de rango** |
| `precio_base` | Valor base (string numérico; parsear a número) |
| `urlproceso` | Enlace al proceso oficial en SECOP |

> ⚠️ Notas reales del dataset:
> - Todos los valores llegan como **string** (incluidos números y fechas). El backend debe parsear `precio_base` a número y las fechas ISO.
> - `urlproceso` puede venir como objeto `{ "url": "..." }` — normalizarlo.
> - Hay registros con valores `"No Definido"` / `"No Adjudicado"`; tratarlos como vacío en la UI.

### Parámetros SODA que usaremos

| Necesidad | Parámetro SODA |
|---|---|
| Texto libre | `$q=<texto>` |
| Filtro exacto | `?estado_del_procedimiento=Convocado` (o cualquier campo) |
| Filtros compuestos / rangos de fecha | `$where=fecha_de_publicacion_del between '2025-01-01' and '2025-12-31'` |
| Orden | `$order=fecha_de_publicacion_del DESC` |
| Paginación | `$limit=<n>&$offset=<m>` |
| Selección de columnas | `$select=...` (para aligerar el payload) |

El backend **nunca** expone SECOP directo al frontend: lo envuelve en
`/api/convocatorias` traduciendo los filtros del portal a parámetros SODA. Así
controlamos shape de respuesta, errores y cache.

## 5. Arquitectura

```
React (Vite) SPA  ──HTTP/JWT──▶  FastAPI backend  ──HTTP──▶  datos.gov.co SECOP (SODA)
                                      │
                                      ▼
                                  SQLite (usuarios, bookmarks, búsquedas guardadas)
```

- **Backend — FastAPI (Python).** REST bajo `/api`. JWT para auth. SQLAlchemy + SQLite.
  Cliente `httpx` para SECOP con cache en memoria (TTL ~60 s) y timeouts.
- **Frontend — React + Vite.** React Router, manejo de sesión con JWT en
  `localStorage`, llamadas al backend (no a SECOP directo).
- **DB — SQLite** (archivo local; cero infra). Migración simple al arranque.

### Estructura de carpetas objetivo
```
portal-convocatorias-secop/
  backend/
    app/
      main.py            # app FastAPI, CORS, routers, startup
      config.py          # settings (env): SECRET_KEY, SECOP_DATASET, etc.
      database.py        # engine, SessionLocal, Base
      models.py          # User, Bookmark, SavedSearch
      schemas.py         # Pydantic in/out
      security.py        # hashing bcrypt + JWT encode/decode
      deps.py            # get_db, get_current_user
      routers/
        auth.py          # /api/auth/register, /login, /me
        convocatorias.py # /api/convocatorias (proxy SECOP + filtros)
        bookmarks.py     # /api/bookmarks CRUD
        saved_searches.py# /api/saved-searches CRUD
      services/
        secop.py         # cliente SODA + normalización + cache
    requirements.txt
    .env.example
  frontend/              # app Vite React
  docs/SPEC.md
  CLAUDE.md
  SOUL.md
  README.md
```

## 6. Modelo de datos (SQLite)

```
users
  id            INTEGER PK
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  full_name     TEXT
  created_at    TEXT (ISO)

bookmarks                      -- favorito de una convocatoria SECOP
  id             INTEGER PK
  user_id        INTEGER FK -> users.id
  proceso_id     TEXT NOT NULL    -- = id_del_proceso de SECOP
  titulo         TEXT             -- snapshot de nombre_del_procedimiento
  entidad        TEXT             -- snapshot
  estado         TEXT             -- snapshot
  url            TEXT             -- snapshot urlproceso
  created_at     TEXT (ISO)
  UNIQUE(user_id, proceso_id)     -- no duplicar el mismo favorito

saved_searches                 -- conjunto de filtros nombrado
  id          INTEGER PK
  user_id     INTEGER FK -> users.id
  name        TEXT NOT NULL
  filters_json TEXT NOT NULL     -- JSON con los filtros aplicados
  created_at  TEXT (ISO)
```

> Se guarda un **snapshot** de los campos clave en `bookmarks` para mostrar el
> favorito aunque el registro cambie en SECOP; el `proceso_id` permite refrescar.

## 7. Contrato de API (REST, prefijo `/api`)

Todas las respuestas son JSON. Errores con shape `{"detail": "<mensaje>"}`.

### Auth
| Método | Ruta | Body / Notas | Respuestas |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, full_name}` | 201 user · 409 email existe · 422 validación |
| POST | `/api/auth/login` | `{email, password}` | 200 `{access_token, token_type}` · 401 credenciales |
| GET | `/api/auth/me` | Header `Authorization: Bearer <jwt>` | 200 user · 401 sin/invalid token |

### Convocatorias (proxy SECOP)
| Método | Ruta | Query | Respuestas |
|---|---|---|---|
| GET | `/api/convocatorias` | `q, entidad, departamento, ciudad, estado, modalidad, fecha_desde, fecha_hasta, page, page_size, order` | 200 `{items:[...], page, page_size, total?}` · 502 si SECOP falla · 504 timeout |
| GET | `/api/convocatorias/{proceso_id}` | — | 200 detalle · 404 no existe |

> El backend normaliza cada item SECOP a un shape estable del portal:
> `{proceso_id, referencia, titulo, descripcion, entidad, departamento, ciudad, estado, modalidad, tipo_contrato, fecha_publicacion, precio_base, url}`.

### Bookmarks (requieren JWT)
| Método | Ruta | Body | Respuestas |
|---|---|---|---|
| GET | `/api/bookmarks` | — | 200 lista del usuario |
| POST | `/api/bookmarks` | `{proceso_id, titulo, entidad, estado, url}` | 201 · 409 ya existe |
| DELETE | `/api/bookmarks/{proceso_id}` | — | 204 · 404 no existe |

### Búsquedas guardadas (requieren JWT)
| Método | Ruta | Body | Respuestas |
|---|---|---|---|
| GET | `/api/saved-searches` | — | 200 lista |
| POST | `/api/saved-searches` | `{name, filters}` | 201 |
| DELETE | `/api/saved-searches/{id}` | — | 204 · 404 |

### Salud
| GET | `/api/health` | — | 200 `{"status":"ok"}` |

## 8. Seguridad
- Passwords con **bcrypt** (passlib). Nunca se almacenan en claro.
- JWT firmado con `SECRET_KEY` (env), expiración ~60 min, algoritmo HS256.
- Endpoints de bookmarks/saved-searches exigen token válido; un usuario solo ve lo suyo.
- CORS limitado al origen del frontend en dev (`http://localhost:5173`).
- Secretos (SECRET_KEY, app token SECOP) solo en `.env`, nunca commiteados. `.env.example` documenta las variables.

## 9. Frontend — pantallas mínimas
1. **Login / Registro** — formularios, manejo de error, guardado de token.
2. **Browse** — barra de búsqueda + panel de filtros + lista paginada de tarjetas;
   cada tarjeta con botón favorito y enlace al proceso oficial; botón "Guardar búsqueda".
3. **Detalle de convocatoria** — todos los campos relevantes + acción favorito.
4. **Perfil** — datos del usuario, lista de favoritos, lista de búsquedas guardadas (re-ejecutables).

## 10. Criterios de aceptación (Definition of Done del MVP)
- [x] Puedo registrarme y luego iniciar sesión; recibo un JWT.
- [x] Sin token, los endpoints protegidos responden 401.
- [x] El browse muestra convocatorias **reales** traídas en vivo de datos.gov.co.
- [x] Los filtros (texto, entidad, ubicación, estado, fecha) cambian los resultados.
- [x] Puedo marcar un favorito y **persiste** tras recargar / re-login (está en la DB).
- [x] Puedo guardar una búsqueda y re-ejecutarla desde el perfil.
- [x] `README.md` permite levantar backend + frontend en local sin pasos ocultos.
- [x] `SOUL.md` documenta proceso, decisiones, prompts clave y bloqueos.

> Verificado en vivo el 2026-07-06 con un recorrido completo en navegador real
> (ver entrada correspondiente en `SOUL.md`) y con un `pip install` limpio del
> `README.md` en un venv nuevo (`pytest`: 6/6 passed).

## 11. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Rate limit / lentitud de SECOP | Cache en memoria con TTL, timeouts, `$limit` razonable, mensaje de error claro |
| Campos SECOP inconsistentes (`"No Definido"`, urlproceso objeto) | Capa de normalización en `services/secop.py` con tests |
| Créditos LLM limitados | Usar modelo barato para scaffolding y reservar el potente para pasos difíciles (ver CLAUDE.md) |
| Tiempo corto (5 días) | Construir el flujo end-to-end delgado primero; features extra solo si sobra |

## 12. Plan de construcción (por días)
- **Día 1:** este spec + CLAUDE.md + repo + SOUL.md inicial + exploración SECOP.
- **Día 2:** backend — DB + auth JWT + `/api/convocatorias` (proxy SECOP con filtros).
- **Día 3:** backend — bookmarks + saved-searches. Frontend — login + browse con filtros.
- **Día 4:** frontend — favoritos + perfil + detalle. Integración end-to-end.
- **Día 5:** pruebas manuales, README, cierre de SOUL.md, ensayo de demo (5–7 min).
