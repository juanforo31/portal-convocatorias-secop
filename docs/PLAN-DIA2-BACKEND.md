# Plan Técnico — Día 2: Backend completo

> Spec de ejecución para Hermes + LLM.  
> Cuando termines este plan el backend debe estar 100% funcional:
> DB inicializada, auth JWT con register/login/me, y `/api/convocatorias`
> consultando datos reales de SECOP con filtros y paginación.
>
> **Regla:** no escribas código a mano. Genera cada archivo con el LLM,
> verifica que los tests/curl pasen y registra las decisiones en `SOUL.md`.

---

## 0. Checklist de salida del día

Al finalizar Día 2 deben funcionar **todos** estos comandos sin error:

```bash
# Health
curl http://localhost:8000/api/health
# → {"status":"ok"}

# Registro
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@test.co","password":"Secret123","full_name":"Juan"}' | python3 -m json.tool
# → {id, email, full_name, created_at}  status 201

# Login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@test.co","password":"Secret123"}' | python3 -m json.tool
# → {"access_token":"<jwt>","token_type":"bearer"}  status 200

# Me (reemplaza <TOKEN> con el jwt del login)
curl -s http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
# → {id, email, full_name, created_at}

# Sin token → 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/auth/me
# → 401

# Browse de convocatorias reales de SECOP
curl -s "http://localhost:8000/api/convocatorias?page=1&page_size=5" | python3 -m json.tool
# → {items:[{proceso_id, titulo, entidad, ...}], page:1, page_size:5}

# Filtro por texto
curl -s "http://localhost:8000/api/convocatorias?q=salud&page_size=3" | python3 -m json.tool

# Filtro por departamento
curl -s "http://localhost:8000/api/convocatorias?departamento=Antioquia&page_size=3" | python3 -m json.tool

# Detalle de una convocatoria (usa un proceso_id real del listado anterior)
curl -s "http://localhost:8000/api/convocatorias/CO1.REQ.2577563" | python3 -m json.tool
# → objeto normalizado del proceso
```

---

## 1. Estructura de carpetas a crear

```
backend/
  app/
    __init__.py           # vacío
    main.py
    config.py
    database.py
    models.py
    schemas.py
    security.py
    deps.py
    routers/
      __init__.py         # vacío
      auth.py
      convocatorias.py
    services/
      __init__.py         # vacío
      secop.py
  requirements.txt
  .env.example
```

---

## 2. `requirements.txt`

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
pydantic[email]==2.10.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
httpx==0.27.2
python-dotenv==1.0.1
```

---

## 3. `.env.example`

```
SECRET_KEY=cambia_esto_por_un_secreto_largo_y_aleatorio
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./portal.db
SECOP_BASE_URL=https://www.datos.gov.co/resource/p6dx-8zbt.json
SECOP_TIMEOUT=15
SECOP_CACHE_TTL=60
```

El archivo real `.env` va en `.gitignore` (nunca se commitea).

---

## 4. `app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./portal.db"
    SECOP_BASE_URL: str = "https://www.datos.gov.co/resource/p6dx-8zbt.json"
    SECOP_TIMEOUT: int = 15
    SECOP_CACHE_TTL: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
```

> Agrega `pydantic-settings==2.6.1` a requirements si falla el import.

---

## 5. `app/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # solo para SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
```

---

## 6. `app/models.py`

Tres tablas. Implementar **exactamente** con estos campos:

```python
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.database import Base

def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name     = Column(String, nullable=True)
    created_at    = Column(String, nullable=False, default=now_utc)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    proceso_id = Column(String, nullable=False)   # = id_del_proceso de SECOP
    titulo     = Column(String, nullable=True)    # snapshot
    entidad    = Column(String, nullable=True)    # snapshot
    estado     = Column(String, nullable=True)    # snapshot
    url        = Column(String, nullable=True)    # snapshot
    created_at = Column(String, nullable=False, default=now_utc)
    __table_args__ = (UniqueConstraint("user_id", "proceso_id"),)

class SavedSearch(Base):
    __tablename__ = "saved_searches"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    name         = Column(String, nullable=False)
    filters_json = Column(String, nullable=False)  # JSON serializado
    created_at   = Column(String, nullable=False, default=now_utc)
```

---

## 7. `app/schemas.py`

Pydantic v2. Un schema por cada request/response de auth más el shape de convocatoria normalizado.

```python
from pydantic import BaseModel, EmailStr
from typing import Optional

