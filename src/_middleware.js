import { json, verifySession } from './_lib/auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ADMIN_LOGIN_PATHS = new Set(['/admin', '/admin/', '/admin/index.html']);

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, 'Access-Control-Max-Age': '86400' },
    });
  }

  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminLogin = ADMIN_LOGIN_PATHS.has(path);
  const isProtectedWrite =
    (request.method === 'PUT' && path === '/api/content') ||
    (request.method === 'POST' && (path === '/api/upload' || path === '/api/fuente'));

  if ((isAdminPage && !isAdminLogin) || isProtectedWrite) {
    const authenticated = await verifySession(request, env);

    if (!authenticated) {
      if (isAdminPage) {
        return new Response(null, {
          status: 302,
          headers: { Location: '/admin/index.html', ...CORS_HEADERS },
        });
      }
      return json({ error: 'No autorizado' }, 401, CORS_HEADERS);
    }
  }

  // Las respuestas de ASSETS son inmutables: se copian para poder añadir cabeceras
  const original = await next();
  const response = new Response(original.body, original);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
};
