from typing import Optional

from fastapi import APIRouter, Query

from app.schemas import Convocatoria, ConvocatoriasResponse
from app.services.secop import fetch_convocatorias, fetch_convocatoria_by_id

router = APIRouter(prefix="/api/convocatorias", tags=["convocatorias"])


@router.get("", response_model=ConvocatoriasResponse)
async def list_convocatorias(
    q:            Optional[str] = Query(None, description="Texto libre"),
    entidad:      Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    ciudad:       Optional[str] = Query(None),
    estado:       Optional[str] = Query(None),
    modalidad:    Optional[str] = Query(None),
    fecha_desde:  Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_hasta:  Optional[str] = Query(None, description="YYYY-MM-DD"),
    page:         int = Query(1, ge=1),
    page_size:    int = Query(10, ge=1, le=50),
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
