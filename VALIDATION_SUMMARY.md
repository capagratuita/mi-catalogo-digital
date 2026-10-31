# Registro de validación — 2026-10-28

**Entorno:** local, Wrangler 4.154.0, `npm run dev` con `--ip 0.0.0.0 --port 8788`.  
**Estado:** flujo de contenido, admin e imágenes operativo.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm run dev` | `Ready on http://0.0.0.0:8788` |
| `GET /` | 200 `text/html` |
| `GET /api/content?key=config` | 200 JSON |
| `GET /api/content?key=catalogo` | 200 JSON |
| `GET /api/content?key=landing` | 200 JSON |
| `GET /api/content?key=faq` | 200 JSON |
| `POST /api/login` con contraseña incorrecta | 401 |
| `POST /api/login` con contraseña correcta | 200 `{ok:true}` + cookie |
| `GET /api/session` con cookie | 200 `{authenticated:true}` |
| `GET /api/session` sin cookie / tras logout | 401 |
| `PUT /api/content?key=config` sin cookie | 401 |
| `PUT /api/content?key=config` con cookie | 200 `{ok:true,updated_at}` |
| `PUT /api/content` con cookie para `catalogo`, `landing` y `faq` | 200 |
| `PUT` con moneda o categoría inválidas | 400 con `detalle` en español |
| `POST /api/upload` sin cookie | 401 |
| `POST /api/upload` con cookie (`pan-integral`) | 200 `{ok:true,url,key}` |
| `GET /api/image?id=pan-integral` | 200 `image/png` |
| `GET /api/image?url=items/pan-integral.png` | 200 `image/png` |
| `GET /api/image?id=no-existe` | 404 |
| `GET /api/image?id=../x` | 404 |
| `GET /admin/identidad` sin cookie | 302 a `/admin/index.html` |
| `GET /admin/identidad` con cookie | 200 |
| `GET /admin/catalogo`, `/admin/fotos`, `/admin/landing`, `/admin/faq` con cookie | 200 |
| `POST /api/logout` | 200; cookie invalidada |
| `GET /` y `GET /api/content?key=config` por IP LAN | 200 |
| Guardar identidad, catálogo, landing y FAQ desde el admin (navegador) | OK, persiste en KV |
| Subir foto y regenerar preview desde `admin/fotos.html` | OK |
| Ficha de producto: imagen, precio, descripción y chip tipo/categoría | OK |
| Contador del carrito y checkout por WhatsApp | OK; abre `api.whatsapp.com` con el mensaje |
| `PUT` de catálogo con `categorias_agendamiento` inexistente | 400 con `detalle` en español |
| `PUT` de catálogo con `categorias` tipadas (`producto`/`servicio`) | 200; GET devuelve el objeto |
| `PUT` con un producto en una categoría de servicio | 400 con `detalle` en español |
| `PUT` con `categorias` en formato array legacy | 200; se mantiene la compatibilidad |
| Sintaxis de JS de `functions/` y `public/assets/` | `node --check` OK |
| Sintaxis de scripts inline de los HTML | `node --check` OK |

## Estado local

- KV local: `config`, `catalogo`, `landing` y `faq` sembradas en `.wrangler/state`.
- Imágenes (migradas de R2 a KV `IMAGES` el 2026-10-28): 5 fotos servidas por `/api/image`; subida autenticada y 401 sin sesión verificados.
- `ADMIN_PASSWORD` vive en `.dev.vars`; no se imprime ni se versiona.

## No verificado todavía

- Interacción en navegador con las pestañas Productos/Servicios, la migración de categorías legacy y los checkboxes de `categorias_agendamiento`.
- Diseño a 375px y escritorio.
- Los scripts `validate-phase*.sh` y `test-all-phases.sh` no se usaron como prueba de runtime: son greps estáticos y tienen falsos positivos/negativos.
- No hay `.git`, `npm test`, `npm run lint` ni `npm run typecheck`.

## 2026-10-29 — Fase 1: servicios sin carrito
- Lógica `accionItem` probada con Node (producto mixto/solo-servicios, cotizar, reservar, consultar).
- jsdom contra `npm run dev` (KV local): en `mixto` los productos llevan «Añadir al Carrito» y los servicios «Consultar por WhatsApp»/«Reservar Cita»; en `solo-servicios` se oculta icono y enlaces del carrito, `/carrito` muestra aviso y la ficha de servicio no muestra el botón de carrito. Config restaurada a `mixto` tras la prueba.
- Pendiente: revisión visual a 375px en navegador real.

