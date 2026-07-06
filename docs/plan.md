# Plan — Portal de Convocatorias Públicas

> Consolidado de "qué se planeó" vs. "qué pasó realmente", día por día. Los
> planes de ejecución detallados (paso a paso, con checklists de verificación)
> viven en archivos aparte, enlazados abajo — este documento es el mapa, no el
> detalle.

## Plan original (definido Día 1, en `docs/SPEC.md §12`)

| Día | Alcance planeado |
|---|---|
| 1 | `docs/SPEC.md` + `CLAUDE.md` + repo + `SOUL.md` inicial + exploración en vivo de la API de SECOP |
| 2 | Backend: DB + auth JWT + `/api/convocatorias` (proxy SECOP con filtros) |
| 3 | Backend: bookmarks + saved-searches. Frontend: login + browse con filtros |
| 4 | Frontend: favoritos + perfil + detalle. Integración end-to-end |
| 5 | Pruebas manuales, README, cierre de `SOUL.md`, ensayo de demo (5–7 min) |

## Qué pasó realmente (cronología real)

| Fecha | Qué pasó |
|---|---|
| 2026-06-30 / 07-01 | Día 1 tal como se planeó: `SPEC.md`, `CLAUDE.md`, `SOUL.md` inicial, exploración en vivo de SECOP (51 campos reales). |
| 2026-07-02 | Días 2, 3 **y** 4 del plan original, en una sola sesión larga: backend completo (auth, proxy SECOP, bookmarks, saved-searches con tests), frontend completo (Home/Detail/Profile/Login/Register), dirección visual Tailwind. 17 commits ese día. |
| 2026-07-02 → 2026-07-06 | **Sin actividad** (4 días) — no estaba en el plan original; al retomar se perdió el hilo de qué faltaba cerrar. |
| 2026-07-06 | Día 5 del plan original, ejecutado con retraso: recorrido manual real en navegador, README.md, fix de `requirements.txt`, cierre del Definition of Done, consolidación de documentación (`AI_FIRST_RESUMEN...md`, este set de docs), push de los commits pendientes a GitHub. |

**Diferencia principal con el plan:** los Días 2–4 se comprimieron en una sola
sesión (2026-07-02) en vez de ejecutarse en días separados, y el Día 5 se corrió
4 días después de lo previsto por un vacío de actividad no planeado. El alcance
funcional entregado sí coincide con lo planeado en `docs/SPEC.md §2`
(dentro/fuera del MVP) — no hubo recorte de alcance, solo compresión y retraso
de calendario.

## Planes de ejecución detallados (el "cómo", tarea por tarea)

- `docs/PLAN-DIA2-BACKEND.md` — plan técnico completo del backend (Día 2):
  estructura de carpetas, contenido exacto de cada archivo, checklist de
  verificación con `curl`, y tabla de errores conocidos con su solución.
- `docs/superpowers/specs/2026-07-02-cierre-dia4-frontend-design.md` — diseño
  aprobado (con visto bueno del usuario, vía `superpowers:brainstorming`) para
  el cierre del Día 4: dirección visual "gaceta/expediente oficial" y stack
  Tailwind v4.
- `docs/superpowers/plans/2026-07-02-cierre-dia4-frontend.md` — plan de 11
  tareas para el cierre del Día 4, ejecutado vía
  `superpowers:subagent-driven-development` (ver `docs/agentes.md`).
- `docs/GUION-DEMO.md` — plan minuto a minuto de la demo final (5–7 min).

## Próximos pasos (post-reto, no bloquean la entrega)

Detalle completo en `AI_FIRST_RESUMEN_JuanDavidForero_2026-07-06.md §8`:

- Suite de tests de frontend (Vitest + React Testing Library).
- Extraer el hook `useBookmarkToggle` para eliminar la triplicación de lógica.
- Dropdowns con valores reales de SECOP para los filtros (hoy son texto libre).
- Conteo total de resultados en `/api/convocatorias` ("página X de Y").
- Manejo de errores en `Profile.jsx.fetchAll`.
- Limpiar las 4 carpetas de venv duplicadas en `backend/` ahora que
  `requirements.txt` está arreglado.
