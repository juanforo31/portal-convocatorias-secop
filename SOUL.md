# SOUL.md — Portal de Convocatorias Públicas

> Resumen contextual del trabajo con Hermes + LLMs. Es la evidencia de **cómo**
> construí, no solo de qué construí. Se va llenando durante el reto (append-only).
> Reto AI-First · Fase 1 · Track DEV · Juan David Forero.

## Proyecto
Portal de Convocatorias Públicas: app web con autenticación donde usuarios
registrados exploran, filtran y guardan convocatorias públicas colombianas
consultadas en vivo desde datos.gov.co (SECOP, dataset `p6dx-8zbt`).
**Problema que resuelve:** el portal oficial de SECOP es difícil de filtrar y no
permite guardar favoritos ni reusar búsquedas; este portal sí.

## Stack y arquitectura
- **Backend:** FastAPI (Python) + SQLAlchemy + SQLite. Auth con JWT.
- **Frontend:** React + Vite.
- **Integración:** cliente a SECOP vía protocolo Socrata/SODA (sin API key).
- **Flujo:** React SPA → FastAPI (`/api`, JWT) → SECOP (en vivo); SQLite persiste
  usuarios, bookmarks y búsquedas guardadas.
- Diagrama y contrato completo: `docs/SPEC.md`.

## Cómo usé Hermes y los LLMs
> _(Ir registrando: skills/instrucciones clave, specs o prompts que mejor
> funcionaron, iteraciones, qué modelo se usó en cada momento y por qué.)_

- **[2026-06-30] Día 1 — Fundación.** Antes de generar código se definió el
  `docs/SPEC.md` (contrato funcional/técnico) y el `CLAUDE.md` (contrato operativo
  del agente). Se exploró la API de SECOP en vivo para aterrizar la integración en
  los 51 campos reales del dataset (no inventados).

## Decisiones y trade-offs
- **SQLite en vez de PostgreSQL:** cero infra, suficiente para el MVP; el spec
  permite ambos. Trade-off: menos realista para producción, pero más rápido de demostrar.
- **React (Vite):** más vistoso para la demo; trade-off: requiere build step vs. HTML vanilla.
- **Proxy del backend a SECOP** (el frontend nunca llama a SECOP directo): permite
  normalizar shape, manejar errores y cachear. Trade-off: un salto extra de red.
- **Snapshot de campos en `bookmarks`:** mostrar el favorito sin re-consultar SECOP;
  el `proceso_id` permite refrescar cuando se quiera.

## Bloqueos y cómo los resolví
> _(Registrar cada bloqueo real y su solución — esto puntúa: demuestra autonomía.)_

## Qué mejoraría o pediría
> _(Cerrar al final: límites del MVP, qué haría con más tiempo/créditos.)_

## Enlace al repositorio
> _(Pegar la URL del repo público GitHub/GitLab.)_