## 2026-10-29 — Fase 2: modelo de servicio
- Validadores movidos a `functions/_lib/validadores.js`; 15 casos probados con Node (ejemplos válidos; modalidad, variantes, incluye, URLs, email, `items_ids`).
- API real: PUT catálogo con variantes inválidas -> 400 en español; válido -> 200. PUT landing con item inexistente -> 400.
- jsdom: portada y ficha muestran «Desde», modalidad/zona/incluye/opciones; JSON-LD `AggregateOffer`; el admin recarga y reserializa los datos sin pérdidas y avisa de líneas de opciones mal escritas. Catálogo y landing locales restaurados.
- Nota: `wrangler pages dev` se cayó una vez por `SQLITE_BUSY` al recargar durante ediciones; reiniciar `npm run dev` lo resuelve.

## 2026-10-29 — Fase 3: identidad y confianza
- Hallazgo: `landing.secciones` no se pintaba en ninguna página pública. Ahora `index.html` renderiza texto, destacados, galería, contacto, sobre-mi y testimonios (todo con `textContent`, sin HTML inyectado).
- Node: 11 casos (acento claro/oscuro/no hex, landing antigua con colores, testimonios válidos/inválidos, contenido >2000, id reservado).
- Servidor real: PUT landing con acento `#ffd400` + secciones nuevas -> 200; upload de `sobre-mi` -> 200 y `GET /api/image?id=sobre-mi` -> 200; `<style>:root{--accent:#ffd400}</style>` en `/` y `/faq`; jsdom confirma las 6 secciones, foto, enlace, 2 testimonios, cards de destacados, galería y botones de contacto.
- Admin (jsdom): ida y vuelta exacta de secciones y testimonios, aviso de contraste (12.7:1 vs 1.1:1), «Sobre mí» listado en Fotos. Landing y foto locales restauradas.
- Pendiente: revisión visual a 375px/escritorio en navegador real (no hay Chrome en esta máquina).

## 2026-10-29 — Fase 4: reserva genérica y analítica
- `reserva_url` (config e items) sustituye a `calendly_url`; datos antiguos se siguen leyendo y el admin los migra al guardar. Node: 11 casos (token con inyección rechazado, reserva sin protocolo, datos antiguos válidos).
- Servidor real: token inválido -> 400; token válido -> beacon en `/`, `/faq`, `/producto?id=…`, ausente en `/carrito` y en 404; ficha de servicio usa `https://cal.com/...` y, con la config antigua restaurada, `calendly_url` sigue funcionando; admin Identidad migra el campo y solo guarda `analitica` si hay token.
- jsdom no pudo cargar `static.cloudflareinsights.com` (sin red en el sandbox): la presencia del `<script>` está verificada, la carga real del beacon no.

## 2026-10-29 — Fase 5: seguridad y calidad
- `npm test`: 17 pruebas (Node `--test`) pasan; una mutación (contraste mínimo 4.5→1) hace fallar la prueba de acento, y revertida vuelve a 17/17.
- Login real: 5 fallos -> 401; el 6.º y un intento con contraseña correcta -> 429 con `Retry-After`; tras borrar `intentos:127.0.0.1` del KV local el login correcto devuelve 200. En local la IP es `127.0.0.1`.
- No probado en runtime: el `aviso` de contraseña corta (la local tiene 20 caracteres; solo revisado por lectura).
- Eliminados `validate-phase*.sh` y `test-all-phases.sh`. `package.json` gana `"type": "module"` y `"test"`.

## 2026-10-29 — Editor de Landing por pestañas
- jsdom contra `npm run dev`: sin tocar nada, `obtenerLanding()` devuelve exactamente los datos guardados; pestañas con roles ARIA y flechas/Inicio/Fin; marcar items, renombrar (la pestaña se actualiza), añadir sección desde el selector de tipo (6 opciones), testimonios en tarjetas, subir, eliminar y guardar real (200). Item inexistente: fila en rojo y, al guardar, el error del servidor se muestra completo. Landing local restaurada.
- Corregido de paso: `admin.putContent` solo mostraba «JSON inválido»; ahora muestra `detalle` (afecta a todos los formularios del admin).
- Pendiente: revisión visual a 375px (pestañas con scroll horizontal) en navegador real.

