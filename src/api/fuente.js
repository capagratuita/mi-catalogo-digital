import { json } from '../_lib/auth.js';
import { ID_FUENTE, MAX_FUENTE_BYTES, TIPOS_FUENTE, detectarFormato } from '../_lib/fuentes.js';

// Las fuentes propias viven en el KV `IMAGES` como `fuentes/{ranura}-{peso}`. El navegador las pide con
// `?v=` (cambia al subir otra), así que se pueden guardar un año.

export const onRequestGet = async ({ request, env }) => {
  const id = new URL(request.url).searchParams.get('id') || '';
  const noEncontrada = () => new Response('Fuente no encontrada', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!ID_FUENTE.test(id)) return noEncontrada();

  const cache = caches.default;
  const guardada = await cache.match(request);
  if (guardada) return guardada;

  const { value, metadata } = await env.IMAGES.getWithMetadata(`fuentes/${id}`, { type: 'arrayBuffer' });
  if (!value) return noEncontrada();

  const cabeceras = {
    'Content-Type': TIPOS_FUENTE[metadata?.formato] || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  await cache.put(request, new Response(value, { headers: cabeceras }));
  return new Response(value, { headers: cabeceras });
};

// POST autenticado (lo exige el middleware): multipart con `id` («titulos-400», «texto-variable»…) y `file`.
export const onRequestPost = async ({ request, env }) => {
  let formulario;
  try {
    formulario = await request.formData();
  } catch {
    return json({ error: 'FormData inválido' }, 400);
  }

  const id = formulario.get('id');
  const archivo = formulario.get('file');
  if (typeof id !== 'string' || !ID_FUENTE.test(id)) {
    return json({ error: 'ID de fuente inválido', detalle: "Usa 'titulos' o 'texto' seguido de '-400', '-700' o '-variable'." }, 400);
  }
  if (!archivo || typeof archivo === 'string' || typeof archivo.arrayBuffer !== 'function') {
    return json({ error: 'Archivo requerido' }, 400);
  }
  if (archivo.size > MAX_FUENTE_BYTES) {
    return json({ error: 'La fuente pesa demasiado', detalle: `Máximo ${MAX_FUENTE_BYTES / 1024} KB por archivo. Prueba con las versiones Regular y Bold en vez de la variable.` }, 400);
  }

  const cuerpo = await archivo.arrayBuffer();
  const formato = detectarFormato(new Uint8Array(cuerpo));
  if (!formato) {
    return json({ error: 'Formato no permitido', detalle: 'Solo se aceptan fuentes WOFF2, WOFF, TTF u OTF.' }, 400);
  }

  await env.IMAGES.put(`fuentes/${id}`, cuerpo, { metadata: { formato } });
  return json({ ok: true, id, formato, bytes: cuerpo.byteLength, url: `/api/fuente?id=${id}` });
};
