// Pruebas que escriben datos (dirección, lastmod, items, fotos, sesión). Solo en local, sobre el estado temporal.
// El orden importa: primero lo que exige «nunca guardado»; después los cambios, que se acumulan.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, iniciarSesion, html, decodificar, PNG_MINIMO, PASSWORD_PRUEBA } from './ayuda.mjs';
import { ejemplo, copia } from '../ayuda.mjs';

const ctx = await iniciar();
after(() => ctx.detener());

const { origen } = ctx;
const SOLO_LOCAL = 'requiere modo local';
const local = (nombre, fn) => test(nombre, async t => {
  if (!ctx.esLocal) return t.skip(SOLO_LOCAL);
  await fn(t);
});

let admin;
const lastmods = texto => Object.fromEntries([...texto.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)]
  .map(m => [m[1].slice(origen.length) || '/', m[2] || null]));

local('login con la contraseña incorrecta da 401', async () => {
  const r = await ctx.get('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'incorrecta' }),
  });
  assert.equal(r.status, 401);
});

local('sitemap: sin lastmod mientras ninguna key se haya guardado', async () => {
  const mapa = lastmods((await ctx.get('/sitemap.xml')).texto);
  assert.ok(Object.keys(mapa).length >= 2);
  for (const [ruta, fecha] of Object.entries(mapa)) assert.equal(fecha, null, `${ruta} no debería tener lastmod`);
});

