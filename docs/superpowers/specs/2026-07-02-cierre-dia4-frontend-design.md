# Diseño — Cierre de huecos Día 4: bookmarks/saved-searches/perfil end-to-end

> Reto AI-First · Fase 1 · Track DEV. Complementa `docs/SPEC.md` y
> `docs/PLAN-DIA2-BACKEND.md`. No reemplaza a `docs/SPEC.md` como fuente de verdad
> del contrato — este documento detalla el diseño de los cambios puntuales
> necesarios para cerrar la brecha entre lo especificado y lo implementado hasta
> el commit `9bc77bd`.

## Contexto

Al revisar el estado del proyecto (backend completo y probado en vivo; frontend
con solo login/registro/browse básico/detalle) se identificaron:

1. Dos desajustes entre `docs/SPEC.md §7` y la implementación real del backend.
2. Huecos de frontend frente a `docs/SPEC.md §9` (faltan pantallas/funciones:
   filtros completos, paginación, favoritos, búsquedas guardadas, perfil).
3. Una regla del spec (`§4`, normalizar `"No Definido"`/`"No Adjudicado"` a vacío)
   que no está implementada en ningún lado.

Este diseño cubre cómo cerrar los tres frentes en una sola ronda de trabajo.

## 1. Backend — fixes de contrato de API

### 1.1 `DELETE /api/bookmarks/{proceso_id}`
Hoy: `DELETE /api/bookmarks/{bookmark_id}` (ID interno autoincremental).
Cambio: la ruta recibe `proceso_id: str` y el query pasa a filtrar por
`Bookmark.proceso_id == proceso_id AND Bookmark.user_id == current_user.id`.
Motivo: el frontend siempre tiene el `proceso_id` a mano (viene en cada card de
SECOP); exigirle el ID interno del bookmark obligaría a mapear uno a otro sin
necesidad.

### 1.2 `POST /api/saved-searches`
Hoy: `SavedSearchCreate.filters_json: str` (el cliente serializa el JSON a mano).
Cambio: `SavedSearchCreate.filters: dict`. El router hace
`json.dumps(payload.filters)` antes de guardar en la columna `filters_json`
(sin tocar `models.py` — la columna sigue siendo `TEXT`, solo cambia el shape de
la API). `SavedSearchOut.filters: dict` también reemplaza a `filters_json: str`
en la respuesta (`json.loads` de la columna al serializar la salida), para que
el frontend nunca maneje JSON serializado a mano en ninguna dirección.

No hay migración de datos: no hay saved-searches reales en producción (proyecto
en desarrollo, `portal.db` es descartable).

## 2. Frontend — navegación

Nuevo componente `frontend/src/components/Header.jsx`: barra superior con links
"Convocatorias" (`/`) y "Mi perfil" (`/profile`), y botón "Salir" (limpia
`localStorage` y redirige a `/login`). Se monta en `Home`, `Detail` y `Profile`.

## 3. Frontend — Home.jsx

- **Filtros nuevos** (texto libre, mismo patrón que `q`/`entidad` ya existentes):
  `departamento`, `ciudad`, `estado`, `modalidad`. Fechas con
  `<input type="date">` para `fecha_desde`/`fecha_hasta`.
- **Filtros en la URL:** se usa `useSearchParams` de `react-router-dom` para
  reflejar el estado de filtros en la query string y leerlo al montar. Esto
  habilita que Perfil "re-ejecute" una búsqueda guardada navegando a
  `/?q=salud&departamento=Antioquia...` sin pasar estado entre componentes.
- **Paginación** sin total (el backend no lo expone): botones
  "Anterior"/"Siguiente"; "Anterior" deshabilitado si `page === 1`; "Siguiente"
  deshabilitado si `items.length < page_size` (heurística: si la página vino
  incompleta, no hay más resultados).
- **Botón favorito (★) por tarjeta:** al montar Home, `GET /bookmarks` arma un
  `Set<proceso_id>` de favoritos existentes. El toggle hace `POST /bookmarks`
  (con snapshot `titulo`/`entidad`/`estado`/`url` del item) o
  `DELETE /bookmarks/{proceso_id}`, y actualiza el `Set` local sin re-fetch.
