# Cierre Día 4 — bookmarks/perfil/UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la brecha entre `docs/SPEC.md` y la implementación real: corregir
dos desajustes de contrato de API (bookmarks, saved-searches), completar el
frontend (filtros, paginación, favoritos, perfil) y aplicar la dirección visual
"gaceta/expediente oficial" aprobada en
`docs/superpowers/specs/2026-07-02-cierre-dia4-frontend-design.md`.

**Architecture:** Backend FastAPI sin cambios de arquitectura — solo dos rutas
ajustadas a su contrato documentado, con tests pytest nuevos (no existía
infraestructura de tests). Frontend React sin cambios de arquitectura — se
instala Tailwind v4 (nunca estuvo realmente instalado pese a que el código ya
tenía clases Tailwind muertas), se agregan 2 componentes reutilizables
(`Header`, `EstadoStamp`), 2 utils puros (`estadoFamilia`, `normalize`), una
página nueva (`Profile`) y se reescriben `Home`/`Detail`/`Login`/`Register`
para consumir bookmarks/saved-searches y aplicar la paleta/tipografía.

**Tech Stack:** FastAPI + SQLAlchemy + SQLite (backend, sin cambios) · pytest +
httpx TestClient (tests backend, nuevo) · React 19 + Vite + react-router-dom 7
+ axios (frontend, sin cambios) · Tailwind CSS v4 + `@tailwindcss/vite`
(frontend, nueva dependencia — visto bueno del usuario obtenido en
brainstorming) · Google Fonts (Roboto Slab, Inter, IBM Plex Mono), sin paquete
npm adicional (import por `@import url(...)` en CSS).

## Global Constraints

- Prefijo de API: todas las rutas bajo `/api` (`CLAUDE.md`).
- Identificador de convocatoria = `proceso_id` (campo `id_del_proceso` de
  SECOP) — es la clave de un bookmark (`CLAUDE.md`).
- El frontend nunca llama a SECOP directo, siempre pasa por
  `/api/convocatorias` (`CLAUDE.md`).
- Valores `"No Definido"` / `"No Adjudicado"` se tratan como vacío en la UI
  (`docs/SPEC.md §4`).
- Endpoints de bookmarks/saved-searches exigen JWT válido; un usuario solo ve
  lo suyo (`docs/SPEC.md §8`).
- CORS limitado a `http://localhost:5173` (ya configurado en `main.py`, no
  tocar salvo que un paso lo requiera explícitamente).
- No se commitea `.env`, `*.db`, `node_modules/`, `__pycache__/` (`.gitignore`
  ya los cubre).
- Sin framework de tests de frontend instalado (no hay vitest/RTL en
  `package.json` y no se agrega en este plan — no fue parte del diseño
  aprobado). La verificación de frontend es manual en navegador por tarea, más
  `npm run build` como smoke test de sintaxis para tareas que crean
  archivos aún no montados en una página.
- Registrar en `SOUL.md` cualquier bloqueo real o decisión no trivial que
  aparezca durante la ejecución, en el momento en que ocurre (preferencia
  explícita del usuario, ver memoria del agente).

---

## Task 1: Backend — `DELETE /api/bookmarks/{proceso_id}`

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_bookmarks.py`
- Modify: `backend/app/routers/bookmarks.py:44-58`
- Modify: `backend/requirements.txt`

**Interfaces:**
- Consumes: `app.main.app` (FastAPI instance), `app.deps.get_db`,
  `app.models.User`/`Bookmark`, `app.schemas.BookmarkCreate`/`BookmarkOut` —
  todos ya existentes, sin cambios de firma.
- Produces: fixtures `client` (TestClient) y `auth_headers` (dict con header
  `Authorization`) en `backend/tests/conftest.py`, reutilizados por Task 2 y
  cualquier test backend futuro.

- [ ] **Step 1: Agregar pytest a requirements.txt**

Editar `backend/requirements.txt`, agregar al final:
```
pytest==8.3.4
```

- [ ] **Step 2: Instalar dependencias**

Run: `cd backend && venv_clean/bin/pip install -r requirements.txt`
Expected: instala `pytest` sin errores (el resto ya está instalado en
`venv_clean`, el entorno que corre el servidor activo).

- [ ] **Step 3: Crear `backend/tests/__init__.py` vacío**

```python
```

- [ ] **Step 4: Crear `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base
from app.deps import get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "Secret123",
            "full_name": "Test User",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "Secret123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

- [ ] **Step 5: Escribir el test que falla (contrato nuevo: DELETE por proceso_id)**

Crear `backend/tests/test_bookmarks.py`:
```python
def test_create_and_delete_bookmark_by_proceso_id(client, auth_headers):
    create_resp = client.post(
        "/api/bookmarks",
        json={
            "proceso_id": "CO1.REQ.10236807",
            "titulo": "Contrato de Prestación de Servicios",
            "entidad": "UNIVERSIDAD PEDAGÓGICA NACIONAL",
            "estado": "En aprobación",
            "url": "https://community.secop.gov.co/STS/Users/Login/Index",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    list_resp = client.get("/api/bookmarks", headers=auth_headers)
    assert len(list_resp.json()) == 1

    delete_resp = client.delete(
        "/api/bookmarks/CO1.REQ.10236807", headers=auth_headers
    )
    assert delete_resp.status_code == 204

    list_after = client.get("/api/bookmarks", headers=auth_headers)
    assert list_after.json() == []


def test_delete_bookmark_not_found(client, auth_headers):
    resp = client.delete("/api/bookmarks/NO-EXISTE", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_bookmark_requires_auth(client):
    resp = client.delete("/api/bookmarks/CO1.REQ.10236807")
    assert resp.status_code == 401
```

