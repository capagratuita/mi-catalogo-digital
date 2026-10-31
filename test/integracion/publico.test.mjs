// Páginas públicas, redirecciones, cabeceras y auth: solo lectura, valen en local y en remoto.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, html, decodificar } from './ayuda.mjs';

const ctx = await iniciar();
after(() => ctx.detener());

const { servicio, producto, origen } = ctx;
const omitir = (t, motivo) => t.skip(motivo);
const LOCALES = { PEN: 'es_PE', MXN: 'es_MX', COP: 'es_CO', ARS: 'es_AR', CLP: 'es_CL', EUR: 'es_ES', VES: 'es_VE', GTQ: 'es_GT', BOB: 'es_BO', CUP: 'es_CU', DOP: 'es_DO', HNL: 'es_HN' };

// Items que sirven de muestra en cada prueba de ficha
const casosFicha = [
  ['servicio', servicio, 'Service', 'servicio'],
  ['producto', producto, 'Product', 'producto'],
];

for (const [tipo, item, tipoLd, prefijo] of casosFicha) {
  test(`ficha /${prefijo}/{id}: canonical limpio, h1 relleno, JSON-LD ${tipoLd} y CSS absoluto`, async t => {
    if (!item) return omitir(t, `el sitio no tiene ningún ${tipo}`);
    const r = await ctx.get(`/${prefijo}/${item.id}`);
    assert.equal(r.status, 200);
    assert.equal(html.canonical(r.texto), `${origen}/${prefijo}/${item.id}`);
    const h1 = r.texto.match(/<h1 id="producto-nombre"[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(h1, 'falta <h1 id="producto-nombre">');
    assert.equal(decodificar(h1[1]), item.nombre);
    assert.doesNotMatch(r.texto, /Cargando\.\.\./);
    const nodo = html.nodos(r.texto).find(n => n['@type'] === tipoLd);
    assert.ok(nodo, `falta JSON-LD ${tipoLd}`);
    assert.equal(nodo.name, item.nombre);
    assert.match(r.texto, /<link rel="stylesheet" href="\/assets\/styles\.css">/);
  });
}

test('redirecciones 301 entre la URL antigua y la ficha de su tipo', async t => {
  if (!servicio || !producto) return omitir(t, 'hace falta al menos un servicio y un producto');
  const casos = [
    [`/producto?id=${producto.id}`, `/producto/${producto.id}`],
    [`/producto?id=${servicio.id}`, `/servicio/${servicio.id}`],
    [`/servicio/${producto.id}`, `/producto/${producto.id}`],
    [`/producto/${servicio.id}`, `/servicio/${servicio.id}`],
  ];
  for (const [desde, hacia] of casos) {
    const r = await ctx.get(desde);
    assert.equal(r.status, 301, `${desde}: estado`);
    assert.equal(new URL(r.location, origen).href, origen + hacia, `${desde}: destino`);
  }
});

test('ids inexistentes y /producto sin id dan 404 con noindex', async () => {
  for (const ruta of ['/servicio/no-existe-xyz', '/producto/no-existe-xyz', '/producto?id=no-existe-xyz', '/producto']) {
    const r = await ctx.get(ruta);
    assert.equal(r.status, 404, `${ruta}: estado`);
    assert.match(r.texto, /<meta name="robots" content="noindex">/, `${ruta}: noindex`);
  }
});

test('portada: h1 del hero, canonical y JSON-LD WebSite + Organization/LocalBusiness', async () => {
  const r = await ctx.get('/');
  assert.equal(r.status, 200);
  const hero = ctx.sitio.landing?.hero?.titulo || ctx.negocio;
  assert.equal(html.h1(r.texto), hero);
  assert.equal(html.canonical(r.texto), `${origen}/`);
  const nodos = html.nodos(r.texto);
  assert.ok(nodos.some(n => n['@type'] === 'WebSite' && n.name === ctx.negocio), 'falta WebSite');
  assert.ok(nodos.some(n => ['Organization', 'LocalBusiness'].includes(n['@type']) && n.name === ctx.negocio), 'falta Organization');
});

test('portada: catálogo estático con enlaces solo en servicios, y <noscript> que lo muestra', async t => {
  if (!ctx.items.length) return omitir(t, 'el catálogo está vacío');
  const r = await ctx.get('/');
  const inicio = r.texto.indexOf('id="catalogo-estatico"');
  assert.ok(inicio > 0, 'falta #catalogo-estatico');
  const bloque = r.texto.slice(inicio, r.texto.indexOf('</section>', inicio));
  const tipo = ctx.sitio.config.perfil.tipo_catalogo;
  const visibles = new Set(tipo === 'solo-productos' ? ['producto'] : tipo === 'solo-servicios' ? ['servicio'] : ['producto', 'servicio']);
  for (const item of ctx.items.filter(i => visibles.has(i.tipo))) {
    const enlace = `<a href="/servicio/${item.id}">`;
    assert.ok(decodificar(bloque).includes(item.nombre), `falta «${item.nombre}»`);
    if (item.tipo === 'servicio') assert.ok(bloque.includes(enlace), `falta ${enlace}`);
  }
  assert.ok(!bloque.includes('href="/producto/'), 'los productos no deben llevar enlace');
  assert.match(r.texto, /<noscript>\s*<style>[^<]*\.catalogo-estatico\s*\{\s*display:\s*block/);
});

test('og:locale coherente con la moneda del perfil', async () => {
  const esperado = LOCALES[ctx.moneda] || 'es_LA';
  const r = await ctx.get('/');
  assert.equal(html.propiedad(r.texto, 'og:locale'), esperado, `moneda ${ctx.moneda}`);
});

test('areaServed del negocio sale de las zonas de servicios presenciales', async () => {
  const zonas = ctx.sitio.config.perfil.tipo_catalogo === 'solo-productos' ? [] : [...new Set(ctx.servicios
    .filter(s => s.modalidad !== 'online' && typeof s.zona === 'string' && s.zona.trim())
    .map(s => s.zona.trim()))];
  const r = await ctx.get('/');
  const negocio = html.nodos(r.texto).find(n => ['Organization', 'LocalBusiness'].includes(n['@type']));
  const esperado = zonas.length === 0 ? undefined : zonas.length === 1 ? zonas[0] : zonas;
  assert.deepEqual(negocio.areaServed, esperado);
});

test('JSON-LD del negocio: LocalBusiness con address si hay dirección guardada, Organization si no', async () => {
  const dir = ctx.sitio.config.perfil.direccion;
  const r = await ctx.get('/');
  const negocio = html.nodos(r.texto).find(n => ['Organization', 'LocalBusiness'].includes(n['@type']));
  if (dir?.ciudad) {
    assert.equal(negocio['@type'], 'LocalBusiness');
    assert.equal(negocio.address['@type'], 'PostalAddress');
    assert.equal(negocio.address.addressLocality, dir.ciudad);
  } else {
    assert.equal(negocio['@type'], 'Organization');
    assert.equal(negocio.address, undefined);
  }
});

test('sitemap: URLs limpias sin ?id= y todas responden', async () => {
  const r = await ctx.get('/sitemap.xml');
  assert.equal(r.status, 200);
  const locs = [...r.texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decodificar(m[1]));
  assert.ok(locs.length >= 2, 'el sitemap debería listar al menos la portada y /faq');
  for (const loc of locs) {
    assert.ok(loc.startsWith(origen + '/'), `${loc}: origen distinto de ${origen}`);
    assert.ok(!loc.includes('?'), `${loc}: URL con parámetros`);
  }
  // Remoto: muestra de 5 para no abusar; local: todas
  const muestra = ctx.esLocal ? locs : locs.slice(0, 5);
  for (const loc of muestra) {
    const res = await ctx.get(loc.slice(origen.length));
    assert.ok(res.status === 200 || (res.status === 301 && res.location), `${loc}: respondió ${res.status}`);
  }
  if (ctx.servicio) assert.ok(locs.includes(`${origen}/servicio/${ctx.servicio.id}`));
  if (ctx.producto) assert.ok(locs.includes(`${origen}/producto/${ctx.producto.id}`));
});

test('items no disponibles: fuera del sitemap pero su ficha responde 200', async t => {
  const no = ctx.items.find(i => i.disponible === false);
  if (!no) return omitir(t, 'el sitio no tiene ningún item con disponible: false (la prueba activa está en escritura.test.mjs)');
  const sitemap = (await ctx.get('/sitemap.xml')).texto;
  assert.ok(!sitemap.includes(`/${no.id}<`), `${no.id} aparece en el sitemap`);
  const ficha = await ctx.get(`/${no.tipo}/${no.id}`);
  assert.equal(ficha.status, 200);
});

test('recorte de descripción real >155: meta, og y twitter acaban en «…» y no pasan de 155', async t => {
  const largo = ctx.items.find(i => i.descripcion.replace(/\s+/g, ' ').trim().length > 155);
  if (!largo) return omitir(t, 'ninguna descripción real supera 155 caracteres (la prueba activa está en escritura.test.mjs)');
  const r = await ctx.get(`/${largo.tipo}/${largo.id}`);
  for (const [nombre, valor] of [
    ['description', html.meta(r.texto, 'description')],
    ['og:description', html.propiedad(r.texto, 'og:description')],
    ['twitter:description', html.meta(r.texto, 'twitter:description')],
  ]) {
    assert.ok(valor && valor.length <= 155, `${nombre}: ${valor?.length} caracteres`);
    assert.ok(valor.endsWith('…'), `${nombre} no acaba en «…»`);
  }
});

test('foto real: og:image y og:image:alt llevan la imagen y el nombre del item', async t => {
  let conFoto = null;
  for (const item of ctx.items.slice(0, 10)) {
    const r = await ctx.get(`/api/image?id=${item.id}`);
    if (r.status === 200) { conFoto = item; break; }
  }
  if (!conFoto) return omitir(t, 'ningún item tiene foto');
  const r = await ctx.get(`/${conFoto.tipo}/${conFoto.id}`);
  assert.equal(html.propiedad(r.texto, 'og:image'), `${origen}/api/image?id=${conFoto.id}`);
  assert.equal(html.propiedad(r.texto, 'og:image:alt'), conFoto.nombre);
});

test('/faq: 200 con FAQPage si hay preguntas', async t => {
  const preguntas = ctx.sitio.faq?.preguntas || [];
  const r = await ctx.get('/faq');
  assert.equal(r.status, 200);
  if (!preguntas.length) return omitir(t, 'el sitio no tiene preguntas frecuentes');
  const nodo = html.nodos(r.texto).find(n => n['@type'] === 'FAQPage');
  assert.ok(nodo, 'falta FAQPage');
  assert.equal(nodo.mainEntity.length, preguntas.length);
});

test('/carrito: 200 y noindex', async () => {
  const r = await ctx.get('/carrito');
  assert.equal(r.status, 200);
  assert.match(r.texto, /<meta name="robots" content="noindex">/);
});

test('cabeceras de public/_headers: fuente y /admin', async () => {
  const f = await ctx.get('/assets/fonts/inter-latin-wght-normal.woff2');
  assert.equal(f.status, 200);
  assert.equal(f.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(f.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(f.headers.get('cache-control'), /max-age=2592000/);
  // /admin/index.html puede redirigir a /admin/ (URL limpia): se sigue hasta la página final
  const a = await ctx.get('/admin/index.html', { redirect: 'follow' });
  assert.equal(a.status, 200);
  assert.match(a.headers.get('x-robots-tag') || '', /noindex/);
});

test('auth: /admin/catalogo sin cookie redirige 302 al login', async () => {
  const r = await ctx.get('/admin/catalogo');
  assert.equal(r.status, 302);
  assert.equal(new URL(r.location, origen).pathname, '/admin/index.html');
});

test('auth: PUT /api/content sin cookie da 401', async () => {
  const r = await ctx.get('/api/content?key=faq', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(r.status, 401);
});

test('GET /api/content es público para las 4 keys', async () => {
  for (const clave of ['config', 'catalogo', 'landing', 'faq']) {
    const r = await ctx.get(`/api/content?key=${clave}`);
    // Un sitio remoto recién desplegado puede no haber guardado la key (404 documentado); en local están sembradas
    if (r.status === 404 && !ctx.esLocal) continue;
    assert.equal(r.status, 200, clave);
    assert.equal(typeof r.json(), 'object', clave);
  }
});

test('robots.txt: Sitemap con el origen y Disallow /admin/', async () => {
  const r = await ctx.get('/robots.txt');
  assert.equal(r.status, 200);
  assert.ok(r.texto.includes(`Sitemap: ${origen}/sitemap.xml`));
  assert.match(r.texto, /^Disallow: \/admin\/$/m);
});
