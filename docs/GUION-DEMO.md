# Guion de demo (5-7 min) — Portal de Convocatorias Públicas

> Reto AI-First · Fase 1 · Track DEV. Criterios que están evaluando (del PDF
> del reto): calidad de `SOUL.md` y trazabilidad, autonomía resolviendo
> bloqueos, qué tan bien orquestaste la IA, que el producto funcione
> end-to-end, previsión y comunicación. Este guion está armado para tocar
> los cinco, en ese orden de peso.

Antes de arrancar: `backend` corriendo (`uvicorn app.main:app --reload --port
8000`) y `frontend` corriendo (`npm run dev`, puerto 5173), navegador abierto
en `http://localhost:5173`, y una segunda pestaña con el repo de GitHub
abierto. Si puedes, borra `backend/portal.db` antes de arrancar para no
mostrar usuarios de prueba viejos.

---

## 0:00–0:40 — El problema y qué construiste (40s)

**Decir**, no mostrar todavía:

> "El portal oficial de SECOP en datos.gov.co es difícil de filtrar y no te
> deja guardar lo que te interesa. Construí un portal donde te registras,
> exploras convocatorias reales de contratación pública colombiana **en
> vivo** desde datos.gov.co, las filtras, las guardas como favoritas, y
> guardas búsquedas para reusarlas después."

## 0:40–1:30 — Stack y cómo orquestaste la IA (50s)

**Decir** (esto es lo que pesa para "orquestación de IA" y "autonomía"):

> "Stack: FastAPI + SQLite en el backend, React + Vite en el frontend. Antes
> de generar una sola línea escribí `docs/SPEC.md` — el contrato funcional y
> técnico — y `CLAUDE.md`, el contrato operativo para el agente: qué puede
> hacer sin preguntar, qué necesita mi visto bueno, y una tabla de qué
> modelo usar según la tarea — Haiku para lo mecánico, Sonnet para lógica de
> negocio e integraciones, reservando modelos más caros para debugging
> difícil. Todo el código pasó por Hermes orquestando esos LLMs; yo no
> escribí código a mano."

*(Opcional si preguntan): "todo el proceso, decisión por decisión y bloqueo
por bloqueo, está en SOUL.md — lo muestro al final."*

## 1:30–4:30 — Demo en vivo, el camino feliz completo (3 min)

Este es el bloque que pesa más ("que el producto funcione end-to-end").
Sigue este orden exacto — ya lo verificaste hoy y funciona sin errores:

1. **Registro** (`/register`): crea una cuenta nueva en vivo, frente a
   ellos. Menciona: *"JWT — desde acá ya tengo sesión."*
2. **Home** (`/`): muestra el listado — señala que son datos **reales**
   (nombres de entidades, montos, estados como "BORRADOR"/"EVALUACIÓN"
   sacados directo de datos.gov.co, no inventados ni mockeados).
3. **Filtros**: escribe algo en el buscador de texto (ej. "servicios") y
   muestra que la lista cambia. Menciona de paso: entidad, ubicación,
   estado, modalidad y rango de fechas también filtran.
4. **Favorito**: haz clic en la ★ de una convocatoria.
5. **Detalle**: entra a esa convocatoria (clic en el título), muestra el
   detalle completo y el botón "Ver proceso oficial" (enlace real a SECOP).
6. **Guardar búsqueda**: vuelve a Home, aplica un filtro, clic en "Guardar
   búsqueda", ponle un nombre en el diálogo.
7. **Perfil** (`Mi perfil`): muestra favoritos y búsquedas guardadas juntos.
   Clic en "Re-ejecutar" sobre la búsqueda guardada — vuelve a Home con el
   filtro aplicado automáticamente.
8. **Persistencia real** (el punto más convincente): clic en "Salir", y
   vuelve a iniciar sesión con la misma cuenta. Entra a "Mi perfil" de
   nuevo: **el favorito y la búsqueda siguen ahí** — no era solo estado de
   React, está en la base de datos.
9. **Bonus rápido si hay tiempo** (10s): intenta iniciar sesión con la
   contraseña mal escrita — muestra el mensaje "Credenciales incorrectas".
   Es un detalle chico pero demuestra manejo de errores real, no solo el
   camino feliz.

## 4:30–5:45 — Autonomía y bloqueos resueltos (1 min 15s)

Abre `SOUL.md` (o simplemente narra, ya lo tienes fresco) y elige **2-3** de
estos, no los 5 — con tiempo limitado, calidad > cantidad:

- `passlib` no era compatible con la versión de Python del entorno (3.14);
  lo reemplazaste por `bcrypt` directo sin romper el contrato de las
  funciones que ya usaba el resto del código.
- El interceptor global de axios que cierra sesión en cualquier 401 estaba
  bloqueando el mensaje de "credenciales incorrectas" en el login — lo
  detectó un subagente revisor antes de tocar la UI, y lo corregiste
  excluyendo `/auth/login` y `/auth/register` de esa regla.
- Hoy mismo: `requirements.txt` no era instalable desde cero (conflicto de
  versiones + falta de wheels para Python 3.14) — lo detectaste probando una
  instalación limpia de verdad, no asumiendo que "en mi máquina funciona".

**Frase puente que conecta con el criterio de "previsión y comunicación":**

> "Cada uno de estos bloqueos está documentado en SOUL.md apenas ocurrió,
> no reconstruido de memoria al final — esa es la trazabilidad que pide el
> reto."

## 5:45–6:45 — Qué falta y qué harías con más tiempo (1 min)

Sé honesto, no lo escondas — está en la sección de deuda técnica de
`SOUL.md`:

> "No hay tests de frontend todavía — la verificación de React hoy fue con
> un navegador real, pero antes solo build-check y curl. Hay lógica de
> favorito duplicada en 3 componentes que debería salir a un hook
> compartido. Y los filtros de entidad/ubicación son texto libre — con más
> tiempo los volvería dropdowns con valores reales de SECOP."

## 6:45–7:00 — Cierre (15s)

> "Repo público, README probado desde cero, SOUL.md completo con la
> trazabilidad de todo el proceso. [Enlace en pantalla:
> github.com/juanforo31/portal-convocatorias-secop]. Gracias."

---

## Checklist de 2 minutos antes de arrancar

- [ ] Backend corriendo y respondiendo (`curl localhost:8000/api/convocatorias?limit=1`)
- [ ] Frontend corriendo en `localhost:5173`
- [ ] `backend/portal.db` limpio (sin usuarios de prueba raros) o al menos
      sabes qué credenciales usar si no quieres registrar una cuenta en vivo
- [ ] Pestaña del repo de GitHub abierta y cargada
- [ ] Conexión a internet estable (la demo depende de datos.gov.co en vivo)
- [ ] Cronómetro visible o alguien avisándote el tiempo — 5-7 min se pasa
      rápido si te detienes mucho en el paso 3