- [ ] **Step 6: Correr los tests, confirmar que fallan**

Run: `cd backend && venv_clean/bin/pytest tests/test_bookmarks.py -v`
Expected: `test_create_and_delete_bookmark_by_proceso_id` FAIL. La ruta actual
es `DELETE /api/bookmarks/{bookmark_id}` con `bookmark_id: int`; al recibir
`"CO1.REQ.10236807"` (no es un entero) FastAPI responde `422` en vez del `204`
que el test espera.

- [ ] **Step 7: Corregir la ruta en `bookmarks.py`**

Reemplazar en `backend/app/routers/bookmarks.py` (líneas 44-58):
```python
@router.delete("/{proceso_id}", status_code=204)
def delete_bookmark(
    proceso_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = (
        db.query(Bookmark)
        .filter(
            Bookmark.proceso_id == proceso_id,
            Bookmark.user_id == current_user.id,
        )
        .first()
    )
    if not bookmark:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    db.delete(bookmark)
    db.commit()
```

- [ ] **Step 8: Correr los tests, confirmar que pasan**

Run: `cd backend && venv_clean/bin/pytest tests/test_bookmarks.py -v`
Expected: 3 passed.

- [ ] **Step 9: Commit**

```bash
git add backend/requirements.txt backend/tests/__init__.py backend/tests/conftest.py backend/tests/test_bookmarks.py backend/app/routers/bookmarks.py
git commit -m "fix: DELETE /api/bookmarks/{proceso_id} en vez de ID interno (contrato SPEC.md §7)"
```

---

## Task 2: Backend — `POST /api/saved-searches` con `filters` como objeto

**Files:**
- Modify: `backend/app/schemas.py:68-77`
- Modify: `backend/app/routers/saved_searches.py`
- Create: `backend/tests/test_saved_searches.py`

**Interfaces:**
- Consumes: fixtures `client`/`auth_headers` de `backend/tests/conftest.py`
  (Task 1).
- Produces: `SavedSearchCreate.filters: dict`, `SavedSearchOut.filters: dict`
  — nuevo shape que el frontend (Task 7, botón "Guardar búsqueda") y (Task 9,
  Perfil) consumen directamente, sin serializar/deserializar JSON a mano.

- [ ] **Step 1: Escribir el test que falla**

Crear `backend/tests/test_saved_searches.py`:
```python
def test_create_saved_search_returns_filters_as_dict(client, auth_headers):
    resp = client.post(
        "/api/saved-searches",
        json={
            "name": "Salud en Antioquia",
            "filters": {"q": "salud", "departamento": "Antioquia"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Salud en Antioquia"
    assert body["filters"] == {"q": "salud", "departamento": "Antioquia"}


def test_list_saved_searches_returns_filters_as_dict(client, auth_headers):
    client.post(
        "/api/saved-searches",
        json={"name": "Test", "filters": {"estado": "Convocado"}},
        headers=auth_headers,
    )
    resp = client.get("/api/saved-searches", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["filters"] == {"estado": "Convocado"}


def test_delete_saved_search(client, auth_headers):
    create_resp = client.post(
        "/api/saved-searches",
        json={"name": "Borrar", "filters": {}},
        headers=auth_headers,
    )
    search_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/api/saved-searches/{search_id}", headers=auth_headers
    )
    assert delete_resp.status_code == 204
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `cd backend && venv_clean/bin/pytest tests/test_saved_searches.py -v`
Expected: FAIL con 422 (el schema actual exige `filters_json: str`, no
`filters: dict`).

- [ ] **Step 3: Cambiar los schemas**

Reemplazar en `backend/app/schemas.py` (líneas 68-77, sección `# --- Saved Searches ---`):
```python
# --- Saved Searches ---
class SavedSearchCreate(BaseModel):
    name: str
    filters: dict

class SavedSearchOut(BaseModel):
    id: int
    name: str
    filters: dict
    created_at: str
```

(Se quita `model_config = {"from_attributes": True}` de `SavedSearchOut`: ya
no se construye por atributos del modelo ORM directamente, porque la columna
DB sigue siendo `filters_json: str` — el router arma el objeto de respuesta a
mano, ver Step 4.)

- [ ] **Step 4: Reescribir el router**

