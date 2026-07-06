# Skills — capacidades de Hermes usadas en el reto

> Catálogo de las skills/capacidades concretas que se invocaron durante el
> proyecto, con evidencia de dónde se usaron. No es una lista de intención:
> cada entrada tiene un archivo o commit que la respalda. El "quién" (rol/modelo)
> está en `docs/agentes.md`; aquí está el "con qué herramienta/capacidad".

## `superpowers:brainstorming`

**Uso:** decidir la dirección visual del frontend ("gaceta/expediente
oficial") y el stack a usar (Tailwind v4 vs. reescribir a CSS plano),
obteniendo visto bueno explícito del usuario antes de ejecutar.
**Evidencia:** `docs/superpowers/specs/2026-07-02-cierre-dia4-frontend-design.md`.

## `superpowers:writing-plans`

**Uso:** convertir un objetivo ("cerrar Día 2 del backend", "cerrar Día 4:
bookmarks/perfil/UI") en un plan de tareas verificable, con checklist de
comandos `curl` o pasos de UI para confirmar cada paso antes de avanzar.
**Evidencia:** `docs/PLAN-DIA2-BACKEND.md`,
`docs/superpowers/plans/2026-07-02-cierre-dia4-frontend.md`.

## `superpowers:subagent-driven-development`

**Uso:** ejecutar el plan de cierre del Día 4 (11 tareas) en un worktree
aislado, con un subagente implementador y un subagente revisor por tarea —
permite que cada tarea se revise de forma independiente antes de integrarla,
en vez de confiar en una sola pasada. Encontró 2 bloqueos reales antes de que
llegaran a producción (interceptor 401 vs. login, `setSearchParams` sin
`replace` inflando el historial del navegador).
**Evidencia:** `SOUL.md § Bloqueos y cómo los resolví` (entradas del
2026-07-02), `docs/agentes.md`.

## Automatización de navegador real (Playwright/Chromium headless)

**Uso:** el cierre del Día 4 solo se había verificado con `npm run build` +
`curl` + trazas estáticas de código (sin navegador real). Esta sesión
(2026-07-06) usó Playwright para conducir un Chromium real y ejecutar el
camino feliz completo end-to-end, incluyendo el manejo explícito de diálogos
nativos (`window.prompt` de "guardar búsqueda") — algo que un test con `curl`
no puede probar.
**Evidencia:** `SOUL.md`, entrada "[2026-07-06] Recorrido manual en navegador
real".

## Diagnóstico de incompatibilidad de dependencias (Python 3.14)

**Uso:** dos bloqueos reales de compatibilidad se resolvieron con esta
capacidad, no con un skill con nombre propio, sino con investigación directa
contra el entorno real: (1) `passlib.CryptContext` incompatible con Python
3.14 → reemplazado por `bcrypt` directo; (2) `requirements.txt` no instalable
desde cero (`pydantic`/`pydantic-settings` en conflicto + `pydantic-core` sin
wheel para 3.14) → versiones corregidas y verificadas con un venv nuevo desde
cero.
**Evidencia:** `SOUL.md`, entradas de bloqueos de `passlib` (2026-07-02) y de
`requirements.txt` (2026-07-06).

## Consolidación de documentación de proceso

**Uso:** producir, al cierre, un resumen honesto del trabajo real (no un
reporte de marketing) con cronología, decisiones, deuda técnica y próximos
pasos — y, en un segundo paso, segmentar esa misma información en los
documentos especializados que reunís en esta carpeta (`architecture.md`,
`plan.md`, `agentes.md`, `skills.md`), en vez de dejarlo todo mezclado en un
solo archivo.
**Evidencia:** `AI_FIRST_RESUMEN_JuanDavidForero_2026-07-06.md`, este archivo
y sus tres archivos hermanos.
