// Punto de entrada del Worker. Sustituye al enrutado por archivos de Pages Functions:
// cada ruta dinámica se declara aquí y lo demás se sirve como estático (binding ASSETS).
// Las rutas dinámicas también deben estar en `assets.run_worker_first` de wrangler.jsonc;
// las que no estén allí se sirven directamente desde public/ sin invocar este Worker.
import { onRequest as middleware } from './_middleware.js';
import * as content from './api/content.js';
import * as defaults from './api/defaults.js';
import * as fuente from './api/fuente.js';
import * as image from './api/image.js';
import * as login from './api/login.js';
import * as logout from './api/logout.js';
import * as session from './api/session.js';
import * as upload from './api/upload.js';
import * as carrito from './carrito.js';
import * as faq from './faq.js';
import * as index from './index.js';
import * as producto from './producto.js';
import * as productoId from './producto/[id].js';
import * as robots from './robots.txt.js';
import * as servicioId from './servicio/[id].js';
import * as sitemap from './sitemap.xml.js';

const METODOS = { GET: 'onRequestGet', POST: 'onRequestPost', PUT: 'onRequestPut', DELETE: 'onRequestDelete', HEAD: 'onRequestGet' };

// Rutas exactas y rutas con un parámetro final (`/servicio/:id`)
const EXACTAS = new Map([
  ['/', index],
  ['/faq', faq],
  ['/carrito', carrito],
  ['/producto', producto],
  ['/sitemap.xml', sitemap],
  ['/robots.txt', robots],
  ['/api/content', content],
  ['/api/defaults', defaults],
  ['/api/fuente', fuente],
  ['/api/image', image],
  ['/api/login', login],
  ['/api/logout', logout],
  ['/api/session', session],
  ['/api/upload', upload],
]);
const CON_ID = [
  ['/servicio/', servicioId],
  ['/producto/', productoId],
];

function resolver(pathname) {
  if (EXACTAS.has(pathname)) return { modulo: EXACTAS.get(pathname), params: {} };
  for (const [prefijo, modulo] of CON_ID) {
    const id = pathname.slice(prefijo.length);
    if (pathname.startsWith(prefijo) && id && !id.includes('/')) {
      return { modulo, params: { id: decodeURIComponent(id) } };
    }
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const estaticos = () => env.ASSETS.fetch(request);
    const ruta = resolver(new URL(request.url).pathname);
    const manejador = ruta?.modulo[METODOS[request.method]];

    // Si el módulo no atiende este método (o no hay ruta), sigue el camino estático, como en Pages
    const siguiente = manejador
      ? () => manejador({ request, env, params: ruta.params, next: estaticos, waitUntil: p => ctx.waitUntil(p) })
      : estaticos;

    return middleware({ request, env, next: siguiente });
  },
};
