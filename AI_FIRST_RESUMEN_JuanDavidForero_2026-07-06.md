# Resumen — Reto AI-First · Fase 1 · Track DEV

**Autor:** Juan David Forero · **Fecha del corte:** 2026-07-06
**Producto:** Portal de Convocatorias Públicas (SECOP)
**Repo:** https://github.com/juanforo31/portal-convocatorias-secop

> Este documento consolida el trabajo real hecho durante el reto, con
> evidencia verificable (commits, tests, capturas de un recorrido en
> navegador real). No es un reporte de marketing: incluye lo que quedó a
> medias y la deuda conocida, tal como está registrada en `SOUL.md`.

---

## 1. Qué se construyó (avances reales)

Un portal donde un usuario se registra, explora convocatorias de
contratación pública colombiana consultadas **en vivo** desde
[datos.gov.co](https://www.datos.gov.co) (SECOP, dataset `p6dx-8zbt`), las
filtra, marca favoritos y guarda búsquedas para reusarlas.

**Backend** (FastAPI + SQLAlchemy + SQLite):
- Auth con JWT (registro/login), passwords con `bcrypt`.
- `/api/convocatorias`: proxy a SECOP (protocolo Socrata/SODA) con
  traducción de filtros del portal a parámetros `$q`/`$where`/`$order`, y
  normalización de los 14 campos que el portal usa (de los 51 reales del
  dataset).
- `/api/bookmarks`: crear/listar/quitar favoritos, persistidos por usuario.
- `/api/saved-searches`: guardar un conjunto de filtros con nombre y
  re-ejecutarlo.
- Primera suite de tests del proyecto: `backend/tests/` (pytest, 6 tests,
  cubren bookmarks y saved-searches).

**Frontend** (React + Vite + Tailwind v4):
- Login / Register.
- Home: filtros completos (texto, entidad, ubicación, estado, modalidad,
  rango de fechas), paginación, favoritos, "guardar búsqueda".
- Detail: vista de una convocatoria con favorito y enlace al proceso oficial.
- Profile: datos del usuario, favoritos (quitar), búsquedas guardadas
  (re-ejecutar / eliminar).
- Dirección visual propia ("gaceta/expediente oficial"): tokens de color y
  tipografía, componente `EstadoStamp` como sello de estado.

**Documentación del proceso:**
- `docs/SPEC.md` — contrato funcional/técnico, escrito *antes* del código.
- `CLAUDE.md` — contrato operativo del agente (reglas de autonomía, qué
  requiere visto bueno, tabla de selección de modelos).
- `SOUL.md` — bitácora append-only de decisiones, bloqueos y prompts.
- `README.md` — instrucciones para levantar el proyecto en local (cerrado
  recién el 2026-07-06, ver §5).

## 2. Cronología real

| Fecha | Qué pasó |
|---|---|
| 2026-06-30 / 07-01 | Día 1: `SPEC.md`, `CLAUDE.md`, `SOUL.md` inicial, exploración en vivo de la API de SECOP (51 campos reales, no inventados). |
| 2026-07-02 | Días 2-4 en una sola sesión larga: backend completo (auth, proxy SECOP, bookmarks, saved-searches con tests), frontend completo (Home/Detail/Profile/Login/Register), dirección visual Tailwind. 17 commits ese día. |
| 2026-07-02 → 2026-07-06 | **Sin actividad** (4 días). Consecuencia directa: al retomar, se perdió el hilo de qué faltaba — de ahí este resumen. |
| 2026-07-06 | Sesión de cierre: recorrido manual real en navegador (nunca antes hecho), README.md, fix de `requirements.txt`, cierre del checklist de Definition of Done, push de los 19 commits a GitHub (que hasta ese día solo tenía los 2 commits de fundación). |

**Nota honesta:** el trabajo técnico grueso se hizo el 2026-07-02. Los 4 días
siguientes no tuvieron actividad — el repo remoto se quedó desactualizado
(solo 2 de 19 commits) hasta hoy, y ni el README ni la verificación manual en
navegador se habían hecho.

## 3. Investigación técnica

- **API de SECOP (Socrata/SODA):** se consultó en vivo, no se asumió por
  documentación. Hallazgos verificados contra la API real:
  - Todos los campos llegan como **string**, incluidos números y fechas.
  - `urlproceso` llega como objeto `{"url": "..."}`, no como string.
  - Existen valores centinela (`"No Definido"`, `"No Adjudicado"`) que hay
    que tratar como vacío en la UI.
  - No requiere API key para consultas básicas.
- **Compatibilidad de dependencias Python 3.14:** el entorno corre Python
  3.14, más nuevo que muchas librerías fijadas originalmente. Esto generó dos
  bloqueos reales (ver §4) y quedó como el aprendizaje técnico más relevante
  del reto: *pinnear versiones sin probar instalación limpia es un riesgo
  real, no teórico*.

## 4. Decisiones técnicas y bloqueos (con solución)

| Decisión / bloqueo | Resolución | Evidencia |
|---|---|---|
| SQLite en vez de PostgreSQL | Cero infra para el MVP; trade-off: menos realista para producción | `SOUL.md` §"Decisiones y trade-offs" |
| `passlib.CryptContext` fallaba con Python 3.14 | Reemplazado por `bcrypt.hashpw`/`checkpw` directo, sin cambiar el contrato de `hash_password`/`verify_password` | `backend/app/security.py`, `SOUL.md` |
| Tailwind nunca se instaló de verdad (clases muertas desde Día 2-3) | Se instaló Tailwind v4 real en vez de reescribir a CSS plano | commit `f90d492` |
| Interceptor 401 global de axios interceptaba también el 401 legítimo de login/register, ocultando "Credenciales incorrectas" | Excluir `/auth/login` y `/auth/register` del auto-logout, sin dejar de rechazar la promesa | commit `bbd4b73`, **re-verificado hoy en navegador real** |
| `backend/requirements.txt` no instalaba desde cero (`pydantic==2.5.0` conflictúa con `pydantic-settings==2.5.0`, que exige `pydantic>=2.7.0`; además `pydantic-core` viejo no tiene wheel para Python 3.14) | Se subieron `fastapi`/`uvicorn`/`sqlalchemy`/`pydantic`/`python-jose`/`httpx`/`python-dotenv` a versiones que sí instalan; verificado con un venv nuevo desde cero (`pip install` limpio, backend arranca, pytest 6/6) | commit `48cf6df`, hoy |
| `README.md` no existía | Creado con pasos de arranque de backend/frontend, verificados literalmente (no solo redactados) | commit `48cf6df` |

## 5. Qué quedó probado hoy (evidencia, no promesa)

Se hizo un recorrido end-to-end en un **navegador real** (Chromium vía
Playwright, no solo `curl`/`npm run build` como en cierres anteriores):

1. Registro → login automático → JWT.
2. Browse con datos reales de SECOP (nombres de entidades, montos, estados
   reales — no mocks).
3. Marcar favorito desde Home y desde Detail.
4. Aplicar filtro de texto → "Guardar búsqueda" (con el diálogo nativo
   `window.prompt`, manejado explícitamente en la prueba).
5. Perfil: favorito y búsqueda guardada visibles.
6. Re-ejecutar búsqueda guardada desde el perfil.
7. Logout → login de nuevo → **el favorito y la búsqueda guardada siguen
   ahí** (persistencia real en `portal.db`, no solo en memoria de sesión).
8. Login con contraseña incorrecta → mensaje "Credenciales incorrectas"
   visible (confirma que el fix del interceptor 401 sigue vivo).
9. `GET /api/bookmarks` sin token → `401` (confirmado con `curl`).

**Resultado:** cero errores de consola o HTTP durante toda la sesión. Los 8
criterios del Definition of Done (`docs/SPEC.md §10`) están marcados como
verificados con esta evidencia.

## 6. Deuda técnica conocida (no bloquea, pero es honesto dejarla explícita)

Documentada en `SOUL.md` desde el cierre del Día 4, sigue sin resolverse:

1. Lógica de "toggle de favorito" duplicada en `Home.jsx`, `Detail.jsx` y
   `Profile.jsx` (patrón "409/404 = éxito" copiado 3 veces) — candidata a un
   hook `useBookmarkToggle`.
2. `Profile.jsx`'s `fetchAll` no maneja errores (a diferencia de Home/Detail):
   un fallo no-401 deja el perfil en blanco sin mensaje.
3. `proceso_id` no pasa por `encodeURIComponent` en las rutas `DELETE` — no
   es un bug real con los IDs actuales de SECOP, pero es hardening barato.
4. `titulo` no pasa por `displayValue` en `Home.jsx`/`Detail.jsx` (sí en
   `Profile.jsx`) — inconsistencia menor de normalización.
5. Condición de carrera de baja probabilidad: el fetch de `GET /bookmarks`
   al montar no tiene `AbortController` frente a un toggle disparado justo
   después.
6. **No hay ningún framework de tests de frontend.** Toda la verificación de
   React fue manual (hoy, en navegador) o build-check + curl (Día 4). Con
   más tiempo, valdría la pena al menos una suite mínima con Vitest/RTL.
7. Cuatro carpetas de entornos virtuales distintas en `backend/`
   (`venv`, `.venv`, `venv2`, `venv_clean`) — reflejo de los intentos previos
   para encontrar una combinación de dependencias instalable. Ahora que
   `requirements.txt` está arreglado, se pueden borrar todas y regenerar una
   sola con las instrucciones del `README.md`.

## 7. Entregables

- Repo público: https://github.com/juanforo31/portal-convocatorias-secop
  (rama `main`, 19+ commits, README verificado con instalación limpia).
- `docs/SPEC.md` — contrato funcional/técnico, DoD marcado como verificado.
- `SOUL.md` — bitácora completa del proceso con Hermes/LLMs.
- Este resumen.

## 8. Próximos pasos (si hay tiempo antes de la demo o después)

**Antes de la demo (si queda tiempo):**
- Ensayar la demo de 5-7 min siguiendo el mismo guion del recorrido §5
  (es literalmente el camino feliz ya verificado).
- Opcional: limpiar los `portal.db` de prueba y las carpetas de venv
  duplicadas para que el repo se vea prolijo si alguien lo clona en vivo.

**Después del reto (mejoras reales, no cosméticas):**
- Suite de tests de frontend (Vitest + React Testing Library).
- Extraer el hook `useBookmarkToggle` para eliminar la triplicación.
- Dropdowns con valores reales de SECOP para los filtros (hoy son texto
  libre).
- Conteo total de resultados en `/api/convocatorias` ("página X de Y").
- Manejo de errores en `Profile.jsx.fetchAll`.