## 2026-10-29 — Editor de opciones de precio en Catálogo
- Las opciones de precio pasan de un textarea con `|` a filas (nombre, precio, minutos opcional) con «+ Añadir opción» (máx. 6) y «Quitar».
- jsdom contra `npm run dev`: carga las 2 opciones guardadas; la salida de `obtenerCatalogo()` es igual al original salvo `calendly_url` → `reserva_url` (migración esperada); fila vacía ignorada; opción nueva (`45.5`, 90 min) leída; precio negativo y nombre vacío dan error específico en español; el botón se deshabilita en 6 filas; quitar devuelve el foco al botón de añadir; un producto no lleva `variantes`; guardado real 200. Catálogo local restaurado.
- jsdom descarta la coma decimal en `<input type=number>`, por eso la prueba usó punto; el código acepta también coma.
- Pendiente: revisión visual a 375px en navegador real.

## 2026-10-29 — Posición de secciones y orden del menú del admin
- `secciones[].posicion` (`antes|despues`): 18 pruebas Node pasan (nueva: valor inválido rechazado). Servidor: `posicion: 'arriba'` -> 400 en español; `antes` -> 200; la portada queda `hero > secciones-antes > catalogo > secciones-landing`. jsdom: el editor muestra el selector (defecto «Después del catálogo»), la ida y vuelta conserva `posicion` y la clave se omite cuando es `despues`. Landing local restaurada.
- Menú del admin: General · Landing · Catálogo · Fotos · FAQ · Respaldo (la URL sigue siendo `/admin/identidad`).
- Pendiente: revisión visual a 375px y en escritorio.

## 2026-10-29 — Separador entre pestañas fijas y secciones (Landing)
- Las pestañas fijas (Portada, Apariencia y SEO) quedan a la izquierda y un separador con la etiqueta «Secciones» las divide de las pestañas de cada sección. jsdom: el separador es `role="presentation"` (no entra en la navegación por flechas: de Apariencia pasa directo a la primera sección) y también aparece si no hay ninguna sección. No se guardó nada en el servidor.
- Pendiente: revisión visual a 375px y en escritorio.

## 2026-10-29 — Estilos visuales (`tema.estilo`) y primera revisión en navegador real
- Hallazgo: `estilo` se guardaba pero no hacía nada. Ahora cambia radios, sombras, títulos y espaciado (variables en `styles.css`; `data-estilo` en `<html>` desde el servidor y desde `aplicarTema`). La prueba con el KV local no se notaba porque sus datos tenían `estilo: rustico`, que antes no hacía nada.
- Se instaló Chromium con Playwright en el directorio temporal (fuera del repo). `moderno` queda pixel-idéntico al CSS anterior a 375 y 1280 px sin contar fotos (las fotos difieren por decodificación, no por CSS). 40 combinaciones página × estilo × ancho: sin scroll horizontal, sin errores de JS y con el atributo correcto.
- Se corrigieron fallos visibles solo en navegador real: sombra sólida desplazada en la barra de `rustico` (muesca en el borde), selector de color del admin que se veía como una barra gris, choque del título con «Cerrar Sesión», nota cortada en la lista de items y botones del formulario pegados.
- Revisado a ojo: portada en los 4 estilos (375 y 1280), editor de Landing (portada, apariencia, sección) y filas de opciones de precio en Catálogo a 375px. Sin revisar a ojo: ficha, carrito y FAQ, y un celular real.

