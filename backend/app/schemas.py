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

# --- Bookmarks ---
class BookmarkCreate(BaseModel):
    proceso_id: str
    titulo: Optional[str] = None
    entidad: Optional[str] = None
    estado: Optional[str] = None
    url: Optional[str] = None

class BookmarkOut(BaseModel):
    id: int
    proceso_id: str
    titulo: Optional[str]
    entidad: Optional[str]
    estado: Optional[str]
    url: Optional[str]
    created_at: str
    model_config = {"from_attributes": True}

# --- Saved Searches ---
class SavedSearchCreate(BaseModel):
    name: str
    filters: dict

class SavedSearchOut(BaseModel):
    id: int
    name: str
    filters: dict
    created_at: str