Reemplazar `backend/app/routers/saved_searches.py` completo:
```python
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import SavedSearch, User
from app.schemas import SavedSearchCreate, SavedSearchOut

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])


def _to_out(search: SavedSearch) -> SavedSearchOut:
    return SavedSearchOut(
        id=search.id,
        name=search.name,
        filters=json.loads(search.filters_json),
        created_at=search.created_at,
    )


@router.get("", response_model=list[SavedSearchOut])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    searches = (
        db.query(SavedSearch).filter(SavedSearch.user_id == current_user.id).all()
    )
    return [_to_out(s) for s in searches]


@router.post("", response_model=SavedSearchOut, status_code=201)
def create_saved_search(
    payload: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = SavedSearch(
        user_id=current_user.id,
        name=payload.name,
        filters_json=json.dumps(payload.filters),
    )
    db.add(search)
    db.commit()
    db.refresh(search)
    return _to_out(search)


@router.delete("/{search_id}", status_code=204)
def delete_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search = (
        db.query(SavedSearch)
        .filter(SavedSearch.id == search_id, SavedSearch.user_id == current_user.id)
        .first()
    )
    if not search:
        raise HTTPException(status_code=404, detail="Búsqueda guardada no encontrada")
    db.delete(search)
    db.commit()
```

- [ ] **Step 5: Correr los tests, confirmar que pasan**

Run: `cd backend && venv_clean/bin/pytest tests/ -v`
Expected: 6 passed (3 de Task 1 + 3 de este task).

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas.py backend/app/routers/saved_searches.py backend/tests/test_saved_searches.py
git commit -m "fix: POST/GET /api/saved-searches usa filters como objeto (contrato SPEC.md §7)"
```

---

## Task 3: Frontend — instalar y configurar Tailwind v4 + tokens de diseño

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: clases utilitarias Tailwind `bg-paper`, `text-ink-navy`,
  `text-gold`, `border-gold`, `text-stamp-green`, `border-stamp-green`,
  `text-stamp-red`, `border-stamp-red`, `text-stamp-grey`, `border-stamp-grey`,
  `font-display`, `font-sans`, `font-mono` — consumidas por todas las tareas
  de frontend siguientes (4 a 10).

- [ ] **Step 1: Agregar Tailwind a `package.json`**

En `frontend/package.json`, agregar a `devDependencies`:
```json
"tailwindcss": "^4.1.0",
"@tailwindcss/vite": "^4.1.0"
```

- [ ] **Step 2: Instalar**

Run: `cd frontend && npm install`
Expected: instala sin errores, `node_modules/tailwindcss` y
`node_modules/@tailwindcss/vite` existen.

- [ ] **Step 3: Registrar el plugin en Vite**

Reemplazar `frontend/vite.config.js` completo:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 4: Definir tokens y tipografía**

Reemplazar `frontend/src/index.css` completo:
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@theme {
  --color-paper: #EDEAE0;
  --color-ink-navy: #16233B;
  --color-gold: #B8862E;
  --color-stamp-green: #2F6E4F;
  --color-stamp-red: #A13D2C;
  --color-stamp-grey: #6E6A5E;

  --font-display: "Roboto Slab", serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background-color: var(--color-paper);
  color: var(--color-ink-navy);
  font-family: var(--font-sans);
}

#root { min-height: 100vh; }
```

- [ ] **Step 5: Verificar en navegador**

Run: `cd frontend && npm run dev` (si ya hay una instancia corriendo en 5173,
detenerla primero: `kill $(lsof -t -i:5173)`)
Abrir `http://localhost:5173/login` en el navegador.
Expected: fondo de la página en tono papel hueso (`#EDEAE0`), no blanco puro
ni el gris `#f9fafb` anterior. Confirmar con el inspector (`getComputedStyle
(document.body).backgroundColor` en la consola debe dar `rgb(237, 234, 224)`).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/index.css
git commit -m "feat: instalar Tailwind v4 y definir tokens de la dirección visual gaceta/expediente"
```

---

## Task 4: Frontend — utils `estadoFamilia` y `normalize`

**Files:**
- Create: `frontend/src/utils/estadoFamilia.js`
- Create: `frontend/src/utils/normalize.js`

**Interfaces:**
- Produces: `estadoFamilia(estado: string): 'green' | 'red' | 'grey'`,
  `displayValue(value: string | null | undefined, fallback?: string): string`
  — consumidos por `EstadoStamp` (Task 5) y por `Home`/`Detail`/`Profile`
  (Tasks 7-9) para mostrar campos crudos de SECOP.

- [ ] **Step 1: Crear `estadoFamilia.js`**

```javascript
const GREEN_STATES = new Set(['Convocado', 'Adjudicado', 'Celebrado', 'Activo'])
const RED_STATES = new Set(['Borrador', 'En aprobación', 'Presentación de oferta'])

export function estadoFamilia(estado) {
  if (GREEN_STATES.has(estado)) return 'green'
  if (RED_STATES.has(estado)) return 'red'
  return 'grey'
}
```

- [ ] **Step 2: Crear `normalize.js`**

```javascript
const EMPTY_VALUES = new Set(['No Definido', 'No Adjudicado', '', null, undefined])