local('auth: login correcto da 200 + cookie admin_session y /api/session responde 200', async () => {
  const r = await ctx.get('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD_PRUEBA }),
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie') || '', /^admin_session=[^;]+/);
  admin = await iniciarSesion(ctx);
  const s = await ctx.get('/api/session', { headers: { Cookie: admin.cookie } });
  assert.equal(s.status, 200);
  assert.equal(s.json().authenticated, true);
});

local('sitemap: tras guardar faq, /faq lleva lastmod y la portada sigue sin él; el JSON no guarda updated_at', async () => {
  const faq = ejemplo('faq');
  const put = await admin.put('faq', faq);
  assert.equal(put.status, 200, put.texto);
  const mapa = lastmods((await ctx.get('/sitemap.xml')).texto);
  assert.match(mapa['/faq'] || '', /^\d{4}-\d{2}-\d{2}T/, '/faq debería llevar <lastmod> ISO');
  assert.equal(mapa['/'], null, 'la portada no depende de faq');
  const guardado = (await ctx.get('/api/content?key=faq')).json();
  assert.equal(guardado.updated_at, undefined, 'updated_at va en la metadata, no en el JSON');
});

local('dirección sin ciudad: PUT config da 400 con detalle en español', async () => {
  const config = ejemplo('config');
  config.perfil.direccion = { calle: 'Av. Prueba 123', ciudad: '', pais: 'PE' };
  const r = await admin.put('config', config);
  assert.equal(r.status, 400);
  const cuerpo = r.json();
  assert.ok(cuerpo.error, 'falta error');
  assert.match(cuerpo.detalle || cuerpo.error, /ciudad/i);
});

local('dirección con ciudad: la portada pasa a LocalBusiness con PostalAddress', async () => {
  const config = ejemplo('config');
  config.perfil.direccion = { calle: 'Av. Prueba 123', ciudad: 'Lima', region: 'Lima', codigo_postal: '15001', pais: 'PE' };
  const put = await admin.put('config', config);
  assert.equal(put.status, 200, put.texto);
  const negocio = html.nodos((await ctx.get('/')).texto).find(n => ['Organization', 'LocalBusiness'].includes(n['@type']));
  assert.equal(negocio['@type'], 'LocalBusiness');
  assert.deepEqual(negocio.address, {
    '@type': 'PostalAddress', streetAddress: 'Av. Prueba 123', addressLocality: 'Lima',
    addressRegion: 'Lima', postalCode: '15001', addressCountry: 'PE',
  });
});

local('moneda personalizada: se guarda y perfil.moneda queda igual', async () => {
  const config = ejemplo('config');
  config.perfil.moneda = 'UYU';
  config.perfil.moneda_personalizada = 'UYU';
  const put = await admin.put('config', config);
  assert.equal(put.status, 200, put.texto);
  const guardado = (await ctx.get('/api/content?key=config')).json();
  assert.equal(guardado.perfil.moneda, 'UYU');
  assert.equal(guardado.perfil.moneda_personalizada, 'UYU');
  const og = (await ctx.get('/')).texto;
  assert.match(og, /og:locale" content="es_LA"/);
  config.perfil.moneda_personalizada = 'uy';
  const malo = await admin.put('config', config);
  assert.equal(malo.status, 400);
  assert.match(malo.json().detalle || malo.json().error, /moneda_personalizada/);
});

local('sitemap: tras guardar config, la portada ya lleva lastmod', async () => {
  const mapa = lastmods((await ctx.get('/sitemap.xml')).texto);
  assert.match(mapa['/'] || '', /^\d{4}-\d{2}-\d{2}T/);
});

local('og:locale sigue a la moneda guardada (PEN, MXN, EUR, otra)', async () => {
  for (const [moneda, esperado] of [['PEN', 'es_PE'], ['MXN', 'es_MX'], ['EUR', 'es_ES'], ['USD', 'es_LA']]) {
    const config = ejemplo('config');
    config.perfil.moneda = moneda;
    const put = await admin.put('config', config);
    assert.equal(put.status, 200, put.texto);
    const r = await ctx.get('/');
    assert.equal(html.propiedad(r.texto, 'og:locale'), esperado, moneda);
  }
});

local('foto subida: og:image y og:image:alt de la ficha; sin foto no hay ninguno', async () => {
  const servicio = ctx.servicio;
  const sinFoto = await ctx.get(`/servicio/${servicio.id}`);
  assert.equal(html.propiedad(sinFoto.texto, 'og:image'), null);
  assert.equal(html.propiedad(sinFoto.texto, 'og:image:alt'), null);

  const sube = await admin.subir(servicio.id, PNG_MINIMO);
  assert.equal(sube.status, 200, sube.texto);
  const r = await ctx.get(`/servicio/${servicio.id}`);
  assert.equal(html.propiedad(r.texto, 'og:image'), `${origen}/api/image?id=${servicio.id}`);
  assert.equal(html.propiedad(r.texto, 'og:image:alt'), servicio.nombre);
  assert.equal(html.meta(r.texto, 'twitter:image:alt'), servicio.nombre);
  assert.match((await ctx.get(`/api/image?id=${servicio.id}`)).headers.get('content-type'), /image\/png/);
});

local('item no disponible: fuera del sitemap, ficha 200 con OutOfStock', async () => {
  // El ejemplo es «solo servicios» y el sitemap ya omite los productos: pasa a mixto para que la prueba sea útil
  const config = ejemplo('config');
  config.perfil.tipo_catalogo = 'mixto';
  assert.equal((await admin.put('config', config)).status, 200);
  const catalogo = ejemplo('catalogo');
  const objetivo = catalogo.items.find(i => i.tipo === 'producto');
  objetivo.disponible = false;
  const put = await admin.put('catalogo', catalogo);
  assert.equal(put.status, 200, put.texto);
  const sitemap = (await ctx.get('/sitemap.xml')).texto;
  assert.ok(!sitemap.includes(`/producto/${objetivo.id}<`), 'el no disponible sigue en el sitemap');
  assert.ok(sitemap.includes(`/servicio/${ctx.servicio.id}<`), 'los disponibles deben seguir en el sitemap');
  const ficha = await ctx.get(`/producto/${objetivo.id}`);
  assert.equal(ficha.status, 200);
  const producto = html.nodos(ficha.texto).find(n => n['@type'] === 'Product');
  assert.equal(producto.offers.availability, 'https://schema.org/OutOfStock');
});

local('recorte: descripción >155 y título largo sin «- Negocio»', async () => {
  const catalogo = ejemplo('catalogo');
  const [corto, largo] = catalogo.items.filter(i => i.tipo === 'servicio');
  largo.descripcion = 'Descripción deliberadamente larga para comprobar el recorte en el límite de una palabra: ' +
    'incluye varias frases con palabras sencillas hasta superar los ciento cincuenta y cinco caracteres.';
  assert.ok(largo.descripcion.length > 155 && largo.descripcion.length <= 200, `descripción de prueba: ${largo.descripcion.length}`);
  corto.nombre = 'Servicio con un nombre muy largo para pasar de sesenta';
  const negocio = ejemplo('config').perfil.nombre;
  assert.ok(`${corto.nombre} - ${negocio}`.length > 60 && corto.nombre.length <= 60);
  const put = await admin.put('catalogo', catalogo);
  assert.equal(put.status, 200, put.texto);

  const r = await ctx.get(`/servicio/${largo.id}`);
  for (const valor of [html.meta(r.texto, 'description'), html.propiedad(r.texto, 'og:description'), html.meta(r.texto, 'twitter:description')]) {
    assert.ok(valor.length <= 155, `${valor.length} caracteres`);
    assert.ok(valor.endsWith('…'), `no acaba en «…»: ${valor}`);
    assert.ok(largo.descripcion.startsWith(valor.slice(0, -1)), 'el recorte debe ser prefijo de la descripción');
  }

  const t = await ctx.get(`/servicio/${corto.id}`);
  assert.equal(html.titulo(t.texto), corto.nombre);
  assert.ok(!decodificar(html.titulo(t.texto)).includes(' - '), 'el título no debería llevar « - Negocio»');
  // Contraste: con nombre corto el título sí lleva el negocio
  const normal = await ctx.get(`/servicio/${largo.id}`);
  assert.ok(html.titulo(normal.texto).endsWith(` - ${negocio}`), html.titulo(normal.texto));
});

// Pasivo: corre en ambos modos (en local, al final, ya hay fechas guardadas)
test('sitemap: todo lastmod publicado es una fecha ISO válida', async () => {
  const mapa = lastmods((await ctx.get('/sitemap.xml')).texto);
  for (const [ruta, fecha] of Object.entries(mapa)) {
    if (fecha) assert.match(fecha, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/, `${ruta}: lastmod «${fecha}»`);
  }
});

local('fuentes propias: subida con sesión, 401 sin ella, rechazo de lo que no es fuente y servida con su tipo', async () => {
  const woff = Buffer.concat([Buffer.from('wOFF'), Buffer.alloc(40)]);
  const enviar = (id, bytes, cookie) => {
    const form = new FormData();
    form.set('id', id);
    form.set('file', new Blob([bytes]), 'fuente');
    return ctx.get('/api/fuente', { method: 'POST', headers: cookie ? { Cookie: cookie } : {}, body: form });
  };
  assert.equal((await enviar('texto-400', woff)).status, 401);
  assert.equal((await enviar('texto-900', woff, admin.cookie)).status, 400);
  const gif = await enviar('texto-400', Buffer.from('GIF89a' + 'x'.repeat(40)), admin.cookie);
  assert.equal(gif.status, 400);
  assert.match(gif.texto, /WOFF2, WOFF, TTF u OTF/);
  assert.equal((await enviar('texto-400', Buffer.alloc(1024 * 1024 + 1), admin.cookie)).status, 400);

  const ok = await enviar('texto-400', woff, admin.cookie);
  assert.equal(ok.status, 200, ok.texto);
  assert.equal(JSON.parse(ok.texto).formato, 'woff');
  const r = await ctx.get('/api/fuente?id=texto-400');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'font/woff');
  assert.match(r.headers.get('cache-control'), /immutable/);
  assert.equal((await ctx.get('/api/fuente?id=titulos-400')).status, 404);
  assert.equal((await ctx.get('/api/fuente?id=../x')).status, 404);
});

local('fuentes propias: la portada inyecta @font-face y variables cuando están guardadas', async () => {
  const landing = copia(ejemplo('landing'));
  landing.tema.fuentes_propias = { texto: { nombre: 'Prueba', archivos: [{ peso: '400', formato: 'woff', v: 1 }] } };
  assert.equal((await admin.put('landing', landing)).status, 200);
  const r = await ctx.get('/');
  assert.match(r.texto, /@font-face\{font-family:"Fuente Texto";src:url\("\/api\/fuente\?id=texto-400&v=1"\) format\("woff"\)/);
  assert.match(r.texto, /rel="preload" href="\/api\/fuente\?id=texto-400&v=1"/);
  assert.match(r.texto, /--font-body:"Fuente Texto"/);
  landing.tema.fuentes_propias = { texto: { nombre: 'Prueba', archivos: [{ peso: '500', formato: 'woff', v: 1 }] } };
  assert.equal((await admin.put('landing', landing)).status, 400);
});