- **Botón "Guardar búsqueda":** pide un nombre (prompt simple) y hace
  `POST /saved-searches` con `{name, filters}` — los filtros activos, excluyendo
  `page`/`page_size`.

## 4. Frontend — Detail.jsx

Mismo botón de favorito que Home (★, mismo mecanismo: `GET /bookmarks` al
montar para saber el estado inicial, toggle con POST/DELETE).

## 5. Frontend — Profile.jsx (nueva página)

- `GET /auth/me` → datos del usuario.
- `GET /bookmarks` → lista de favoritos, cada uno con botón "Quitar"
  (`DELETE /bookmarks/{proceso_id}`).
- `GET /saved-searches` → lista de búsquedas guardadas, cada una con:
  - "Re-ejecutar": `navigate('/?' + new URLSearchParams(filters))`.
  - "Eliminar": `DELETE /saved-searches/{id}`.
- Ruta `/profile` en `App.jsx`, protegida igual que `/` (redirige a `/login` si
  no hay sesión).

## 6. Normalización de valores vacíos de SECOP

Nuevo helper `frontend/src/utils/normalize.js`:

```js
const EMPTY_VALUES = new Set(['No Definido', 'No Adjudicado', '', null, undefined]);
export function displayValue(value, fallback = '—') {
  return EMPTY_VALUES.has(value) ? fallback : value;
}
```

Se aplica en Home (badge de estado), Detail (todos los campos mostrados) y
Profile (snapshot de bookmarks) — en cualquier punto donde se renderice un
campo crudo proveniente de SECOP.

## 7. Manejo de errores

- **Toggle de favorito:** un `409` en `POST /bookmarks` (ya existe) o un `404`
  en `DELETE /bookmarks/{proceso_id}` (ya no existe) se tratan como éxito
  silencioso — el estado resultante es el esperado, se evita mostrar error al
  usuario por una carrera de clics.
- **Interceptor global de axios (401):** hoy no existe manejo de expiración de
  token. Con más llamadas autenticadas (bookmarks, saved-searches, perfil), se
  añade un interceptor de respuesta en `App.jsx`: si cualquier llamada responde
  `401`, limpia `localStorage.token` y fuerza redirección a `/login`.

## 8. Verificación

1. **Backend (curl):** re-probar `DELETE /api/bookmarks/{proceso_id}` y
   `POST /api/saved-searches` con el nuevo shape `{name, filters}` — confirmar
   201/204 y que `GET /saved-searches` devuelve `filters` como objeto, no string.
2. **Frontend (navegador manual):** login → aplicar filtros → marcar favorito en
   una tarjeta de Home → verlo en Perfil → quitarlo desde Perfil → volver a Home,
   confirmar que ya no aparece marcado → guardar una búsqueda con nombre →
   re-ejecutarla desde Perfil → confirmar que los filtros de Home quedan
   aplicados igual que cuando se guardó.

## 9. Dirección visual — "Gaceta / expediente oficial"

El frontend actual usa clases Tailwind genéricas sin identidad propia (botones
rojos por defecto, texto azul de link estándar, cards sin jerarquía). Se
reemplaza por una dirección visual grounded en la propia materia del producto:
radicados de expediente con código (`CO1.REQ.10236807`), estados de un trámite
público (Convocado, Borrador, En aprobación, Adjudicado) y la idea de un sello
oficial que marca ese estado — no un template genérico de SaaS.

### Color (tokens Tailwind)
| Token | Hex | Uso |
|---|---|---|
| `paper` | `#EDEAE0` | Fondo — papel hueso |
| `ink-navy` | `#16233B` | Texto principal, títulos, líneas estructurales |
| `gold` | `#B8862E` | Acento de marca — links, filtros activos, wordmark del header |
| `stamp-green` | `#2F6E4F` | Tinta de sello — estados abiertos (ej. "Convocado") |
| `stamp-red` | `#A13D2C` | Tinta de sello — estados en trámite (ej. "Borrador", "En aprobación") |
| `stamp-grey` | `#6E6A5E` | Tinta de sello — estados cerrados / no definidos |