export function displayValue(value, fallback = '—') {
  return EMPTY_VALUES.has(value) ? fallback : value
}
```

- [ ] **Step 3: Verificar en consola del navegador**

Con `npm run dev` corriendo, abrir `http://localhost:5173` en el navegador,
abrir la consola de devtools y ejecutar:
```javascript
const mod = await import('/src/utils/normalize.js')
mod.displayValue('No Definido')  // "—"
mod.displayValue('Bogotá')       // "Bogotá"
const mod2 = await import('/src/utils/estadoFamilia.js')
mod2.estadoFamilia('Convocado')  // "green"
mod2.estadoFamilia('Borrador')   // "red"
mod2.estadoFamilia('Cualquier otra cosa')  // "grey"
```
Expected: los 5 valores coinciden con los comentarios de arriba (Vite sirve
módulos ES nativos en dev, el import dinámico funciona directo en consola).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/estadoFamilia.js frontend/src/utils/normalize.js
git commit -m "feat: utils estadoFamilia y normalize para valores de SECOP"
```

---

## Task 5: Frontend — componentes `EstadoStamp` y `Header`

**Files:**
- Create: `frontend/src/components/EstadoStamp.jsx`
- Create: `frontend/src/components/Header.jsx`

**Interfaces:**
- Consumes: `estadoFamilia`, `displayValue` de `frontend/src/utils/` (Task 4).
- Produces: `<EstadoStamp estado={string} />`, `<Header />` (sin props) —
  consumidos por `Home`, `Detail`, `Profile` (Tasks 6, 7, 8, 9).

- [ ] **Step 1: Crear `EstadoStamp.jsx`**

```jsx
import { estadoFamilia } from '../utils/estadoFamilia'
import { displayValue } from '../utils/normalize'

const FAMILY_STYLES = {
  green: 'border-stamp-green text-stamp-green',
  red: 'border-stamp-red text-stamp-red',
  grey: 'border-stamp-grey text-stamp-grey',
}