# --- Auth ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: str
    model_config = {"from_attributes": True}

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- Convocatoria normalizada ---
class Convocatoria(BaseModel):
    proceso_id: str
    referencia: Optional[str]
    titulo: Optional[str]
    descripcion: Optional[str]
    entidad: Optional[str]
    departamento: Optional[str]
    ciudad: Optional[str]
    estado: Optional[str]          # estado_del_procedimiento
    estado_resumen: Optional[str]
    modalidad: Optional[str]
    tipo_contrato: Optional[str]
    fecha_publicacion: Optional[str]
    precio_base: Optional[int]     # parseado de string a entero
    url: Optional[str]             # normalizado de {"url":"..."} a string

class ConvocatoriasResponse(BaseModel):
    items: list[Convocatoria]
    page: int
    page_size: int
```

---

## 8. `app/security.py`

```python
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    """Lanza JWTError si el token es inválido o expirado."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
```

---

## 9. `app/deps.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.database import SessionLocal
from app.models import User
from app.security import decode_token

bearer = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
    )
    try:
        payload = decode_token(creds.credentials)
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user
```

---

## 10. `app/services/secop.py`

Este es el corazón del Día 2. Implementar con precisión.

### 10.1 Campo `urlproceso` — confirmado en vivo
El campo `urlproceso` llega como **objeto** `{"url": "https://..."}`, no como string.
La función de normalización debe extraer `item["urlproceso"]["url"]` con `.get()` seguro.

### 10.2 Función de normalización (mapeo SECOP → portal)

```python
def _normalize(item: dict) -> dict:
    """Mapea un registro crudo de SECOP al shape del portal."""
    # urlproceso puede ser {"url": "..."} o string o None
    url_raw = item.get("urlproceso")
    if isinstance(url_raw, dict):
        url = url_raw.get("url")
    else:
        url = url_raw

    # precio_base llega como string; convertir a int, ignorar si falla
    precio_str = item.get("precio_base", "")
    try:
        precio_base = int(float(precio_str)) if precio_str else None
    except (ValueError, TypeError):
        precio_base = None

    return {
        "proceso_id":      item.get("id_del_proceso"),
        "referencia":      item.get("referencia_del_proceso"),
        "titulo":          item.get("nombre_del_procedimiento"),
        "descripcion":     item.get("descripci_n_del_procedimiento"),
        "entidad":         item.get("entidad"),
        "departamento":    item.get("departamento_entidad"),
        "ciudad":          item.get("ciudad_entidad"),
        "estado":          item.get("estado_del_procedimiento"),
        "estado_resumen":  item.get("estado_resumen"),
        "modalidad":       item.get("modalidad_de_contratacion"),
        "tipo_contrato":   item.get("tipo_de_contrato"),
        "fecha_publicacion": item.get("fecha_de_publicacion_del"),
        "precio_base":     precio_base,
        "url":             url,
    }
```

### 10.3 Cache en memoria con TTL

```python
import time
from threading import Lock

_cache: dict = {}       # key → {"data": ..., "ts": float}
_cache_lock = Lock()

def _cache_get(key: str, ttl: int):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry["ts"]) < ttl:
            return entry["data"]
    return None

def _cache_set(key: str, data):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time()}
```

### 10.4 Construcción de la query SODA

Parámetros que acepta `/api/convocatorias`:

| Param del portal | → | Parámetro SODA |
|---|---|---|
| `q` (texto libre) | → | `$q=<valor>` |
| `entidad` | → | filtro WHERE `entidad='<valor>'` |
| `departamento` | → | filtro WHERE `departamento_entidad='<valor>'` |
| `ciudad` | → | filtro WHERE `ciudad_entidad='<valor>'` |
| `estado` | → | filtro WHERE `estado_del_procedimiento='<valor>'` |
| `modalidad` | → | filtro WHERE `modalidad_de_contratacion='<valor>'` |
| `fecha_desde` | → | `$where=fecha_de_publicacion_del>='<YYYY-MM-DDT00:00:00.000>'` |
| `fecha_hasta` | → | `$where=fecha_de_publicacion_del<='<YYYY-MM-DDT00:00:00.000>'` |
| `page`, `page_size` | → | `$limit=page_size&$offset=(page-1)*page_size` |

Reglas de construcción:
- Filtros de campos exactos van **todos juntos** en un único `$where` con `AND`.
- Si hay `q` se agrega `$q` como parámetro separado (SODA fulltext, no va en `$where`).
- Orden por defecto: `$order=fecha_de_publicacion_del DESC`.
- `$select` fijo para no traer los 51 campos completos — solo los que el portal muestra:
  ```
  id_del_proceso,referencia_del_proceso,nombre_del_procedimiento,
  descripci_n_del_procedimiento,entidad,departamento_entidad,ciudad_entidad,
  estado_del_procedimiento,estado_resumen,modalidad_de_contratacion,
  tipo_de_contrato,fecha_de_publicacion_del,precio_base,urlproceso
  ```

```python
from urllib.parse import urlencode

def _build_soda_params(
    q: str | None,
    entidad: str | None,
    departamento: str | None,
    ciudad: str | None,
    estado: str | None,
    modalidad: str | None,
    fecha_desde: str | None,
    fecha_hasta: str | None,
    page: int,
    page_size: int,
) -> dict:
    params = {
        "$select": (
            "id_del_proceso,referencia_del_proceso,nombre_del_procedimiento,"
            "descripci_n_del_procedimiento,entidad,departamento_entidad,"
            "ciudad_entidad,estado_del_procedimiento,estado_resumen,"
            "modalidad_de_contratacion,tipo_de_contrato,"
            "fecha_de_publicacion_del,precio_base,urlproceso"
        ),
        "$order": "fecha_de_publicacion_del DESC",
        "$limit": page_size,
        "$offset": (page - 1) * page_size,
    }
    if q:
        params["$q"] = q

    where_parts = []
    if entidad:
        where_parts.append(f"entidad='{entidad}'")
    if departamento:
        where_parts.append(f"departamento_entidad='{departamento}'")
    if ciudad:
        where_parts.append(f"ciudad_entidad='{ciudad}'")
    if estado:
        where_parts.append(f"estado_del_procedimiento='{estado}'")
    if modalidad:
        where_parts.append(f"modalidad_de_contratacion='{modalidad}'")
    if fecha_desde:
        where_parts.append(f"fecha_de_publicacion_del>='{fecha_desde}T00:00:00.000'")
    if fecha_hasta:
        where_parts.append(f"fecha_de_publicacion_del<='{fecha_hasta}T23:59:59.000'")
    if where_parts:
        params["$where"] = " AND ".join(where_parts)

    return params
```

### 10.5 Funciones públicas del servicio

```python
import httpx
from fastapi import HTTPException
from app.config import settings

async def fetch_convocatorias(
    q=None, entidad=None, departamento=None, ciudad=None,
    estado=None, modalidad=None, fecha_desde=None, fecha_hasta=None,
    page=1, page_size=10,
) -> list[dict]:
    """Consulta SECOP con filtros y devuelve lista normalizada."""
    params = _build_soda_params(
        q, entidad, departamento, ciudad, estado, modalidad,
        fecha_desde, fecha_hasta, page, page_size,
    )
    cache_key = str(sorted(params.items()))
    cached = _cache_get(cache_key, settings.SECOP_CACHE_TTL)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=settings.SECOP_TIMEOUT) as client:
            resp = await client.get(settings.SECOP_BASE_URL, params=params)
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="SECOP no respondió a tiempo")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar SECOP: {e.response.status_code}")

    items = [_normalize(item) for item in resp.json()]
    _cache_set(cache_key, items)
    return items


async def fetch_convocatoria_by_id(proceso_id: str) -> dict:
    """Busca una convocatoria por id_del_proceso. Lanza 404 si no existe."""
    params = {
        "$where": f"id_del_proceso='{proceso_id}'",
        "$limit": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.SECOP_TIMEOUT) as client:
            resp = await client.get(settings.SECOP_BASE_URL, params=params)
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="SECOP no respondió a tiempo")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar SECOP: {e.response.status_code}")

    data = resp.json()
    if not data:
        raise HTTPException(status_code=404, detail="Convocatoria no encontrada")
    return _normalize(data[0])
```

---

## 11. `app/routers/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user
from app.models import User
from app.schemas import UserCreate, UserOut, LoginIn, Token
from app.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="El email ya está registrado")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
```

---

## 12. `app/routers/convocatorias.py`

```python
from fastapi import APIRouter, Query
from typing import Optional
from app.schemas import Convocatoria, ConvocatoriasResponse
from app.services.secop import fetch_convocatorias, fetch_convocatoria_by_id

router = APIRouter(prefix="/api/convocatorias", tags=["convocatorias"])

@router.get("", response_model=ConvocatoriasResponse)
async def list_convocatorias(
    q:           Optional[str] = Query(None, description="Texto libre"),
    entidad:     Optional[str] = Query(None),
    departamento:Optional[str] = Query(None),
    ciudad:      Optional[str] = Query(None),
    estado:      Optional[str] = Query(None),
    modalidad:   Optional[str] = Query(None),
    fecha_desde: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_hasta: Optional[str] = Query(None, description="YYYY-MM-DD"),
    page:        int = Query(1, ge=1),
    page_size:   int = Query(10, ge=1, le=50),
):
    items = await fetch_convocatorias(
        q=q, entidad=entidad, departamento=departamento, ciudad=ciudad,
        estado=estado, modalidad=modalidad,
        fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,
        page=page, page_size=page_size,
    )
    return {"items": items, "page": page, "page_size": page_size}

@router.get("/{proceso_id}", response_model=Convocatoria)
async def get_convocatoria(proceso_id: str):
    return await fetch_convocatoria_by_id(proceso_id)
```

---

## 13. `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, convocatorias

Base.metadata.create_all(bind=engine)  # crea tablas al arrancar

app = FastAPI(title="Portal de Convocatorias Públicas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # origen del frontend Vite en dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(convocatorias.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

---

## 14. Orden de construcción para Hermes (paso a paso)

Ejecutar en este orden — verificar el checklist de cada paso antes de avanzar.

### Paso 1 — Scaffolding de carpetas y dependencias
```
Crea la estructura de carpetas de backend/ con los __init__.py vacíos.
Genera requirements.txt y .env.example con el contenido del spec.
Crea el archivo .env real con SECRET_KEY generada aleatoriamente (32 bytes hex).
```
**Verificar:** `pip install -r requirements.txt` sin errores.

### Paso 2 — Config, database, models, schemas, security, deps
```
Genera config.py, database.py, models.py, schemas.py, security.py, deps.py
exactamente con el contenido del plan técnico.
```
**Verificar:** `python3 -c "from app.models import User, Bookmark, SavedSearch; print('OK')"` dentro de backend/.

### Paso 3 — Auth router + main.py mínimo
```
Genera routers/auth.py y main.py (solo con el router de auth, sin convocatorias aún).
Arranca: uvicorn app.main:app --reload --port 8000
```
**Verificar:** Correr los 4 comandos curl de health, register, login, me del checklist §0. Arreglar lo que falle antes de seguir.

### Paso 4 — Cliente SECOP (services/secop.py)
```
Genera services/secop.py completo: normalización, cache, _build_soda_params,
fetch_convocatorias, fetch_convocatoria_by_id.
```
**Verificar:**
```bash
python3 -c "
import asyncio
from app.services.secop import fetch_convocatorias
items = asyncio.run(fetch_convocatorias(page=1, page_size=2))
print(len(items), 'items')
print(items[0].keys())
assert items[0]['proceso_id'] is not None
print('SECOP client OK')
"
```

### Paso 5 — Router de convocatorias + main.py final
```
Genera routers/convocatorias.py. Añade el include_router a main.py.
Reinicia el servidor.
```
**Verificar:** Correr los curl de convocatorias del checklist §0.

---

## 15. Errores conocidos y soluciones

| Error probable | Causa | Solución |
|---|---|---|
| `ModuleNotFoundError: pydantic_settings` | Falta la lib | Agregar `pydantic-settings==2.6.1` a requirements |
| `422 Unprocessable Entity` en register | `email` no pasa validación | Asegurarse de que el campo en UserCreate es `EmailStr` de `pydantic[email]` |
| `401` en `/me` con token válido | `sub` guardado como int en el token | El token debe guardar `str(user.id)` y decodificar con `int(payload["sub"])` |
| `httpx.ConnectError` en convocatorias | SECOP inaccesible desde el entorno | Verificar red; el timeout lanza 504, no 502 |
| `$where` con comillas dobles falla en SODA | SODA usa comillas simples para strings | Usar siempre `'<valor>'` en where_parts (ya está en el plan) |
| Cache devuelve resultado vacío en segundo request | TTL muy corto o key mal formada | Imprimir cache_key y comparar entre llamadas |

---

## 16. Qué registrar en `SOUL.md` hoy

Al final del Día 2 agregar una entrada con:
- Qué modelo se usó en cada paso y por qué.
- Qué prompts/instrucciones funcionaron mejor.
- Qué bloqueos aparecieron (errores del §15 u otros) y cómo se resolvieron.
- Decisión: `$select` fijo vs. traer todos los campos — y por qué se eligió aligerar.
- Cómo se verificó que `urlproceso` es un objeto y no un string.
