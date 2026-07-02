import time
from threading import Lock

import httpx
from fastapi import HTTPException

from app.config import settings

_cache: dict = {}
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


def _normalize(item: dict) -> dict:
    url_raw = item.get("urlproceso")
    if isinstance(url_raw, dict):
        url = url_raw.get("url")
    else:
        url = url_raw

    precio_str = item.get("precio_base", "")
    try:
        precio_base = int(float(precio_str)) if precio_str else None
    except (ValueError, TypeError):
        precio_base = None

    return {
        "proceso_id":       item.get("id_del_proceso"),
        "referencia":       item.get("referencia_del_proceso"),
        "titulo":           item.get("nombre_del_procedimiento"),
        "descripcion":      item.get("descripci_n_del_procedimiento"),
        "entidad":          item.get("entidad"),
        "departamento":     item.get("departamento_entidad"),
        "ciudad":           item.get("ciudad_entidad"),
        "estado":           item.get("estado_del_procedimiento"),
        "estado_resumen":   item.get("estado_resumen"),
        "modalidad":        item.get("modalidad_de_contratacion"),
        "tipo_contrato":    item.get("tipo_de_contrato"),
        "fecha_publicacion": item.get("fecha_de_publicacion_del"),
        "precio_base":      precio_base,
        "url":              url,
    }


def _build_soda_params(
    q, entidad, departamento, ciudad, estado, modalidad,
    fecha_desde, fecha_hasta, page, page_size,
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


async def fetch_convocatorias(
    q=None, entidad=None, departamento=None, ciudad=None,
    estado=None, modalidad=None, fecha_desde=None, fecha_hasta=None,
    page=1, page_size=10,
) -> list[dict]:
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
