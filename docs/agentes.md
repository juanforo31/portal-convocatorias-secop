# Agentes — quién (o qué IA) hizo qué

> Este documento responde "¿qué rol de IA hizo cada parte del trabajo, con qué
> modelo y bajo qué reglas?". La tabla de selección de modelos y la jerarquía
> de autoridad completas viven en `CLAUDE.md` (el contrato operativo del
> agente); aquí se enlazan y se cuenta, con evidencia, cómo se usaron en la
> práctica a lo largo del reto.

## Orquestador

**Hermes**, coordinando uno o más LLMs por tarea, siguiendo las reglas de
`CLAUDE.md`: spec primero, `/plan` antes de tareas complejas, iterar en pasos
chicos y verificables, y dejar trazabilidad en `SOUL.md` en cada hito.

## Jerarquía de autoridad (resumen — completa en `CLAUDE.md`)

| Puede hacer sin preguntar | Necesita visto bueno del usuario |
|---|---|
| Crear/editar código en `backend/app/`, `frontend/src/`, `docs/`; correr tests; levantar el server; consultar SECOP | Cambiar el stack o el contrato de API/modelo de datos; `git push`; crear PRs; tocar despliegue |

## Tabla de selección de modelos (de `CLAUDE.md`, gestión de créditos)

| Tarea | Modelo usado |
|---|---|
| Scaffolding, boilerplate, edits mecánicos | Barato/rápido (Haiku) |
| Lógica de negocio, integración SECOP, auth | Intermedio (Sonnet) |
| Arquitectura, debugging difícil, review crítico | Potente (Opus), uso medido |

## Roles concretos usados durante el reto (con evidencia)

- **Implementador único (Sonnet 4.6) — Días 2 y 3 (2026-07-02).** Generó todo
  `backend/app/` (config, DB, modelos, auth JWT, cliente SECOP con
  normalización y cache) y el primer frontend (login, registro, listado con
  filtros básicos, detalle). No se necesitó escalar a un modelo más potente en
  este tramo. Evidencia: `SOUL.md § Cómo usé Hermes y los LLMs`.

- **Patrón implementador + revisor por tarea (`superpowers:subagent-driven-development`)
  — Cierre Día 4 (2026-07-02).** Se ejecutó el plan de 11 tareas
  (`docs/superpowers/plans/2026-07-02-cierre-dia4-frontend.md`) en un worktree
  aislado, con un subagente implementador y un subagente revisor por tarea —
  el patrón "LLM-as-judge" que menciona `CLAUDE.md`. Modelos: **Haiku** para
  tareas mecánicas (utils puros, componentes sin lógica, setup de Tailwind,
  polish de Login/Register); **Sonnet** para tareas de integración
  multi-archivo (`App.jsx`, `Home.jsx`, `Detail.jsx`, `Profile.jsx`) y para
  **todas** las revisiones, sin excepción.
  - El subagente revisor detectó, antes de que el código llegara a
    `Login.jsx`/`Register.jsx`, que el interceptor 401 global de axios
    ocultaba el mensaje de "Credenciales incorrectas" en el login — un
    bloqueo real que quedó documentado y corregido en la misma vuelta de
    revisión (`SOUL.md § Bloqueos y cómo los resolví`, entrada del interceptor
    401).

- **Agente de brainstorming (`superpowers:brainstorming`) — diseño visual,
  previo al cierre Día 4.** Definió y obtuvo visto bueno explícito del usuario
  para la dirección visual "gaceta/expediente oficial" y la decisión de
  instalar Tailwind v4 en vez de reescribir a CSS plano. Resultado:
  `docs/superpowers/specs/2026-07-02-cierre-dia4-frontend-design.md`.

- **Agente de verificación E2E (esta sesión, 2026-07-06).** Sin acceso previo
  a navegador real durante el cierre Día 4 (limitación documentada en
  `SOUL.md`), esta sesión condujo un navegador real (Chromium vía Playwright)
  para recorrer el camino feliz completo — registro, login, browse,
  filtros, favoritos, guardar/re-ejecutar búsqueda, logout/login con
  persistencia, credenciales incorrectas, 401 sin token — cerrando así la
  limitación pendiente. Misma sesión también diagnosticó y corrigió que
  `requirements.txt` no era instalable desde cero (incompatibilidad con Python
  3.14), escribió `README.md`, y consolidó esta documentación.

## Por qué importa esta segmentación

`CLAUDE.md` define las **reglas** (qué puede hacer un agente y con qué
modelo). Este documento registra la **ejecución real** de esas reglas: qué
rol concreto actuó en cada momento, con qué modelo, y qué encontró — la parte
que un contrato operativo no puede anticipar de antemano.
