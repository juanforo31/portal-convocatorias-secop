# Portal de Convocatorias Públicas

App web con autenticación donde un usuario se registra, explora
**convocatorias de contratación pública colombianas** consultadas **en vivo**
desde [datos.gov.co](https://www.datos.gov.co) (SECOP, dataset `p6dx-8zbt`),
las filtra, marca **favoritos** y guarda **búsquedas** para re-ejecutarlas.

> Reto AI-First · Fase 1 · Track DEV · Autor: Juan David Forero.
> Especificación funcional/técnica completa: [`docs/SPEC.md`](docs/SPEC.md).
> Proceso de construcción con IA (decisiones, bloqueos, prompts): [`SOUL.md`](SOUL.md).

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite · JWT (`python-jose`) · `httpx` como
  cliente del proxy a SECOP.
- **Frontend:** React + Vite + React Router · Tailwind v4.
- **Base de datos:** SQLite (`backend/portal.db`, se crea sola al arrancar).

## Prerrequisitos

- Python 3.11+ (probado con 3.14)
- Node.js 18+

## Levantar el backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # y cambia SECRET_KEY por un valor propio
uvicorn app.main:app --reload --port 8000
```

- API bajo `http://localhost:8000/api`.
- Docs interactivas (Swagger): `http://localhost:8000/docs`.

## Levantar el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

El frontend espera al backend en `http://localhost:8000/api` (ver
`frontend/src/App.jsx`), así que arranca primero el backend.

## Probar el flujo completo

1. Abre `http://localhost:5173/register` y crea una cuenta.
2. Explora convocatorias reales en Home, filtra por texto/entidad/ubicación/estado/fecha.
3. Marca una convocatoria como favorita (★) y entra a su detalle.
4. Aplica un filtro y usa **Guardar búsqueda**.
5. Ve a **Mi perfil**: verás tus favoritos y tu búsqueda guardada, con opción
   de **re-ejecutarla** o eliminarla.
6. Cierra sesión y vuelve a iniciar sesión: el favorito y la búsqueda guardada
   siguen ahí (persisten en `backend/portal.db`).

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Variables de entorno (`backend/.env`)

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Secreto para firmar los JWT — cámbialo, no uses el valor de ejemplo |
| `ALGORITHM` | Algoritmo JWT (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración del token |
| `DATABASE_URL` | Conexión SQLite (`sqlite:///./portal.db`) |
| `SECOP_BASE_URL` | Endpoint SODA del dataset SECOP usado |
| `SECOP_TIMEOUT` | Timeout (segundos) al consultar SECOP |
| `SECOP_CACHE_TTL` | TTL (segundos) del cache en memoria de respuestas SECOP |

## Estructura del repo

```
backend/   FastAPI: auth JWT, proxy a SECOP, bookmarks, saved-searches
frontend/  React + Vite: Home, Detail, Login/Register, Profile
docs/      SPEC.md (contrato funcional/técnico) y planes de implementación
SOUL.md    Trazabilidad del proceso de construcción con IA
CLAUDE.md  Contrato operativo para el agente (Hermes + LLM) sobre este repo
```
