import { getContent } from './defaults.js';
import { TOKEN_ANALITICA, colorSobreAcento, colorAcentoUI } from './validadores.js';
import { MAX_DESCRIPCION, localeOg, recortar } from './seo.js';

const EXTENSIONES_FOTO = ['jpg', 'jpeg', 'png', 'webp'];

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// JSON seguro dentro de <script>: evita cerrar la etiqueta o abrir un comentario
function jsonParaScript(valor) {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

// URLs de imagen aptas para compartir (absolutas y no las r2.dev inválidas)
export function urlImagenValida(url, origen) {
  if (typeof url !== 'string') return null;
  // Imagen subida desde el admin («/api/image?id=…»): se vuelve absoluta con el origen del sitio
  if (url.startsWith('/') && !url.startsWith('//')) return origen ? origen + url : null;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return null;
    if (hostname === 'r2.dev' || (hostname.endsWith('.r2.dev') && !hostname.startsWith('pub-'))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function existeFoto(env, id) {
  for (const ext of EXTENSIONES_FOTO) {
    const { value } = await env.IMAGES.getWithMetadata(`items/${id}.${ext}`, { type: 'stream' });
    if (value) {
      await value.cancel();
      return true;
    }
  }
  return false;
}

function etiquetasMeta(meta, origen, nombreSitio, locale) {
  const { titulo, ruta = '/', imagen, imagenAlt, tipo = 'website', jsonLd, noindex, extra = [] } = meta;
  const descripcion = recortar(meta.descripcion, MAX_DESCRIPCION);
  const url = origen + ruta;
  const etiquetas = [];

  if (descripcion) etiquetas.push(`<meta name="description" content="${escapar(descripcion)}">`);
  if (noindex) etiquetas.push('<meta name="robots" content="noindex">');
  else etiquetas.push(`<link rel="canonical" href="${escapar(url)}">`);

  etiquetas.push(
    `<meta property="og:type" content="${escapar(tipo)}">`,
    `<meta property="og:title" content="${escapar(titulo)}">`,
    `<meta property="og:url" content="${escapar(url)}">`,
    `<meta property="og:locale" content="${locale}">`,
  );
  if (nombreSitio) etiquetas.push(`<meta property="og:site_name" content="${escapar(nombreSitio)}">`);
  if (descripcion) etiquetas.push(`<meta property="og:description" content="${escapar(descripcion)}">`);
  if (imagen) etiquetas.push(`<meta property="og:image" content="${escapar(imagen)}">`);
  if (imagen && imagenAlt) etiquetas.push(`<meta property="og:image:alt" content="${escapar(imagenAlt)}">`);

  etiquetas.push(`<meta name="twitter:card" content="${imagen ? 'summary_large_image' : 'summary'}">`);
  etiquetas.push(`<meta name="twitter:title" content="${escapar(titulo)}">`);
  if (descripcion) etiquetas.push(`<meta name="twitter:description" content="${escapar(descripcion)}">`);
  if (imagen) etiquetas.push(`<meta name="twitter:image" content="${escapar(imagen)}">`);
  if (imagen && imagenAlt) etiquetas.push(`<meta name="twitter:image:alt" content="${escapar(imagenAlt)}">`);

  for (const [propiedad, contenido] of extra) {
    etiquetas.push(`<meta property="${escapar(propiedad)}" content="${escapar(contenido)}">`);
  }
  if (jsonLd) etiquetas.push(`<script type="application/ld+json">${jsonParaScript(jsonLd)}</script>`);

  return etiquetas.join('\n');
}

// Fábrica de las páginas públicas. Sirve el HTML estático y le inyecta:
//  - título, descripción, canonical, Open Graph y datos estructurados (SEO y vista previa al compartir)
//  - los datos del sitio en <script id="sitio-datos">, para que la página no pida /api/content otra vez
// `meta(sitio, contexto)` devuelve los datos de la página; puede incluir `status` o `redirigir` (ruta).
// `fuente(contexto)` da la respuesta HTML de partida cuando la URL no corresponde a un archivo estático.
export function paginaPublica({ claves, meta, fuente }) {
  return async context => {
    const { request, env, next } = context;
    const respuesta = await (fuente ? fuente(context) : next());
    if (!(respuesta.headers.get('Content-Type') || '').includes('text/html')) return respuesta;

    const sitio = {};
    for (const clave of claves) sitio[clave] = await getContent(env, clave, request);

    const origen = new URL(request.url).origin;
    const datos = (await meta?.(sitio, { ...context, origen })) ?? {};
    const nombreSitio = sitio.config?.perfil?.nombre;

    // URL antigua o equivalente: redirección permanente a la canónica
    if (datos.redirigir) {
      return new Response(null, { status: 301, headers: { Location: origen + datos.redirigir } });
    }

    // Color de acento de la landing: se pinta desde el servidor para que no parpadee al cargar
    const acento = sitio.landing?.tema?.color_acento;
    const estiloAcento = typeof acento === 'string' && /^#[0-9a-fA-F]{6}$/.test(acento)
      ? `<style>:root{--accent:${acento};--on-accent:${colorSobreAcento(acento)};--accent-ui:${colorAcentoUI(acento)}}</style>`
      : '';

    // Cloudflare Web Analytics (sin cookies). No se mide el carrito ni las páginas noindex (404).
    const token = sitio.config?.analitica?.cf_token;
    const analitica = typeof token === 'string' && TOKEN_ANALITICA.test(token) && !datos.noindex
      ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`
      : '';

    const cabecera = [
      estiloAcento,
      analitica,
      datos.titulo ? etiquetasMeta(datos, origen, nombreSitio, localeOg(sitio.config?.perfil?.moneda)) : '',
      `<script type="application/json" id="sitio-datos">${jsonParaScript(sitio)}</script>`,
    ].join('\n');

    // Estilo visual de la landing (moderno es la base y no necesita atributo)
    const estilo = sitio.landing?.tema?.estilo;
    const estiloValido = ['rustico', 'minimalista', 'elegante'].includes(estilo) ? estilo : null;

    const reescrita = new HTMLRewriter()
      .on('html', { element(el) { if (estiloValido) el.setAttribute('data-estilo', estiloValido); } })
      .on('title', { element(el) { if (datos.titulo) el.setInnerContent(datos.titulo); } })
      .on('head', { element(el) { el.append(cabecera, { html: true }); } });
    // Contenido visible (h1, descripción, catálogo) para quien no ejecuta JavaScript
    datos.reescribir?.(reescrita);
    const transformada = reescrita.transform(respuesta);

    const headers = new Headers(transformada.headers);
    headers.delete('ETag');
    headers.set('Cache-Control', 'public, max-age=60');
    return new Response(transformada.body, { status: datos.status ?? transformada.status, headers });
  };
}
