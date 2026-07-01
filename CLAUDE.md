# CLAUDE.md — Portal de Convocatorias Públicas

Contrato operativo del agente (Hermes + LLM) sobre **este** repo. No es un README:
le habla al modelo, que lo lee antes de ejecutar cualquier cosa. El README le habla
al humano. Spec funcional/técnico completo: ver `docs/SPEC.md`.

> Reto AI-First · Fase 1 · Track DEV. Regla innegociable: **cero código manual** —
> todo se genera/itera vía IA, orquestado por Hermes. Este archivo es lo que mantiene
> al agente coherente entre sesiones.

## Qué es este proyecto
Portal donde usuarios registrados exploran, filtran y guardan **convocatorias
públicas colombianas** consultadas en vivo desde **datos.gov.co SECOP** (dataset
`p6dx-8zbt`, protocolo Socrata/SODA, sin API key). Stack: **FastAPI + SQLite +
React (Vite)**. El flujo que debe funcionar end-to-end es:
`registro/login (JWT) → browse de convocatorias reales → bookmark persistido en DB`.

## Stack y comandos
- **Backend:** FastAPI · SQLAlchemy · SQLite · python-jose (JWT) · passlib[bcrypt] · httpx
- **Frontend:** React + Vite · React Router
- **DB:** SQLite (archivo `backend/portal.db`, creado al arranque)

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```
API en `http://localhost:8000/api`, docs interactivas en `http://localhost:8000/docs`.

## Jerarquía de autoridad (qué puede hacer el agente sin preguntar)
**Puede ejecutar sin confirmación:**
- Crear/editar archivos dentro de `backend/app/`, `frontend/src/`, `docs/`.
- Generar y correr tests, levantar el servidor en dev, instalar dependencias listadas en el spec.
- Consultar la API de SECOP para inspeccionar datos reales.

**Debe proponer y esperar visto bueno antes de:**
- Cambiar el **stack** (FastAPI/React/SQLite) o introducir una nueva dependencia mayor.
- Cambiar el **contrato de API** o el **modelo de datos** de `docs/SPEC.md`.
- Cualquier acción `git push`, crear PRs, o tocar configuración de despliegue.

**Nunca:**
- Escribir secretos reales en el repo. Borrar `docs/SPEC.md`, `CLAUDE.md` o `SOUL.md`.
- Commitear `.env`, `portal.db`, `node_modules/`, `__pycache__/`.

## Zonas seguras / restringidas
| Zona | Permiso |
|---|---|
| `backend/app/`, `frontend/src/` | Editable libremente (código de la app) |
| `docs/SPEC.md` | Fuente de verdad — se edita **deliberadamente**, no como efecto colateral |
| `CLAUDE.md` | Este contrato — cambios solo con intención explícita |
| `SOUL.md` | Append-only durante el reto: se le agregan entradas, no se reescribe |
| `.env`, `*.db` | Nunca se commitean (van en `.gitignore`) |

## Convenciones de nombres (sin alucinaciones)
- **Identificador de convocatoria** = campo SECOP `id_del_proceso`, expuesto en el
  portal como `proceso_id`. Es la clave de un bookmark.
- El backend **normaliza** cada item SECOP a este shape estable del portal:
  `{proceso_id, referencia, titulo, descripcion, entidad, departamento, ciudad,
   estado, modalidad, tipo_contrato, fecha_publicacion, precio_base, url}`.
  Mapeo de campos SECOP → portal: ver tabla en `docs/SPEC.md §4`.
- Rutas REST: prefijo `/api`; auth bajo `/api/auth/*`; recursos en plural
  (`/api/bookmarks`, `/api/saved-searches`, `/api/convocatorias`).
- Tablas DB: `users`, `bookmarks`, `saved_searches` (snake_case, plural).
- Dinero: `precio_base` llega como string desde SECOP — parsear a número en el backend.

## Reglas de datos SECOP (verificadas en vivo)
- Todos los valores llegan como **string**; parsear números (`precio_base`) y fechas ISO.
- `urlproceso` puede ser objeto `{ "url": "..." }` — normalizar a string.
- Valores `"No Definido"` / `"No Adjudicado"` se tratan como vacío en la UI.
- El frontend **nunca** llama a SECOP directo; siempre pasa por `/api/convocatorias`.
- Cliente SECOP en `services/secop.py` con timeout y cache en memoria (TTL ~60 s).

## Cómo trabajamos (AI-first, orquestado por Hermes)
1. **Spec primero.** Si una tarea no está cubierta por `docs/SPEC.md`, actualizar el
   spec antes de generar código.
2. **`/plan` antes de tareas complejas.** Exponer el plan, corregirlo, *luego* ejecutar.
3. **Iterar en pasos chicos y verificables** (un endpoint / una pantalla a la vez),
   probando contra datos reales de SECOP.
4. **Trazabilidad:** cada hito relevante deja una entrada en `SOUL.md` (decisión,
   prompt que funcionó, bloqueo y cómo se resolvió). El SOUL.md es criterio de evaluación.
5. **Patrón LLM-as-judge** cuando aplique: un modelo genera, otro revisa antes de aceptar.

## Tabla de selección de modelos (gestión de créditos — parte del reto)
| Tarea | Modelo sugerido |
|---|---|
| Scaffolding, boilerplate, edits mecánicos | Modelo barato/rápido (ej. Haiku / DeepSeek) |
| Lógica de negocio, integración SECOP, auth | Modelo intermedio (ej. Sonnet) |
| Diseño de arquitectura, debugging difícil, review crítico | Modelo potente (ej. Opus) — uso medido |

> Empezar barato y escalar solo cuando el paso lo exige. Documentar en `SOUL.md`
> qué modelo se usó en los momentos clave.

## Definition of Done (resumen — completo en `docs/SPEC.md §10`)
Auth JWT funcional · browse con convocatorias reales de datos.gov.co · filtros
operativos · bookmark que **persiste** en la DB tras recargar · búsqueda guardada
re-ejecutable · README reproducible · SOUL.md con el proceso documentado.
