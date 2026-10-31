import { getContent } from './_lib/defaults.js';
import { xmlSitemap } from './_lib/seo.js';

const CLAVES = ['config', 'catalogo', 'landing', 'faq'];

// Fecha del último guardado de cada key (metadata que añade PUT /api/content)
async function fechasContenido(env) {
  const fechas = {};
  await Promise.all(CLAVES.map(async clave => {
    const { metadata } = await env.KV.getWithMetadata(clave, { type: 'text' });
    if (metadata?.updated_at) fechas[clave] = metadata.updated_at;
  }));
  return fechas;
}

export const onRequestGet = async ({ request, env }) => {
  const origen = new URL(request.url).origin;
  const [catalogo, config, fechas] = await Promise.all([
    getContent(env, 'catalogo', request),
    getContent(env, 'config', request),
    fechasContenido(env),
  ]);

  return new Response(xmlSitemap(origen, catalogo, fechas, config), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
