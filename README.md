# Mi Catálogo Digital

Template para publicar **un catálogo de tus servicios** (y, como extra, productos o mercancías), utilizando la capa gratuita de GitHub (guarda tu copia del código) y de Cloudflare (publica el sitio). Pensado para profesionales independientes, emprendedores y proyectos personales o de hobby.

El catálogo se publica **sin costo** en una dirección de Cloudflare del tipo `https://<proyecto>.<subdominio>.workers.dev` (el `<subdominio>` es personalizable, pero si no lo configuras, es uno aleatorio). Si prefieres una dirección propia, como `www.mi-nombre.com`, puedes configurarla después de desplegar: **el dominio se compra aparte y tiene un costo** (normalmente anual, según la extensión y dónde lo compres); lo demás sigue usando la capa gratuita de GitHub y Cloudflare. Detalles en [Publicar tu sitio](#publicar-tu-sitio) y [Usar tu propio dominio](#usar-tu-propio-dominio).

**No es una tienda online** ni pretende competir con Shopify o WooCommerce: no hay pasarela de pago, stock, impuestos ni envíos. Quien te visita te consulta o reserva una cita, y el cierre de las ventas lo acuerdas tú por WhatsApp.

Cada persona hace su propio fork y despliega su propia instancia. No es un SaaS multi-inquilino.

## Qué incluye

- **Servicios:** precio fijo, «Desde X» o «Precio a consultar»; duración, modalidad (online/presencial), zona, qué incluye (en cápsulas) y opciones de precio (sesión suelta, packs).
- **Una sola acción por servicio:** «Reservar Cita» (Calendly, Cal.com, Google Calendar…) o «Consultar por WhatsApp». Los servicios no usan carrito.
- **Productos (extra):** carrito sencillo que consolida pedido y arma una pregunta por WhatsApp. Se oculta si el tipo de catálogo es «Solo servicios» (el valor por defecto).
- **Tipo de catálogo:** solo servicios, solo productos o mixto.
- **Portada editable:** portada con imagen de fondo propia, textos, destacados, galería, *Sobre mí* con foto, testimonios, contacto y color de acento propio.
- **Presentación:** estilo visual a elegir y, si quieres, servicios, productos, destacados y galerías como **carrusel** en vez de rejilla (*Mi página → Apariencia y SEO*).
- **Precios a tu manera:** símbolo propio delante del precio (`S/`, `S/.`, `$/.`, `Bs.`…) y formato de miles y decimales a elegir (*General*); las duraciones se leen como «45 min» o «1 h 30 min».
- **Logo** y **foto de fondo** de la portada: se suben desde el panel (el logo sale junto al nombre en la cabecera).
- **FAQ**, **SEO** (título, descripción, vista previa al compartir, datos estructurados, sitemap) y analítica opcional sin cookies (Cloudflare Web Analytics).
- **Panel de administración** protegido con contraseña, con límite de intentos, subida de fotos optimizada y respaldo del contenido y de las fotos.
- Frontend en HTML, CSS y JavaScript puros; todo en la capa gratuita de GitHub y Cloudflare (Workers con archivos estáticos y Workers KV); solo el dominio propio, si decides usarlo, tiene costo.

## SEO: cómo te encuentran en Google y cómo se ve al compartir

El SEO viene resuelto de fábrica. No hay que instalar nada ni tocar código: lo que escribes en el panel se convierte en la información que leen Google y las apps de mensajería.

### Qué ve un buscador

Cada página se arma en el servidor en el momento en que se pide, así que **Google recibe el texto ya escrito** y no depende de que el navegador ejecute JavaScript:

- **Portada:** el título y el subtítulo reales, más una lista simple con todos tus servicios y productos. Cuando la página carga para una persona, esa lista se reemplaza por las tarjetas con foto.
- **Ficha de cada servicio o producto:** su nombre como título principal, la descripción completa y el texto alternativo de la foto.
- **Preguntas frecuentes:** página propia (`/faq`) con cada pregunta y respuesta.

### Qué lleva cada página

| Elemento | De dónde sale | Detalle |
|---|---|---|
| Título | Portada: *Mi página → Apariencia y SEO*. Fichas y FAQ: «Página - Nombre del negocio» | Si pasa de 60 caracteres se usa solo la parte de la página |
| Descripción | Portada: *Apariencia y SEO*. Fichas: descripción del item | Se recorta a 155 caracteres, sin partir palabras |
| Enlace oficial (canonical) | Automático | Evita que Google la tome por un duplicado |
| Vista previa al compartir (WhatsApp, Facebook, Telegram, X) | Foto del item; si no tiene, tu logo | El idioma se ajusta a tu moneda (PEN→Perú, MXN→México, COP, ARS, CLP, VES, GTQ, BOB, CUP, DOP, HNL, EUR→España; USD→español genérico de Latinoamérica) |
| Datos estructurados (JSON-LD) | Perfil, catálogo y FAQ | Ver abajo |

**Datos estructurados** (información ordenada que Google entiende y puede mostrar en sus resultados):

- Tu **negocio y redes**. Si rellenas la **Dirección** en *General*, se marca como **negocio local**, que es lo que Google exige para búsquedas de tu zona. Sin dirección se presenta como organización.
- Las **zonas donde atiendes**, tomadas de los servicios que no son solo online.
- Cada **servicio o producto** con su precio. Si un servicio tiene opciones de precio, se indica «desde» el más bajo. Un item marcado como no disponible sigue existiendo, pero figura como agotado.
- Las **preguntas frecuentes**.

### Direcciones y mapa del sitio

- Cada ficha tiene una dirección limpia: `/servicio/{id}` para servicios y `/producto/{id}` para productos. Las direcciones antiguas (`/producto?id=…`) redirigen a la nueva, y si el tipo no coincide también. Un id que no existe responde 404 con instrucción de no indexar.
- `/sitemap.xml` se genera solo: portada, FAQ y cada item disponible del tipo que muestra tu portada (con «Solo servicios» no se listan los productos, y al revés). Cada bloque lleva la fecha de su último guardado en el panel, que le sirve a Google para saber qué cambió.
- `/robots.txt` también es automático.
- **No se indexan** el carrito, el panel de administración ni las páginas inexistentes.

### Qué pasa cuando editas contenido

No hay que "regenerar" nada. Al pulsar **Guardar**, la siguiente visita (de una persona o de Google) ya recibe la página con lo nuevo.

| Lo que editas | Qué cambia para Google |
|---|---|
| Servicios y productos | Ficha, lista de la portada, sitemap y datos estructurados |
| Portada (título, subtítulo, SEO) | Directo en el HTML de la portada |
| Secciones (Mensaje, Sobre mí, Testimonios, Contacto…) | Se pintan con JavaScript al cargar; Google las lee, pero más tarde y con menos prioridad que el resto |
| Preguntas frecuentes | Página `/faq` y datos de preguntas |
| General (nombre, dirección, redes, logo) | Cabecera, pie de página, datos del negocio y vista previa |

Dos retrasos normales:

1. **Hasta ~1 minuto** en verse tus cambios desde otros lugares del mundo: el sistema guarda una copia temporal de 60 segundos para cuidar los límites gratuitos. Donde guardas, el cambio se ve de inmediato; una foto nueva puede tardar lo mismo en otros lugares.
2. **Google decide cuándo vuelve.** El proyecto garantiza que cuando venga encuentre todo actualizado, pero no puede obligarlo a pasar. Para acelerarlo:
   1. Entra a [Google Search Console](https://search.google.com/search-console) y verifica tu dominio o la dirección `*.workers.dev`.
   2. En *Sitemaps*, envía `https://<tu-sitio>/sitemap.xml` (una sola vez).
   3. Tras un cambio importante, usa *Inspección de URLs* → *Solicitar indexación* en esa página.

### Cómo sacarle partido

- Rellena **título y descripción de la portada** (*Mi página → Apariencia y SEO*) con lo que buscaría tu cliente («Psicóloga en Lima», «Clases de guitarra online»), no solo con tu nombre.
- Pon **nombre y descripción claros** a cada servicio: son el título y el resumen de su ficha.
- Rellena la **Dirección** si atiendes en un lugar físico.
- Sube tu **logo** (cuadrado, 512 × 512 px, mínimo 200 × 200; PNG o WebP con fondo transparente) y, si quieres, una **imagen de fondo** para la portada (horizontal, 1920 × 1080 px, mínimo 1280 × 720). El panel indica estas medidas junto a cada campo y avisa si la imagen es más pequeña.
- Sube **una foto por servicio o producto**: es la imagen de la vista previa al compartir. Mantenla ligera (unos 300 KB o menos); el panel ya la reduce a JPEG de 1200 px y unos 250 KB, porque WhatsApp no muestra fotos WebP ni muy pesadas.
- Mantén el **FAQ** con preguntas reales de tus clientes.
- Con un **dominio propio** (opcional; el dominio tiene un costo) el sitio gana en confianza ante clientes y buscadores (ver [Usar tu propio dominio](#usar-tu-propio-dominio)).

### Lo que no hace a propósito

No genera mapa de imágenes ni versiones en varios idiomas (`hreflang`: el sitio usa uno solo), y no modifica `robots.txt`. Tampoco garantiza posiciones en Google: el SEO técnico está cubierto, pero el contenido útil y las visitas dependen de ti.

## Límites

El panel y la API validan estos topes al guardar; si te pasas, el guardado responde con un mensaje en español que dice cuál.

| Qué | Límite |
|---|---|
| Items del catálogo | **200 en total**, entre productos y servicios (no hay tope separado por tipo) |
| Descripción de un item | 200 caracteres |
| Servicio: opciones de precio | 6 (nombre de hasta 60 caracteres) |
| Servicio: líneas de «qué incluye» | 8 (hasta 100 caracteres cada una) |
| Servicio: zona | 80 caracteres |
| Servicio: fotos extra de galería | 6, además de la principal (descripción de hasta 100 caracteres) |
| Preguntas frecuentes | 15 |
| Testimonios | 8 (texto de hasta 300 caracteres, autor 60, detalle 80) |
| Texto de una sección de la portada | 2000 caracteres |
| Nombre en la sección *Sobre mí* | 60 caracteres |
| Dirección | calle 120, ciudad 80, región 80, código postal 20, país de 2 letras |
| Secciones únicas | *Sobre mí*, *Contacto* y *Testimonios* solo pueden aparecer una vez |
| Foto subida | JPEG, PNG o WebP de hasta 5 MB; el panel la convierte a JPEG de hasta 1200 px y unos 250 KB |
| Logo | El panel lo reduce a 512 px (PNG o WebP conservan la transparencia) |
| Imagen de fondo de la portada | El panel la reduce a JPEG de hasta 1920 px y unos 400 KB |
| Símbolo de moneda | Hasta 6 caracteres (por ejemplo `S/.`) |
| Intentos de acceso al panel | 5 fallos en 15 minutos por IP; luego se bloquea |

Los límites de la capa gratuita de Cloudflare también cuentan: el KV de fotos admite 1 GB en total, y Workers KV 1.000 escrituras y 100.000 lecturas al día. Son los valores vigentes al escribir esto (octubre de 2026) y Cloudflare puede cambiarlos en el futuro; consulta los [límites de Workers KV](https://developers.cloudflare.com/kv/platform/limits/) para ver los actuales.

## Paquetes de inicio

En `config/paquetes/` hay tres paquetes completos listos para importar desde **Admin → Respaldo**: `solo-servicios.json`, `solo-productos.json` y `mixto.json`. Traen texto genérico («Servicio 1», «Producto 1»), FAQ, perfil y todos los tipos de sección de la portada, y los testimonios van marcados «[Ejemplo n]» (no son opiniones reales). No incluyen fotos: se suben desde Catálogo. En **Respaldo** también puedes descargar todas tus fotos en un `.zip` e importarlas de nuevo (importa primero el respaldo `.json`, porque cada foto necesita que su item exista). La [guía de despliegue en capagratuita.com](https://capagratuita.com) explica cómo elegir uno.

## Publicar tu sitio

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/capagratuita/mi-catalogo-digital)

El botón copia el proyecto a tu GitHub, crea los dos almacenes KV y despliega el Worker. Sigue la **[guía paso a paso en capagratuita.com](https://capagratuita.com)**: sin terminal. Para traer mejoras del template después, instala una vez el workflow *Sincronizar con el template* (el botón no copia `.github/`; la guía de capagratuita.com explica cómo) y ejecútalo a mano desde la pestaña Actions.

El sitio queda publicado **sin costo** en una dirección `https://<proyecto>.<subdominio>.workers.dev` (el `<subdominio>` es aleatorio si no lo has configurado en tu cuenta de Cloudflare). Si luego quieres una dirección propia, que sí tiene costo por el dominio, mira [Usar tu propio dominio](#usar-tu-propio-dominio).

### Notas del despliegue con el botón

- El botón **no hace fork**: copia el proyecto a tu cuenta de GitHub (historial nuevo) y crea el Worker con Workers Builds (`npm run deploy` = `wrangler deploy`). Un build creado así no se puede reintentar; para redesplegar hace falta un commit.
- El formulario pide dos nombres de KV y trae el mismo por defecto: **cámbialos a dos nombres distintos** (por ejemplo `catalogo-datos` y `catalogo-fotos`) o el despliegue falla con «title already exists». Un intento fallido deja KV sobrantes: bórralos antes de repetir.
- `ADMIN_PASSWORD` se pide en el formulario y queda guardada como secreto.
- Desactiva **Enable Preview builds**: el comando de vista previa (`wrangler preview`) falla en este proyecto. En un Worker ya creado: Settings → Builds → «Previews Base» → «Builds for Preview branches».
- La configuración debe seguir en `wrangler.jsonc` (con `wrangler.toml` el asistente no enlaza los KV) y sin `id` de KV en el repo del template.
- Si cambias el nombre del proyecto en el formulario, el asistente actualiza el repo de GitHub, `wrangler.jsonc` y `package.json`.
- Las URLs de vista previa están desactivadas (`preview_urls = false`): compartirían KV y contraseña con producción.

## Usar tu propio dominio

Por defecto el sitio se publica **sin costo** en `https://<proyecto>.<subdominio>.workers.dev`. El `<subdominio>` es personalizable, pero si no lo configuras Cloudflare te asigna uno **al azar** (como `mute-haze-3d90`), no uno con tu nombre. Puedes cambiarlo en *Workers & Pages* → *Account details* → *Subdomain*, pero conviene hacerlo **antes** de desplegar: después la dirección vieja deja de servir y la nueva tarda un par de minutos en tener certificado de seguridad y estar disponible.

Un dominio propio (`www.mi-nombre.com`) es opcional y se configura **después de desplegar**. **El dominio se compra aparte y tiene un costo** (normalmente anual, según la extensión y dónde lo compres); lo demás sigue usando la capa gratuita de GitHub y Cloudflare. A cambio es más fácil de recordar y transmite más confianza a clientes y buscadores.

### Cómo conectarlo

1. El dominio debe estar en tu cuenta de Cloudflare (registrado ahí o con sus nameservers apuntando a Cloudflare).
2. Entra al Worker: *Workers & Pages* → tu proyecto → *Settings* → *Domains & Routes* → *Add* → *Custom domain*, y escribe el dominio.
3. Cloudflare crea el registro DNS y el certificado HTTPS solos; puede tardar unos minutos.

Estos pasos son los de Cloudflare para cualquier Worker. No hace falta tocar `wrangler.jsonc` ni el código.

### Qué se adapta solo

Las direcciones que ven Google y las apps de mensajería se generan **con el dominio con el que se visita la página**, no con uno guardado en el proyecto. En cuanto entras por tu dominio, estos elementos ya lo usan: el enlace oficial (canonical), `og:url`, el sitemap, la línea `Sitemap:` de `robots.txt` y las direcciones de las fichas. No hay nada que configurar en el panel.

### Qué tener en cuenta

- **El sitio sigue respondiendo también en `workers.dev`** (`"workers_dev": true` en `wrangler.jsonc`). Ahí el canonical apunta a esa dirección, así que Google podría ver dos copias. Comparte y publica solo el dominio propio y, cuando funcione bien, apaga `workers.dev` (ver abajo).
- **La sesión del panel es por dirección:** si entras al panel por tu dominio y por `workers.dev`, tendrás que iniciar sesión en cada una.
- **Search Console:** verifica el dominio nuevo y envía su `/sitemap.xml` (ver «SEO»). Si ya habías enviado el de `workers.dev`, el nuevo es un sitio distinto para Google.
- **Cambiar de dirección tiene consecuencias:** quien tenga guardado el enlace antiguo, o lo haya compartido por WhatsApp, seguirá entrando por `workers.dev`. Conviene conectar el dominio antes de empezar a difundir el sitio.

### Apagar `workers.dev` cuando el dominio ya funciona

Lo habitual en producción es dejar una sola dirección pública. El enlace oficial (canonical) de cada página se genera con el dominio con el que se la visita, así que **no evita el duplicado**: en `workers.dev` se declara a sí misma como la oficial. Apagar esa dirección lo resuelve de raíz.

1. Comprueba que tu dominio abre la portada, una ficha y `/admin` con HTTPS.
2. Apaga `workers.dev` de una de estas dos formas:
   - En Cloudflare: *Workers & Pages* → tu proyecto → *Settings* → *Domains & Routes* → desactiva la dirección `workers.dev`.
   - En tu repositorio: pon `"workers_dev": false` en `wrangler.jsonc` y haz commit. El workflow de sincronización no sobrescribe `wrangler.jsonc`, así que el cambio se mantiene al traer mejoras del template; sí te avisará de la diferencia.

Tenlo en cuenta antes de apagarla:

- **Déjala encendida al principio.** El botón de despliegue y la guía usan esa dirección, y te sirve de respaldo si algo falla con el dominio.
- **Si ya la compartiste o Google ya la indexó,** apagarla deja esos enlaces sin respuesta hasta que se actualicen. El proyecto no redirige automáticamente de `workers.dev` al dominio: en ese caso, mantenla encendida unas semanas, publica el dominio nuevo y envía su sitemap en Search Console antes de apagarla.
- Estos pasos son los de Cloudflare para cualquier Worker.

## Probarlo en tu computador

Requiere [Node.js](https://nodejs.org) reciente (probado con la versión 22).

```bash
npm install
cp .dev.vars.example .dev.vars   # y escribe tu clave en ADMIN_PASSWORD=
npm run dev
```

Abre `http://localhost:8788` (el panel está en `/admin`). Sin guardar nada, el sitio muestra datos de ejemplo; en local, KV se simula automáticamente y no necesitas iniciar sesión en Cloudflare.

Para abrirlo desde el celular en la misma red, usa la IP de tu computador: `http://<IP>:8788`.

Si bloqueas tu propia IP con contraseñas incorrectas (5 fallos en 15 minutos): `npx wrangler kv key delete --binding=KV --local "intentos:127.0.0.1"`. Si `npm run dev` cae con `SQLITE_BUSY_RECOVERY`: `pkill -f workerd; pkill -f wrangler` y vuelve a arrancar.

### Sembrar el KV local

Los `config/*.example.json` no se cargan solos. Si borras `.wrangler/state` (el estado local persistido), vuelve a sembrar las cuatro keys, que deben llamarse exactamente `config`, `catalogo`, `landing` y `faq`:

```bash
npx wrangler kv key put --binding=KV --local config   --path=config/config.example.json
npx wrangler kv key put --binding=KV --local catalogo --path=config/catalogo.example.json
npx wrangler kv key put --binding=KV --local landing  --path=config/landing.example.json
npx wrangler kv key put --binding=KV --local faq      --path=config/faq.example.json
```

## Pruebas

```bash
npm test                  # validadores, límite de intentos, acciones del frontend, paquetes y SEO
npm run test:integracion  # servidor real
```

`npm test` usa el runner integrado de Node, sin dependencias. `npm run test:integracion` levanta su propio `wrangler dev` en un puerto libre, con un estado temporal que borra al terminar, y prueba fichas, redirecciones, portada, JSON-LD, sitemap, cabeceras, autenticación, subida de fotos e importación de los paquetes de inicio. También puede probar un sitio ya desplegado **en solo lectura** (solo GET/HEAD; nunca inicia sesión ni escribe):

```bash
BASE_URL=https://<tu-sitio>.workers.dev npm run test:integracion
```

No hay `lint` ni `typecheck`. Nada de esto reemplaza la prueba en el navegador: usa [docs/e2e-checklist.md](docs/e2e-checklist.md).

## Cómo está hecho

Un solo Worker (`src/worker.js`) con archivos estáticos (`public/`) y dos namespaces de Workers KV. No hay base de datos ni servicios de pago.

| Capa | Servicio |
|---|---|
| Páginas | Workers Static Assets (`public/`) |
| API y páginas con SEO | Worker (`src/worker.js`, rutas en `src/`) |
| Contenido | Workers KV (`config`, `catalogo`, `landing`, `faq`) |
| Fotos | Workers KV, namespace aparte (`IMAGES`; R2 exige método de pago) |
| Acceso al panel | Cookie firmada con `ADMIN_PASSWORD` |
| Citas | Enlace de reserva (Calendly, Cal.com, Google Calendar…), global u opcional por servicio |
| WhatsApp | Enlaces `wa.me` generados en el navegador |
| Carrito | `localStorage`, sin servidor |

| Binding | Local | Producción |
|---|---|---|
| `KV` | KV local automático | Namespace KV real |
| `IMAGES` | KV local automático | Segundo namespace KV real (fotos) |
| `ADMIN_PASSWORD` | `.dev.vars` (fuera de git; plantilla en `.dev.vars.example`) | Secreto (el botón lo pide) |
| `ASSETS` | Automático | `assets.binding = "ASSETS"` en `wrangler.jsonc` |

El contenido vive en KV, no en el repositorio. Los ejemplos de `config/*.example.json` se muestran hasta que guardas tu propio contenido desde el panel de administración. Los dos `kv_namespaces` de `wrangler.jsonc` van sin `id`: el botón o `wrangler deploy` los crean. No pongas IDs ni secretos en el repo (es público).

### Estructura

```text
public/
  index.html, producto.html, carrito.html, faq.html   # páginas públicas (cargan /assets/app.js)
  admin/*.html                                        # panel (carga ../assets/admin.js)
  assets/{app.js,admin.js,styles.css}, fonts/, images/
src/
  worker.js                                           # router: rutas → módulos, middleware, ASSETS
  _middleware.js
  index.js, faq.js, carrito.js, producto.js, producto/[id].js, servicio/[id].js   # páginas con SEO y datos inyectados
  sitemap.xml.js, robots.txt.js
  _lib/{auth,defaults,cache,paginas,validadores,intentos,seo,ficha}.js
  api/{content,defaults,login,logout,session,upload,image}.js
config/*.example.json, config/paquetes/*.json
docs/                                                 # checklist E2E, registro de fricciones
test/*.test.mjs, test/integracion/
.github/workflows/sincronizar-template.yml            # manual: abre un PR con los cambios del template
wrangler.jsonc, package.json
```

Una ruta dinámica nueva se añade en las tablas de `src/worker.js` **y** en `assets.run_worker_first` de `wrangler.jsonc`.

### API

| Ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/content?key=…` | pública | Devuelve `config`, `catalogo`, `landing` o `faq` (404 si no existe). |
| `PUT /api/content?key=…` | sesión | Valida y guarda; 400 con detalle en español si hay errores. |
| `POST /api/login` | pública | `{password}`; fija la cookie `admin_session`. 429 tras 5 fallos en 15 min por IP. |
| `POST /api/logout`, `GET /api/session` | sesión | Cierra / comprueba la sesión. |
| `POST /api/upload` | sesión | Foto (JPEG/PNG/WebP, ≤5 MB) de un item o de su galería, o una imagen reservada del sitio (`sobre-mi`, `logo`, `fondo-hero`). |
| `GET /api/image?id=…` | pública | Sirve la foto desde KV. |
| `GET /api/defaults?key=…` | pública | Devuelve el ejemplo de esa key (solo lectura). |

Reglas del proyecto, contratos de datos e historial de decisiones: [AGENTS.md](AGENTS.md). Registro de pruebas: [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md).

## Licencia

[GNU AGPL-3.0](LICENSE). Puedes usarlo y modificarlo libremente, también para tu negocio. Si publicas una versión modificada como servicio en red, debes ofrecer su código fuente a quienes lo usen, bajo la misma licencia. El nombre y el logo del proyecto no están incluidos en la licencia.