Mapeo estado → familia de tinta se centraliza en un helper
`frontend/src/utils/estadoFamilia.js` (ej. `"Convocado"` → `green`,
`"Borrador"`/`"En aprobación"` → `red`, resto/`"No Definido"` → `grey`) para no
repetir la lógica en cada componente que muestra el sello.

### Tipografía (Google Fonts, importadas en `index.css`)
- **Display** (`font-display`): *Roboto Slab* — wordmark del header, títulos de
  sección. Uso restringido, no en cuerpo de texto.
- **Body** (`font-sans`, default): *Inter* — texto de tarjetas, formularios,
  perfil. Prioriza lectura rápida de listados densos.
- **Mono** (`font-mono`): *IBM Plex Mono* — `proceso_id`, `referencia`,
  `precio_base`. Un radicado de expediente es efectivamente un código; se trata
  tipográficamente como tal.

### Layout — tarjeta de convocatoria (Home, Perfil) y cabecera de Detalle
```
┃ CO1.REQ.10236807                    ╱CONVOCADO╲  ★
┃ Contrato de Prestación de Servicios
┃ Universidad Pedagógica Nacional · Bogotá D.C.
┃ $54.926.550
```
- Barra vertical izquierda (`border-l-4`) coloreada según familia de tinta del
  estado.
- Radicado en `font-mono`, título en `font-display`, entidad/ubicación en
  `font-sans`, precio en `font-mono`.

### Elemento firma: `EstadoStamp`
Nuevo componente `frontend/src/components/EstadoStamp.jsx`: badge de estado
con rotación leve (1-2°), borde tipo troquel/notch (simulando un sello de
caucho), texto en mayúsculas con letter-spacing, color de borde/texto según
`estadoFamilia`. Reemplaza el texto plano de estado que hoy se muestra en
Home/Detail. Se reutiliza en Home (cada card), Detail (cabecera) y Profile
(lista de bookmarks) — es el motivo visual recurrente de la app.

### Alcance de implementación
> **Hallazgo de la auto-revisión de este spec:** Tailwind nunca se instaló de
> verdad en este proyecto — no hay `tailwind.config.js` ni el paquete en
> `frontend/package.json`. Las clases tipo `bg-red-500 text-white px-4 py-2
> rounded` que ya aparecen en `Home.jsx`/`Detail.jsx`/`Login.jsx`/`Register.jsx`
> son clases muertas (no se procesan a CSS real); de ahí el look sin estilo
> actual. **Decisión confirmada con el usuario:** se instala Tailwind (nueva
> dependencia mayor — requiere visto bueno según `CLAUDE.md`, ya obtenido) en
> vez de reescribir todo a CSS plano, porque reaprovecha las clases ya
> escritas en el código existente.

Instalar `tailwindcss` + `@tailwindcss/vite` (Tailwind v4, integración nativa
con Vite, sin `postcss.config.js` separado) y registrar el plugin en
`vite.config.js`. Tokens de color/fuente definidos vía `@theme` en
`index.css` (sintaxis CSS-first de Tailwind v4, no `tailwind.config.js`
clásico). Imports de Google Fonts también en `index.css`. Luego: componente
`EstadoStamp`, helper `estadoFamilia.js`, y aplicar la paleta/tipografía a
`Header`, `Home` (cards + filtros), `Detail`, `Profile`, y de paso corregir
`Login`/`Register` para que sus clases Tailwind existentes por fin se
rendericen con estilo real.

## Fuera de alcance de esta ronda

- Dropdowns con valores reales de SECOP para los filtros (se deja como texto
  libre, ver decisión en brainstorming).
- Conteo total de resultados / "página X de Y" (requeriría un `$select=count(*)`
  adicional al backend).
- Animaciones/microinteracciones más allá de transiciones simples de hover
  (fuera de alcance para no inflar el trabajo de una ronda ya amplia).
- Notificaciones, roles, exportar CSV, modo oscuro, i18n (ya fuera del MVP según
  `docs/SPEC.md §2`).