## 2026-10-29 — Rediseño visual más limpio (referencia: boluda.com)
- Se capturó el sitio de referencia con Chromium (Playwright) para identificar qué lo hace limpio: fondo blanco, una tipografía, un color de marca, tarjetas con borde fino y sin sombras, un botón principal por pantalla.
- Cambios en `styles.css` y las 4 páginas públicas: paleta blanca (`--bg` #FFFFFF, `--bg-alt` #F6F7F9, `--line` #E4E7EC), Inter variable alojada en el sitio, hero claro sin degradado, tarjetas con acción única de contorno, navegación con logo/enlaces/carrito en SVG (móvil en dos filas ordenadas), pie claro con enlaces de texto, iconos sin emojis, placeholder nuevo y rejillas centradas.
- Fallo previo descubierto al verlo: en la ficha la rejilla de dos columnas estaba en el contenedor equivocado (información bajo la foto y mitad derecha vacía). Corregido; además la acción principal de un servicio ahora va antes que «Volver al Catálogo».
- Revisado en Chromium: portada (1280 y 375), ficha de servicio (1280), carrito con items (1280), FAQ (375), admin General y los otros 3 estilos sobre la nueva base. 40 combinaciones página × estilo × ancho sin desbordes ni errores de JS; `solo-servicios` oculta icono y enlace de pie, `mixto` los muestra; 18 pruebas pasan; contrastes de texto AA (muted 6.0:1, ok 6.6:1).
- Sin revisar: celular real, ficha de producto a 375px, y landing con las secciones «Sobre mí» y «Testimonios» llenas (el KV local no las tiene).

## 2026-10-29 — Tarjetas: redondeadas, tenues y con el hover de boluda.com
- Se midió el hover de la referencia con Chromium: `translateY(-4px)` + `box-shadow: 0 10px 30px rgba(0,0,0,.12)`, transición 0,1 s, y toda la tarjeta es un enlace. Replicado (0,15 s): computado en el sitio = `matrix(1,0,0,1,0,-4)` y la misma sombra; sin `prefers-reduced-motion` se desactiva.
- Tarjetas con radio 20px, fondo tenue `#F6F7F9` (blanco sobre fondos grises) y botón blanco de borde fino; se quitó el overlay «Ver detalles».
- Toda la tarjeta lleva a la ficha (enlace del título extendido): probado en Chromium que el clic sobre la foto, bajo el título, junto al precio, en el pie y entre el botón y el borde abre la ficha; el botón «Añadir al Carrito» suma al carrito sin navegar y «Consultar por WhatsApp» abre WhatsApp en otra pestaña; el foco de teclado dibuja un contorno de 3px en la tarjeta.
- Fallo propio corregido: el contenedor de la acción tapaba el enlace en su relleno (`pointer-events: none` en el contenedor y `auto` en los botones). Mis primeras pruebas fallaron por hacer clic fuera de la ventana, no por el CSS.
- 18 pruebas pasan; 40 combinaciones página × estilo × ancho sin desbordes ni errores de JS. Landing local restaurada.

## 2026-10-29 — Esquinas de las tarjetas por estilo
- Minimalista (12px, tarjetas blancas sin fondo tenue, sin sombra), Rústico (14px) y Moderno (20px) con esquinas redondeadas; Elegante queda recto (0px) a propósito. Radios calculados en Chromium: tarjeta 20/12/14/0 px, botón 12/10/10/0 px, filtro 999/8/10/0 px. Capturas revisadas de los 4 estilos.
- 18 pruebas pasan; 40 combinaciones página × estilo × ancho sin desbordes ni errores de JS. Landing local restaurada (rústico, serif).

## 2026-10-29 — Reorientación a catálogo personal, `perfil`/`tipo_catalogo`, TikTok y YouTube
- `npm test`: 21 pruebas pasan (nuevas: `normalizarConfig` traduce `negocio`/`modo_negocio`; `redes.tiktok` inválida se rechaza; `tiktok`/`youtube` válidos o ausentes se aceptan).
- `npm run dev` contra el KV local, que aún guarda el formato antiguo (`negocio`): `GET /api/content?key=config` devuelve `perfil` ya normalizado y `GET /` responde con el título correcto del sitio.
- No verificado: `PUT /api/content` con el formato nuevo y con un respaldo antiguo contra el servidor (solo cubierto por pruebas unitarias); el admin General (campos nuevos de TikTok/YouTube, selector «Tipo de catálogo», guardado conservando `tono_chat`), el pie con los enlaces nuevos y el resto de textos cambiados no se vieron en un navegador.

## 2026-10-29 — Foto de cada item dentro de Catálogo (se elimina admin/fotos)
- `npm test`: 21 pruebas pasan. Chromium (Playwright) contra `npm run dev` a 375px: en un item guardado «Subir foto» sube y muestra la miniatura; en un item nuevo sin guardar el botón está desactivado con «Guarda el catálogo para poder añadir la foto.»; sin desbordes horizontales.
- `/admin/fotos` con cookie responde con la página de Catálogo en local. No verificado: la regla `public/_redirects` (301) en un despliegue real de Pages.
- No verificado: renombrar el `id` de un item ya guardado (el botón se desactiva hasta guardar; la foto antigua queda huérfana, como antes) ni el flujo completo en navegador real fuera de este script.
- La prueba subió una foto roja de prueba a `pan-integral` en el KV local `IMAGES`.

## 2026-10-29 — Orden de items, galería de servicios y tarjetas de producto estáticas
- `npm test`: 22 pruebas pasan (nueva: galería solo en servicios, máx. 6, `n` 1–6 sin repetir, `alt` ≤100, colisión de ids `x-g1`).
- `npm run dev` + curl: subir `taller-masa-madre-g1…g5` devuelve 200; subir `pan-integral-g1` devuelve 400 («solo los servicios pueden tener galería»); `PUT catalogo` con `galeria` devuelve 200.
- Los scripts inline de `producto.html`, `admin/catalogo.html` e `index.html` pasan `node --check`.
- No verificado en navegador (Brave headless no cargó la página): mosaico en sus 4 disposiciones, visor, editor de galería, botones Subir/Bajar y tarjetas de producto estáticas a 375px y escritorio.

## 2026-10-29 — Revisión de coherencia de la UI (colores, radios, notificación)
- `npm test`: 22 pruebas pasan. Comprobado por script que toda `var(--x)` usada en CSS/HTML está definida.
- Chromium (Playwright, 1280px y 375px) contra `npm run dev`: ficha de `taller-masa-madre` con el mosaico original (principal a la izquierda, extras a la derecha) sin cambios de disposición.
- No verificado en navegador: los editores de `admin/catalogo.html` y `admin/landing.html` tras el cambio de colores y radios, ni la `.notificacion` (añadir al carrito, copiar enlace).


## 2026-10-29 — SEO: HTML real, sitemap, LocalBusiness, dirección, URLs limpias, longitudes, cabeceras
- `npm test`: 34 pruebas pasan (nuevas en `test/seo.test.mjs`: lista estática, `xmlSitemap` con `lastmod` y sin items no disponibles, `zonasAtendidas`, `direccionPostal`, `rutaItem`, `recortar`, `tituloPagina`, `localeOg`; en `validadores.test.mjs`: `perfil.direccion`; en `acciones.test.mjs`: `textoDireccion`).
- `npm run dev` + curl: la portada trae `h1` del hero y `#catalogo-estatico`; la ficha trae `h1`, descripción y `alt`; `sitemap.xml` muestra `lastmod` en `/faq` tras un `PUT` de `faq` (el `PUT` guarda `updated_at` como metadata); `PUT config` con `direccion` válida pone `address` en el JSON-LD, y sin ciudad devuelve 400 («la ciudad es obligatoria»); `LocalBusiness` con `areaServed` en la portada y `Service.areaServed` en la ficha de servicio.
- Rutas: `/servicio/taller-masa-madre` y `/producto/pan-integral` → 200; `/servicio/<producto>`, `/producto/<servicio>` y `/producto?id=…` → 301 a la URL que corresponde; ids inexistentes → 404; canonical y sitemap con las URLs limpias. `og:locale` = `es_PE`; `og:image:alt` en la ficha; `/assets/fonts/*` con `Cache-Control` de 30 días y `X-Robots-Tag: noindex` en `/admin/*`.
- Chromium (Playwright, 375px) contra `npm run dev`: de la portada a `/servicio/asesoria-pan` y a `/producto/pan-integral` con estilos, título, precio y enlace de compartir correctos; `/producto?id=taller-masa-madre` termina en `/servicio/taller-masa-madre`; sin errores de consola.
- Los datos de prueba (`faq`/`config`) se restauraron tras las pruebas de `PUT`.
- **Producción (`personal-ecommerce.pages.dev`, 2026-10-30, solo GET):** `/servicio/despliegue-solucion` y `/producto/mug-capa-gratuita` → 200; las URLs de tipo cruzado y `/producto?id=…` → 301 a la URL limpia; ids inexistentes y `/producto` sin id → 404 con `noindex`; el sitemap trae `lastmod` y las URLs limpias; `_headers` aplicado (`nosniff`, `X-Frame-Options`, caché de la fuente, `X-Robots-Tag` en `/admin/*`); ficha con canonical `/servicio/…`, `h1` y `og:locale` `es_PE`; la portada es `Organization` (sin dirección) y trae `#catalogo-estatico`. Es decir, `env.ASSETS` y las 301 funcionan en Pages.
- No verificado: recorte de descripciones largas con datos reales del servidor (solo por pruebas unitarias y un texto largo aparte); `items` no disponibles en el sitemap contra el servidor (el KV local no tiene ninguno); el formulario «Dirección» del admin y el `<address>` del pie a ojo en navegador; el pie en `/carrito` y `/faq`.

## 2026-10-30 — Pruebas de integración del servidor (`npm run test:integracion`)
- `npm test`: 34 pruebas pasan (sin cambios). `npm run test:integracion` local: 29 ok, 0 fallos, 3 omitidas (datos que el ejemplo no tiene: item no disponible, descripción >155 y foto; las cubre la variante activa con datos fabricados). Remoto (`BASE_URL=https://personal-ecommerce.pages.dev`, solo GET): 20 ok, 0 fallos, 12 omitidas (11 «requiere modo local» y 1 por falta de item no disponible).
- Mutaciones comprobadas en local (revertidas): 301→302, sitemap sin filtrar `disponible` y `MAX_DESCRIPCION` 155→300 hacen fallar respectivamente la redirección, el sitemap y el recorte.
- El modo remoto no hizo login, subidas ni `PUT` autenticado. Con `BASE_URL=http://127.0.0.1:9` (sin servidor) las dos suites fallan en ~3 s con «BASE_URL … no responde» (2 reintentos).

## 2026-10-30 — Se elimina el chat con IA
- Borrados `functions/api/chat.js`, el bloque `[ai]` de `wrangler.toml`, los campos `perfil.tono_chat` y `faq.tono` (ejemplos, validadores y admin) y las secciones de chat de README y de la guía. El validador ya no los exige; con datos antiguos que los traen sigue validando.
- `npm test` y `npm run test:integracion` (local) pasan; ver resultado en la sesión.

## 2026-10-30 — Cambio de nombre a catalogo-personal
- `package.json`/`package-lock.json` (`name`, `repository`), `wrangler.toml` (`name`), guía y rutas de `AGENTS.md`/`AGENTS_SUMMARY.md` actualizados. Las entradas anteriores conservan `personal-ecommerce.pages.dev` porque es la URL contra la que se probó entonces.

## Migración a Workers (2026-10-30)

- `npm test`: 34 ok. `npm run test:integracion` (local, `wrangler dev` 4.154): 29 ok, 0 fallos, 3 omitidas (datos que el ejemplo no tiene).
- A mano con `wrangler dev`: `/admin/*` sin cookie → 302 a `/admin/index.html` (→ 307 `/admin/`); `/faq.html` → 307 `/faq`; `/servicio/nope` → 404; cabeceras de `_headers` presentes.

### Despliegue real con el botón (2026-10-30, cuentas limpias de Cloudflare y GitHub)

| Prueba | Resultado |
|---|---|
| Botón con `wrangler.toml` | Crea los KV del formulario pero `wrangler deploy` crea otros distintos; los del formulario quedan sin usar. |
| Nombre de KV = `<worker>-kv`/`-images` | Falla: error 10014 «namespace with this title already exists». |
| Nombres por defecto (iguales entre sí) | Falla: «Cannot provision a KV Namespace with the title … because it already exists». |
| Botón con `wrangler.jsonc` y nombres distintos (`catalogo-datos`, `catalogo-fotos`) | Despliega; bindings enlazados a los KV creados, sin «Provisioning». |
| `/admin` con la contraseña del formulario | Entra (también tras un primer despliegue fallido). |
| Segundo build (commit) | Mismos IDs de KV; datos intactos. |
| Workflow de sincronización (copiado a mano, repo creado por el botón) | Detecta 3 archivos distintos, sube la rama `sincronizar-template`; `GitHub Actions is not permitted to create or approve pull requests` → enlace en el resumen; PR manual, merge y redeploy correctos. |
| Retry build de un build creado por el botón | No disponible («seed_repo override»). |

- **No verificado:** creación automática del PR con *Allow GitHub Actions to create and approve pull requests* activado; sigue la guía una persona ajena; el aviso de `wrangler.jsonc` cambiado en el PR (el normalizador se probó solo con un caso de ejemplo).

### Paquetes de inicio y secciones únicas (2026-10-31)

- `npm test`: 44 ok (nuevos: `paquetes.test.mjs` ×9, unicidad en `validadores.test.mjs`). `npm run test:integracion` local: 34 ok, 0 fallos, 3 omitidas (importa cada paquete por `PUT` en el orden de Respaldo, comprueba portada, ficha y sitemap, y que una sección única repetida da 400).
- Chromium (Playwright, 375 px) sobre `/admin/landing.html`: con el ejemplo (trae «Sobre mí» y «Contacto») esos dos botones salen deshabilitados con «Ya la tienes: solo puede haber una.»; tras añadir «Testimonios» también; en el selector de tipo de una sección las ocupadas salen `disabled`; al eliminar la sección vuelve a habilitarse. Sin errores de página.
- Verificado después en el despliegue real (2026-10-31, repo creado por el botón y sincronizado): el paquete `mixto.json` se importa desde Respaldo (config, catalogo, landing y faq «importado») y Contacto, Sobre mí y Testimonios salen atenuados en el selector. No verificado: cómo se ven los paquetes en el sitio con fotos.

### Sincronización con PR automático (2026-10-31, repo creado por el botón)

- Con *Allow GitHub Actions to create and approve pull requests* activado, el workflow abrió solo el PR «Sincronizar con el template».
- El build de vista previa de la rama falló: `npx wrangler preview` (beta) exige un bloque `previews` con KV propios («Your Wrangler configuration is missing a `previews` block»). Producción no se ve afectada (`wrangler deploy`).
- El aviso «wrangler.jsonc del template cambió» salió en falso (difieren `name` e `id` de KV). Corregido: comparación estructural con `jq`; probado en local con una copia reescrita por el asistente (igual) y con un cambio real en `run_worker_first` (detectado).
- Verificado después (2026-10-31): el workflow corregido ya no avisa en falso (PR #2 sin la línea de `wrangler.jsonc`), y apagar «Builds for Preview branches» (Settings → Builds → Previews Base) elimina el check fallido del PR. El «Preview command» `npx wrangler versions upload` no sirve: falla por el nombre del Worker.

## 2026-10-31 — Cambio de nombre a mi-catalogo-digital
- `package.json`/`package-lock.json`, `wrangler.jsonc`, README, guía, workflow y `AGENTS.md` actualizados; `AGENTS_SUMMARY.md` consolidado en `AGENTS.md` (sección 14). Las entradas anteriores conservan los nombres y URLs con los que se probó entonces.

## 2026-10-31 — Verificación de la sección SEO del README y ejemplo en solo-servicios
- `npm run dev` + curl contra el KV local: la portada trae título, descripción, canonical, `og:locale` `es_PE`, `h1` y `#catalogo-estatico`; `#secciones-antes` y `#secciones-landing` llegan vacíos (se pintan con JavaScript). Fichas con `Service`/`Product` y `InStock`; 301 en `/producto?id=…` y en tipo cruzado; 404 con `noindex`; carrito con `noindex`; `/admin/*` con `X-Robots-Tag`; `robots.txt` y sitemap correctos.
- `PUT config` sin cookie de sesión no probado aquí; con sesión: el sitemap gana `<lastmod>`; añadir `perfil.direccion` cambia el JSON-LD a `LocalBusiness` al instante en el mismo lugar (la caché se invalida en el `PUT`; el retraso de ~60 s aplica a otros centros de datos y no se midió). Config restaurada después.
- `config/config.example.json` pasa de `mixto` a `solo-servicios` (decisión del mantenedor). `npm test`: 44 ok; `npm run test:integracion` local: 34 ok, 0 fallos, 3 omitidas.

## 2026-10-31 — Sitemap respeta `tipo_catalogo` (1.0.1)
- Motivo: con el ejemplo en `solo-servicios` la portada ocultaba los 5 productos, pero el sitemap los listaba y sus fichas respondían 200 (páginas huérfanas). `xmlSitemap` recibe ahora `config` y filtra con `tiposVisibles`, igual que `htmlCatalogoEstatico`. Las fichas del tipo oculto siguen respondiendo 200 (se pueden compartir) y no llevan `noindex`.
- `npm test`: 45 ok (nueva prueba por tipo). `npm run test:integracion` local: 34 ok, 0 fallos, 3 omitidas (la prueba del sitemap ahora comprueba presencia o ausencia según el tipo; la del item no disponible pasa antes a `mixto`).