export default function EstadoStamp({ estado }) {
  const label = displayValue(estado, 'SIN ESTADO')
  const family = estadoFamilia(estado)
  return (
    <span
      className={`inline-block -rotate-2 rounded border-2 border-dashed px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide ${FAMILY_STYLES[family]}`}
    >
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Crear `Header.jsx`**

```jsx
import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    window.location.reload()
  }

  return (
    <header className="border-b-4 border-gold bg-paper px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <span className="font-display text-xl font-bold uppercase tracking-wide text-ink-navy">
          Portal de Convocatorias
        </span>
        <nav className="flex items-center gap-6 font-sans text-sm">
          <Link to="/" className="text-ink-navy hover:text-gold">
            Convocatorias
          </Link>
          <Link to="/profile" className="text-ink-navy hover:text-gold">
            Mi perfil
          </Link>
          <button onClick={handleLogout} className="text-stamp-red hover:underline">
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npm run build`
Expected: build exitoso, sin errores de sintaxis JSX ni de imports. (Estos dos
componentes todavía no están montados en ninguna página — se verifican
visualmente cuando se integran en Tasks 6-9.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/EstadoStamp.jsx frontend/src/components/Header.jsx
git commit -m "feat: componentes EstadoStamp (sello de estado) y Header"
```

---

## Task 6: Frontend — `App.jsx` (interceptor 401, guard de Detail, ruta /profile) + `Profile.jsx` básico

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/Profile.jsx`

**Interfaces:**
- Consumes: `Header` (Task 5).
- Produces: ruta `/profile` funcional (datos de usuario únicamente por ahora;
  Task 9 la extiende con bookmarks/saved-searches). Interceptor de respuesta
  axios que limpia el token y redirige a `/login` en cualquier `401`.

- [ ] **Step 1: Crear `Profile.jsx` básico**

```jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from '../components/Header.jsx'

export default function Profile() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    axios.get('/auth/me').then((res) => setUser(res.data))
  }, [])

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Mi perfil</h1>
        {user && (
          <div className="mt-4 font-sans text-ink-navy">
            <p><span className="font-semibold">Nombre:</span> {user.full_name || '—'}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `App.jsx`**

Reemplazar `frontend/src/App.jsx` completo:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Profile from './pages/Profile.jsx'
import { useEffect, useState } from 'react'
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:8000/api'

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to="/login" />} />
      <Route path="/login" element={!isLoggedIn ? <Login onLogin={() => setIsLoggedIn(true)} /> : <Navigate to="/" />} />
      <Route path="/register" element={!isLoggedIn ? <Register onRegister={() => setIsLoggedIn(true)} /> : <Navigate to="/" />} />
      <Route path="/convocatoria/:procesoId" element={isLoggedIn ? <Detail /> : <Navigate to="/login" />} />
      <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 3: Verificar en navegador**

Con backend (`uvicorn`) y `npm run dev` corriendo: login con un usuario de
prueba → confirmar redirección a `/` → navegar manualmente a
`http://localhost:5173/profile` → confirmar que carga el Header y muestra
nombre/email del usuario logueado. Luego, en la consola del navegador, correr
`localStorage.removeItem('token')` y recargar `/profile` → confirmar
redirección a `/login`. Por último, navegar directo a
`http://localhost:5173/convocatoria/CO1.REQ.10236807` sin sesión → confirmar
redirección a `/login`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/Profile.jsx
git commit -m "feat: ruta /profile, guard de auth en Detail, interceptor 401 global"
```

---

## Task 7: Frontend — `Home.jsx` (filtros completos, paginación, favoritos, guardar búsqueda, visual)

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

**Interfaces:**
- Consumes: `Header` (Task 5), `EstadoStamp` (Task 5), `displayValue` (Task 4),
  `GET /convocatorias`, `GET /bookmarks`, `POST /bookmarks`,
  `DELETE /bookmarks/{proceso_id}` (Task 1), `POST /saved-searches` con
  `{name, filters}` (Task 2).

- [ ] **Step 1: Reescribir `Home.jsx` completo**

```jsx
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

const FILTER_KEYS = [
  'q', 'entidad', 'departamento', 'ciudad', 'estado', 'modalidad',
  'fecha_desde', 'fecha_hasta',
]

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => {
    const initial = { page: 1, page_size: 10 }
    FILTER_KEYS.forEach((key) => {
      initial[key] = searchParams.get(key) || ''
    })
    return initial
  })
  const [convocatorias, setConvocatorias] = useState([])
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const fetchConvocatorias = async () => {
    setLoading(true)
    try {
      const params = { page: filters.page, page_size: filters.page_size }
      FILTER_KEYS.forEach((key) => {
        if (filters[key]) params[key] = filters[key]
      })
      const response = await axios.get('/convocatorias', { params })
      setConvocatorias(response.data.items)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchBookmarks = async () => {
    try {
      const res = await axios.get('/bookmarks')
      setBookmarkedIds(new Set(res.data.map((b) => b.proceso_id)))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const params = {}
    FILTER_KEYS.forEach((key) => {
      if (filters[key]) params[key] = filters[key]
    })
    setSearchParams(params)
    fetchConvocatorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => {
    fetchBookmarks()
  }, [])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const goToPage = (delta) => {
    setFilters((prev) => ({ ...prev, page: prev.page + delta }))
  }

  const toggleBookmark = async (item) => {
    const isBookmarked = bookmarkedIds.has(item.proceso_id)
    try {
      if (isBookmarked) {
        await axios.delete(`/bookmarks/${item.proceso_id}`)
      } else {
        await axios.post('/bookmarks', {
          proceso_id: item.proceso_id,
          titulo: item.titulo,
          entidad: item.entidad,
          estado: item.estado,
          url: item.url,
        })
      }
    } catch (err) {
      const status = err.response?.status
      if (status !== 409 && status !== 404) {
        console.error(err)
        return
      }
    }
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (isBookmarked) next.delete(item.proceso_id)
      else next.add(item.proceso_id)
      return next
    })
  }

  const guardarBusqueda = async () => {
    const name = window.prompt('Nombre para esta búsqueda:')
    if (!name) return
    const activeFilters = {}
    FILTER_KEYS.forEach((key) => {
      if (filters[key]) activeFilters[key] = filters[key]
    })
    try {
      await axios.post('/saved-searches', { name, filters: activeFilters })
      window.alert('Búsqueda guardada. Puedes re-ejecutarla desde tu perfil.')
    } catch (err) {
      console.error(err)
      window.alert('No se pudo guardar la búsqueda.')
    }
  }

  const canGoPrev = filters.page > 1
  const canGoNext = convocatorias.length === filters.page_size

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Convocatorias</h1>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            placeholder="Buscar texto..."
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            className="col-span-2 rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm md:col-span-4"
          />
          <input
            placeholder="Entidad"
            value={filters.entidad}
            onChange={(e) => updateFilter('entidad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Departamento"
            value={filters.departamento}
            onChange={(e) => updateFilter('departamento', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Ciudad"
            value={filters.ciudad}
            onChange={(e) => updateFilter('ciudad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Estado"
            value={filters.estado}
            onChange={(e) => updateFilter('estado', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <input
            placeholder="Modalidad"
            value={filters.modalidad}
            onChange={(e) => updateFilter('modalidad', e.target.value)}
            className="rounded border border-ink-navy/30 bg-white px-3 py-2 font-sans text-sm"
          />
          <label className="flex items-center gap-2 font-sans text-sm text-ink-navy">
            Desde
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(e) => updateFilter('fecha_desde', e.target.value)}
              className="rounded border border-ink-navy/30 bg-white px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-ink-navy">
            Hasta
            <input
              type="date"
              value={filters.fecha_hasta}
              onChange={(e) => updateFilter('fecha_hasta', e.target.value)}
              className="rounded border border-ink-navy/30 bg-white px-2 py-1"
            />
          </label>
        </div>

        <button
          onClick={guardarBusqueda}
          className="mt-3 rounded border-2 border-gold px-4 py-1.5 font-sans text-sm font-medium text-gold hover:bg-gold hover:text-paper"
        >
          Guardar búsqueda
        </button>

        {loading ? (
          <p className="mt-6 font-sans text-ink-navy">Cargando...</p>
        ) : (
          <div className="mt-6 space-y-3">
            {convocatorias.map((c) => (
              <div
                key={c.proceso_id}
                className="border-l-4 border-ink-navy/20 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs text-ink-navy/60">{c.proceso_id}</span>
                  <div className="flex items-center gap-2">
                    <EstadoStamp estado={c.estado} />
                    <button
                      onClick={() => toggleBookmark(c)}
                      aria-label={bookmarkedIds.has(c.proceso_id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      className={`text-xl ${bookmarkedIds.has(c.proceso_id) ? 'text-gold' : 'text-ink-navy/30'}`}
                    >
                      ★
                    </button>
                  </div>
                </div>
                <Link
                  to={`/convocatoria/${c.proceso_id}`}
                  className="font-display text-lg font-semibold text-ink-navy hover:text-gold"
                >
                  {c.titulo}
                </Link>
                <p className="font-sans text-sm text-ink-navy/80">
                  {displayValue(c.entidad)} · {displayValue(c.ciudad)}, {displayValue(c.departamento)}
                </p>
                {c.precio_base != null && (
                  <p className="font-mono text-sm text-ink-navy/70">
                    ${c.precio_base.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => goToPage(-1)}
            disabled={!canGoPrev}
            className="rounded border border-ink-navy/30 px-4 py-1.5 font-sans text-sm text-ink-navy disabled:opacity-30"
          >
            ← Anterior
          </button>
          <button
            onClick={() => goToPage(1)}
            disabled={!canGoNext}
            className="rounded border border-ink-navy/30 px-4 py-1.5 font-sans text-sm text-ink-navy disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar en navegador (recorrido manual)**

Con backend y `npm run dev` corriendo, login, y en `http://localhost:5173/`:
1. Confirmar que aparece el Header con "Convocatorias" / "Mi perfil" / "Salir".
2. Confirmar que las tarjetas muestran el sello de estado (`EstadoStamp`)
   rotado, el radicado en monoespaciada, y que un estado como `"No Definido"`
   en cualquier campo mostrado aparece como `—`.
3. Escribir `salud` en el buscador → confirmar que la URL cambia a
   `?q=salud` y que la lista se filtra.
4. Agregar `departamento=Antioquia` → confirmar que la URL y los resultados
   reflejan ambos filtros combinados.
5. Click en ★ de una tarjeta → confirmar que se pone dorado (favorito
   agregado). Recargar la página (F5) → confirmar que sigue marcada (persiste
   via `GET /bookmarks`).
6. Click "Siguiente" → confirmar que cambia la página y "Anterior" se habilita.
7. Click "Guardar búsqueda", poner un nombre → confirmar alerta de éxito.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: Home con filtros completos, paginación, favoritos y guardar búsqueda"
```

---

## Task 8: Frontend — `Detail.jsx` (favorito, visual, normalize)

**Files:**
- Modify: `frontend/src/pages/Detail.jsx`

**Interfaces:**
- Consumes: `Header`, `EstadoStamp` (Task 5), `displayValue` (Task 4),
  `GET /convocatorias/{proceso_id}`, `GET /bookmarks`, `POST /bookmarks`,
  `DELETE /bookmarks/{proceso_id}` (Task 1).

- [ ] **Step 1: Reescribir `Detail.jsx` completo**

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

export default function Detail() {
  const { procesoId } = useParams()
  const [convocatoria, setConvocatoria] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    axios.get(`/convocatorias/${procesoId}`)
      .then((res) => setConvocatoria(res.data))
      .finally(() => setLoading(false))

    axios.get('/bookmarks').then((res) => {
      setIsBookmarked(res.data.some((b) => b.proceso_id === procesoId))
    })
  }, [procesoId])

  const toggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await axios.delete(`/bookmarks/${procesoId}`)
      } else {
        await axios.post('/bookmarks', {
          proceso_id: procesoId,
          titulo: convocatoria.titulo,
          entidad: convocatoria.entidad,
          estado: convocatoria.estado,
          url: convocatoria.url,
        })
      }
    } catch (err) {
      const status = err.response?.status
      if (status !== 409 && status !== 404) {
        console.error(err)
        return
      }
    }
    setIsBookmarked((prev) => !prev)
  }

  if (loading) return <p className="p-6 font-sans">Cargando...</p>
  if (!convocatoria) return <p className="p-6 font-sans">No encontrado</p>

  const campo = (label, value) => (
    <p className="font-sans text-sm text-ink-navy">
      <span className="font-semibold">{label}:</span> {displayValue(value)}
    </p>
  )

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link to="/" className="font-sans text-sm text-gold">&larr; Volver</Link>
        <div className="mt-4 flex items-start justify-between gap-3">
          <span className="font-mono text-xs text-ink-navy/60">{convocatoria.proceso_id}</span>
          <div className="flex items-center gap-2">
            <EstadoStamp estado={convocatoria.estado} />
            <button
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              className={`text-2xl ${isBookmarked ? 'text-gold' : 'text-ink-navy/30'}`}
            >
              ★
            </button>
          </div>
        </div>
        <h1 className="mt-2 font-display text-xl font-bold text-ink-navy">{convocatoria.titulo}</h1>
        <div className="mt-4 space-y-1">
          {campo('Referencia', convocatoria.referencia)}
          {campo('Entidad', convocatoria.entidad)}
          {campo('Departamento', convocatoria.departamento)}
          {campo('Ciudad', convocatoria.ciudad)}
          {campo('Modalidad', convocatoria.modalidad)}
          {campo('Tipo de contrato', convocatoria.tipo_contrato)}
          {campo('Fecha de publicación', convocatoria.fecha_publicacion)}
          <p className="font-mono text-sm text-ink-navy">
            <span className="font-sans font-semibold">Precio base:</span>{' '}
            {convocatoria.precio_base != null ? `$${convocatoria.precio_base.toLocaleString()}` : '—'}
          </p>
        </div>
        {convocatoria.url && (
          <a
            href={convocatoria.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded border-2 border-gold px-4 py-1.5 font-sans text-sm font-medium text-gold hover:bg-gold hover:text-paper"
          >
            Ver proceso oficial
          </a>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar en navegador**

Navegar a `http://localhost:5173/convocatoria/CO1.REQ.10236807` (proceso real
verificado en vivo durante el análisis). Confirmar: sello de estado visible,
radicado en mono, botón ★ funcional (togglea y persiste tras recargar),
campos con valores `"No Definido"` mostrados como `—`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Detail.jsx
git commit -m "feat: Detail con favorito, sello de estado y normalización de valores vacíos"
```

---

## Task 9: Frontend — `Profile.jsx` completo (favoritos + búsquedas guardadas)

**Files:**
- Modify: `frontend/src/pages/Profile.jsx`

**Interfaces:**
- Consumes: `Header`, `EstadoStamp` (Task 5), `displayValue` (Task 4),
  `GET /bookmarks`, `DELETE /bookmarks/{proceso_id}` (Task 1),
  `GET /saved-searches`, `DELETE /saved-searches/{id}` (Task 2).

- [ ] **Step 1: Reescribir `Profile.jsx` completo**

```jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Header from '../components/Header.jsx'
import EstadoStamp from '../components/EstadoStamp.jsx'
import { displayValue } from '../utils/normalize.js'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [savedSearches, setSavedSearches] = useState([])
  const navigate = useNavigate()

  const fetchAll = async () => {
    const [meRes, bookmarksRes, searchesRes] = await Promise.all([
      axios.get('/auth/me'),
      axios.get('/bookmarks'),
      axios.get('/saved-searches'),
    ])
    setUser(meRes.data)
    setBookmarks(bookmarksRes.data)
    setSavedSearches(searchesRes.data)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const quitarBookmark = async (procesoId) => {
    try {
      await axios.delete(`/bookmarks/${procesoId}`)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err)
        return
      }
    }
    setBookmarks((prev) => prev.filter((b) => b.proceso_id !== procesoId))
  }

  const eliminarBusqueda = async (id) => {
    try {
      await axios.delete(`/saved-searches/${id}`)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err)
        return
      }
    }
    setSavedSearches((prev) => prev.filter((s) => s.id !== id))
  }

  const reejecutarBusqueda = (filters) => {
    const params = new URLSearchParams(filters)
    navigate(`/?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-ink-navy">Mi perfil</h1>
        {user && (
          <div className="mt-3 font-sans text-ink-navy">
            <p><span className="font-semibold">Nombre:</span> {user.full_name || '—'}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
          </div>
        )}

        <h2 className="mt-8 font-display text-lg font-bold text-ink-navy">
          Favoritos ({bookmarks.length})
        </h2>
        <div className="mt-3 space-y-2">
          {bookmarks.length === 0 && (
            <p className="font-sans text-sm text-ink-navy/60">Todavía no tienes favoritos.</p>
          )}
          {bookmarks.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-l-4 border-ink-navy/20 bg-white px-4 py-2">
              <div>
                <Link to={`/convocatoria/${b.proceso_id}`} className="font-display text-sm font-semibold text-ink-navy hover:text-gold">
                  {displayValue(b.titulo)}
                </Link>
                <p className="font-sans text-xs text-ink-navy/70">{displayValue(b.entidad)}</p>
              </div>
              <div className="flex items-center gap-3">
                <EstadoStamp estado={b.estado} />
                <button onClick={() => quitarBookmark(b.proceso_id)} className="font-sans text-xs text-stamp-red hover:underline">
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 font-display text-lg font-bold text-ink-navy">
          Búsquedas guardadas ({savedSearches.length})
        </h2>
        <div className="mt-3 space-y-2">
          {savedSearches.length === 0 && (
            <p className="font-sans text-sm text-ink-navy/60">Todavía no guardaste ninguna búsqueda.</p>
          )}
          {savedSearches.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-l-4 border-ink-navy/20 bg-white px-4 py-2">
              <span className="font-sans text-sm text-ink-navy">{s.name}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => reejecutarBusqueda(s.filters)} className="font-sans text-xs font-medium text-gold hover:underline">
                  Re-ejecutar
                </button>
                <button onClick={() => eliminarBusqueda(s.id)} className="font-sans text-xs text-stamp-red hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verificar en navegador (recorrido manual)**

1. Con al menos un favorito y una búsqueda guardada (de Tasks 7-8), ir a
   `http://localhost:5173/profile`.
2. Confirmar que aparece el favorito con su sello de estado y botón "Quitar"
   → click → confirmar que desaparece de la lista y que en Home (Task 7) el
   ★ correspondiente ya no está marcado tras recargar.
3. Confirmar que aparece la búsqueda guardada → click "Re-ejecutar" →
   confirmar que navega a `/` con los filtros de esa búsqueda aplicados en la
   URL y en los inputs.
4. Click "Eliminar" en la búsqueda guardada → confirmar que desaparece de la
   lista y de `GET /saved-searches` (recargar y confirmar que no vuelve).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Profile.jsx
git commit -m "feat: Profile con favoritos (quitar) y búsquedas guardadas (re-ejecutar/eliminar)"
```

---

## Task 10: Frontend — pulir visual de `Login.jsx` y `Register.jsx`

**Files:**
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/Register.jsx`

**Interfaces:**
- Ninguna nueva — solo aplica los tokens de Tailwind ya definidos (Task 3) a
  clases que hoy son Tailwind "muertas" (sin efecto porque Tailwind nunca
  estaba instalado) y ahora sí se van a renderizar.

- [ ] **Step 1: Reescribir `Login.jsx` completo**

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await axios.post('/auth/login', { email, password })
      localStorage.setItem('token', response.data.access_token)
      onLogin()
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-ink-navy">
          Portal de Convocatorias
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 border-l-4 border-gold bg-white p-6 shadow-sm">
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          {error && <p className="font-sans text-sm text-stamp-red">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-ink-navy py-2 font-sans text-sm font-semibold text-paper hover:bg-gold"
          >
            Iniciar sesión
          </button>
        </form>
        <p className="mt-4 text-center font-sans text-sm text-ink-navy">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-gold hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reescribir `Register.jsx` completo**

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post('/auth/register', { email, password, full_name: fullName })
      const loginRes = await axios.post('/auth/login', { email, password })
      localStorage.setItem('token', loginRes.data.access_token)
      onRegister()
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrarse')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-ink-navy">
          Portal de Convocatorias
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 border-l-4 border-gold bg-white p-6 shadow-sm">
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          <div>
            <label className="font-sans text-sm font-medium text-ink-navy">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-ink-navy/30 px-3 py-2 font-sans text-sm"
            />
          </div>
          {error && <p className="font-sans text-sm text-stamp-red">{error}</p>}
          <button
            type="submit"
            className="w-full rounded bg-ink-navy py-2 font-sans text-sm font-semibold text-paper hover:bg-gold"
          >
            Registrarse
          </button>
        </form>
        <p className="mt-4 text-center font-sans text-sm text-ink-navy">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-gold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar en navegador**

Ir a `http://localhost:5173/login` y `/register` (logout primero si hace
falta): confirmar tarjeta blanca con borde dorado a la izquierda, botón navy
que se pone dorado en hover, wordmark en slab mayúsculas. Probar un login con
credenciales incorrectas → confirmar mensaje de error en rojo-tinta
(`stamp-red`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
git commit -m "style: aplicar dirección visual gaceta/expediente a Login y Register"
```

---

## Task 11: Verificación end-to-end final

**Files:** ninguno (solo verificación manual + backend curl).

**Interfaces:** ninguna nueva — recorre todo lo construido en Tasks 1-10.

- [ ] **Step 1: Backend — correr toda la suite**

Run: `cd backend && venv_clean/bin/pytest tests/ -v`
Expected: 6 passed, 0 failed.

- [ ] **Step 2: Backend — recontrastar el checklist de `docs/PLAN-DIA2-BACKEND.md §0` con curl**

```bash
curl -s http://localhost:8000/api/health
# → {"status":"ok"}

curl -s -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.co","password":"Secret123","full_name":"E2E"}'
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.co","password":"Secret123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8000/api/bookmarks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proceso_id":"CO1.REQ.10236807","titulo":"Test","entidad":"Test","estado":"Convocado","url":"https://example.com"}'
curl -s -o /dev/null -w "DELETE por proceso_id: %{http_code}\n" -X DELETE \
  "http://localhost:8000/api/bookmarks/CO1.REQ.10236807" -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:8000/api/saved-searches -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"e2e","filters":{"q":"salud"}}' | python3 -m json.tool
```
Expected: `DELETE por proceso_id: 204`; el `POST /saved-searches` devuelve
`"filters": {"q": "salud"}` como objeto, no como string escapado.

- [ ] **Step 3: Frontend — recorrido manual completo**

Con backend y `npm run dev` corriendo, en una ventana de incógnito:
1. Registro de un usuario nuevo → login automático → aterriza en Home con el
   Header visible y el fondo papel.
2. Aplicar al menos 3 filtros distintos (texto + departamento + estado) →
   confirmar que la URL los refleja y los resultados cambian.
3. Marcar 2 convocatorias como favoritas desde Home.
4. Ir a "Mi perfil" → confirmar que aparecen las 2, con su sello de estado.
5. Guardar la búsqueda actual con un nombre → ir a Perfil → click
   "Re-ejecutar" → confirmar que Home vuelve a mostrar esos filtros.
6. Quitar un favorito desde Perfil → volver a Home → confirmar que el ★ ya
   no está marcado.
7. Entrar al detalle de una convocatoria → marcarla como favorita desde ahí →
   confirmar que aparece en Perfil.
8. Cerrar sesión ("Salir") → confirmar redirección a `/login` y que
   `localStorage` ya no tiene `token`.

- [ ] **Step 4: Registrar cierre en `SOUL.md`**

Agregar una entrada fechada bajo "Cómo usé Hermes y los LLMs" resumiendo: qué
se cerró en esta ronda (contrato de bookmarks/saved-searches, filtros
completos, perfil, dirección visual), y bajo "Qué mejoraría o pediría" anotar
lo que quedó fuera de alcance (dropdowns con valores reales de SECOP, conteo
total de resultados, tests de frontend).

- [ ] **Step 5: Commit final**

```bash
git add SOUL.md
git commit -m "docs: cierre de SOUL.md para la ronda de cierre Día 4"
```
