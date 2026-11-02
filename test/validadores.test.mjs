import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorSobreAcento, colorAcentoUI, validateConfig, validateCatalogo, validateLanding, validateFAQ, contraste, normalizarConfig } from '../src/_lib/validadores.js';
import { ejemplo, copia } from './ayuda.mjs';

const config = ejemplo('config');
const catalogo = ejemplo('catalogo');
const landing = ejemplo('landing');
const faq = ejemplo('faq');
const ids = new Set(catalogo.items.map(item => item.id));

const servicio = () => catalogo.items.findIndex(item => item.tipo === 'servicio');
const producto = () => catalogo.items.findIndex(item => item.tipo === 'producto');
const conItem = (cambios, indice = servicio()) => {
  const c = copia(catalogo);
  Object.assign(c.items[indice], cambios);
  return c;
};
const rechaza = (fn, patron) => assert.throws(fn, error => patron.test(error.message));

test('los ejemplos de config/ son válidos', () => {
  validateConfig(config);
  validateCatalogo(catalogo);
  validateLanding(landing, ids);
  validateFAQ(faq);
});

test('config: email, URLs y analítica', () => {
  const con = cambios => { const c = copia(config); Object.assign(c.perfil, cambios); return c; };
  rechaza(() => validateConfig(con({ email: 'no-es-correo' })), /correo válido/);
  rechaza(() => validateConfig(con({ reserva_url: 'cal.com/x' })), /https:\/\//);
  rechaza(() => validateConfig(con({ logo_url: 'javascript:alert(1)' })), /URL/);
  rechaza(() => validateConfig(con({ redes: { instagram: 'instagram.com/x', facebook: null } })), /instagram/);
  rechaza(() => validateConfig(con({ redes: { instagram: null, facebook: null, tiktok: 'tiktok.com/x' } })), /tiktok/);
  validateConfig(con({ redes: { instagram: null, facebook: null, youtube: 'https://youtube.com/@x' } }));
  validateConfig(con({ redes: { instagram: null, facebook: null } }));
  validateConfig(con({ logo_url: '/assets/images/logo.png' }));
  validateConfig(con({ reserva_url: 'https://cal.com/yo/30min' }));

  const sinReserva = copia(config); delete sinReserva.perfil.reserva_url;
  validateConfig(sinReserva);
  validateConfig({ ...sinReserva, perfil: { ...sinReserva.perfil, calendly_url: 'https://calendly.com/x' } });

  validateConfig({ ...config, analitica: { cf_token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' } });
  validateConfig({ ...config, analitica: { cf_token: '' } });
  rechaza(() => validateConfig({ ...config, analitica: { cf_token: 'abc"><script>' } }), /cf_token/);
  rechaza(() => validateConfig({ ...config, analitica: { cf_token: 'corto' } }), /cf_token/);
});

test('catálogo: detalle de servicio (modalidad, zona, incluye, variantes)', () => {
  validateCatalogo(conItem({
    modalidad: 'ambas',
    zona: 'Lima',
    incluye: ['Informe', 'Sesión'],
    variantes: [{ nombre: 'Sesión', precio: 30, duracion_minutos: 60 }, { nombre: 'Pack 4', precio: 100, duracion_minutos: null }],
  }));
  rechaza(() => validateCatalogo(conItem({ modalidad: 'remoto' })), /modalidad/);
  rechaza(() => validateCatalogo(conItem({ variantes: [{ nombre: 'x', precio: -1 }] })), /precio de la variante/);
  rechaza(() => validateCatalogo(conItem({ variantes: Array.from({ length: 7 }, (_, i) => ({ nombre: `v${i}`, precio: 1 })) })), /máximo 6/);
  rechaza(() => validateCatalogo(conItem({ incluye: [' '] })), /incluye/);
  rechaza(() => validateCatalogo(conItem({ variantes: [{ nombre: 'x', precio: 1 }] }, producto())), /solo los servicios/);
});

test('catálogo: reserva_url, ids reservados y precio a consultar', () => {
  validateCatalogo(conItem({ reserva_url: 'https://cal.com/x' }));
  rechaza(() => validateCatalogo(conItem({ reserva_url: 5 })), /cadena o null/);
  rechaza(() => validateCatalogo(conItem({ reserva_url: 'cal.com/x' })), /https:\/\//);
  rechaza(() => validateCatalogo(conItem({ id: 'sobre-mi' })), /reservado/);
  rechaza(() => validateCatalogo(conItem({ precio_a_consultar: true }, producto())), /solo los servicios/);
  rechaza(() => validateCatalogo(conItem({ descripcion: 'a'.repeat(201) })), /200 caracteres/);
});

test('landing: cualquier acento vale y el texto se adapta', () => {
  const con = tema => { const l = copia(landing); l.tema = { ...l.tema, ...tema }; return l; };
  validateLanding(con({ color_acento: '#ffd400' }), ids);
  validateLanding(con({ color_acento: '#222222' }), ids);
  assert.equal(colorSobreAcento('#222222'), '#ffffff');
  assert.equal(colorSobreAcento('#b6f23c'), '#12161c');
  assert.equal(colorAcentoUI('#1d4ed8'), '#1d4ed8');
  assert.ok(contraste(colorAcentoUI('#ffeb3b'), '#ffffff') >= 3);
  assert.equal(colorSobreAcento('#1d4ed8'), '#ffffff');
  rechaza(() => validateLanding(con({ color_acento: 'rojo' }), ids), /hexadecimal/);
  validateLanding(con({ color_primario: '#000000', color_secundario: '#ffffff' }), ids);
  assert.ok(contraste('#b6f23c', '#12161c') > 4.5);
});

test('landing: vista_listas opcional (rejilla|deslizable)', () => {
  const con = tema => { const l = copia(landing); l.tema = { ...l.tema, ...tema }; return l; };
  validateLanding(con({}), ids);
  validateLanding(con({ vista_listas: 'deslizable' }), ids);
  validateLanding(con({ vista_listas: 'rejilla' }), ids);
  rechaza(() => validateLanding(con({ vista_listas: 'carrusel' }), ids), /vista_listas/);
});

test('landing: secciones, testimonios e items_ids', () => {
  // Las secciones únicas (sobre-mi, contacto, testimonios) sustituyen a la que ya trae el ejemplo
  const con = seccion => { const l = copia(landing); l.secciones = l.secciones.filter(x => x.tipo !== seccion.tipo); l.secciones.push({ titulo: 'X', contenido: '', items_ids: [], ...seccion }); return l; };
  validateLanding(con({ tipo: 'sobre-mi', contenido: 'Hola' }), ids);
  validateLanding(con({ tipo: 'testimonios', testimonios: [{ texto: 'Muy bien', autor: 'Ana', detalle: 'Clienta' }] }), ids);
  rechaza(() => validateLanding(con({ tipo: 'testimonios', testimonios: [{ texto: 'x', autor: '' }] }), ids), /autor/);
  rechaza(() => validateLanding(con({ tipo: 'testimonios', testimonios: Array.from({ length: 9 }, () => ({ texto: 'x', autor: 'y' })) }), ids), /máximo 8/);
  rechaza(() => validateLanding(con({ tipo: 'texto', testimonios: [] }), ids), /no es de testimonios/);
  validateLanding(con({ tipo: 'sobre-mi', contenido: 'Hola', nombre: 'Lucía' }), ids);
  rechaza(() => validateLanding(con({ tipo: 'texto', nombre: 'Lucía' }), ids), /no puede tener 'nombre'/);
  rechaza(() => validateLanding(con({ tipo: 'sobre-mi', nombre: 'a'.repeat(61) }), ids), /máximo 60/);
  rechaza(() => validateLanding(con({ tipo: 'texto', contenido: 'a'.repeat(2001) }), ids), /2000/);
  rechaza(() => validateLanding(con({ tipo: 'destacados', items_ids: ['fantasma'] }), ids), /no existen en el catálogo: fantasma/);
  validateLanding(con({ tipo: 'destacados', items_ids: ['fantasma'] })); // sin catálogo, no se comprueba
});

test('landing: posición de la sección respecto al catálogo', () => {
  const con = posicion => { const l = copia(landing); l.secciones[0].posicion = posicion; return l; };
  validateLanding(con('antes'), ids);
  validateLanding(con('despues'), ids);
  rechaza(() => validateLanding(con('arriba'), ids), /'antes' o 'despues'/);
});

test('faq: límites', () => {
  rechaza(() => validateFAQ({ preguntas: Array.from({ length: 16 }, () => ({ p: 'p', r: 'r' })) }), /15/);
  rechaza(() => validateFAQ({ preguntas: [{ p: '', r: 'r' }] }), /'p'/);
});

test('config: moneda_personalizada', () => {
  const con = valor => { const c = copia(config); c.perfil.moneda_personalizada = valor; return c; };
  validateConfig(con(''));
  validateConfig(con(null));
  validateConfig(con('UYU'));
  for (const malo of ['uy', 'UYUU', 'U1Y']) {
    rechaza(() => validateConfig(con(malo)), /moneda_personalizada/);
  }
});

test('config: formato_numero opcional', () => {
  const con = valor => { const c = copia(config); c.perfil.formato_numero = valor; return c; };
  for (const bueno of [undefined, null, 'coma-punto', 'punto-coma', 'espacio-coma']) validateConfig(con(bueno));
  rechaza(() => validateConfig(con('otro')), /formato_numero/);
});

test('config: simbolo_moneda opcional', () => {
  const con = valor => { const c = copia(config); c.perfil.simbolo_moneda = valor; return c; };
  for (const bueno of [undefined, null, '', 'S/', 'S/.', '$/.', 'Bs.', '€']) validateConfig(con(bueno));
  for (const malo of ['S/.....', ' S/', 5, '<b>']) rechaza(() => validateConfig(con(malo)), /simbolo_moneda/);
});

test('normalizarConfig: moneda_personalizada válida pasa a ser perfil.moneda', () => {
  const c = copia(config); c.perfil.moneda = 'PEN'; c.perfil.moneda_personalizada = 'UYU';
  assert.equal(normalizarConfig(c).perfil.moneda, 'UYU');
  c.perfil.moneda_personalizada = 'uy';
  assert.equal(normalizarConfig(c).perfil.moneda, 'PEN');
  c.perfil.moneda_personalizada = null;
  assert.equal(normalizarConfig(c).perfil.moneda, 'PEN');
});

test('config: WhatsApp por número, por usuario o ambos', () => {
  const con = cambios => { const c = copia(config); Object.assign(c.perfil, cambios); return c; };
  validateConfig(con({ whatsapp: '', whatsapp_usuario: 'revelix360' }));
  validateConfig(con({ whatsapp: null, whatsapp_usuario: '@revelix.360' }));
  validateConfig(con({ whatsapp_usuario: 'revelix360' }));
  rechaza(() => validateConfig(con({ whatsapp: '', whatsapp_usuario: null })), /número.*usuario/);
  rechaza(() => validateConfig(con({ whatsapp_usuario: 'con espacios' })), /whatsapp_usuario/);
  rechaza(() => validateConfig(con({ whatsapp_usuario: '12345' })), /whatsapp_usuario/);
  const sinCampo = copia(config); delete sinCampo.perfil.whatsapp;
  sinCampo.perfil.whatsapp_usuario = 'revelix360';
  validateConfig(sinCampo);
});

test('normalizarConfig traduce los nombres anteriores (negocio/modo_negocio)', () => {
  const nuevo = normalizarConfig({ negocio: { nombre: 'X', modo_negocio: 'mixto' }, analitica: null });
  assert.deepEqual(nuevo, { perfil: { nombre: 'X', tipo_catalogo: 'mixto' }, analitica: null });
  const actual = { perfil: { nombre: 'X', tipo_catalogo: 'solo-servicios' } };
  assert.equal(normalizarConfig(actual), actual);
});

test('catálogo: galería de fotos (solo servicios)', () => {
  validateCatalogo(conItem({ galeria: [{ n: 2, alt: 'Sala' }, { n: 1 }] }));
  rechaza(() => validateCatalogo(conItem({ galeria: [{ n: 1 }] }, producto())), /solo los servicios/);
  rechaza(() => validateCatalogo(conItem({ galeria: [{ n: 7 }] })), /de 1 a 6/);
  rechaza(() => validateCatalogo(conItem({ galeria: [{ n: 1 }, { n: 1 }] })), /repite/);
  rechaza(() => validateCatalogo(conItem({ galeria: [{ n: 1, alt: 'x'.repeat(101) }] })), /100 caracteres/);
  rechaza(() => validateCatalogo(conItem({ galeria: [1, 2, 3, 4, 5, 6, 7].map(n => ({ n })) })), /máximo 6/);
  const c = copia(catalogo);
  c.items.push({ ...copia(c.items[servicio()]), id: `${c.items[servicio()].id}-g1` });
  rechaza(() => validateCatalogo(c), /galería/);
});

test('perfil.direccion es opcional; con datos exige ciudad y país ISO de 2 letras', () => {
  const config = ejemplo('config');
  const con = direccion => { const c = copia(config); c.perfil.direccion = direccion; return c; };
  validateConfig(con(null));
  validateConfig(con({ calle: 'Av. Larco 123', ciudad: 'Lima', region: 'Lima', codigo_postal: '15074', pais: 'PE' }));
  validateConfig(con({ calle: null, ciudad: null, region: null, codigo_postal: null, pais: null }));
  assert.throws(() => validateConfig(con({ calle: 'Av. Larco 123' })), /ciudad es obligatoria/);
  assert.throws(() => validateConfig(con({ ciudad: 'Lima', pais: 'Perú' })), /2 letras/);
  assert.throws(() => validateConfig(con({ ciudad: 'Lima', pais: 'pe' })), /2 letras/);
  assert.throws(() => validateConfig(con({ ciudad: 'x'.repeat(81) })), /80 caracteres/);
  assert.throws(() => validateConfig(con('Lima')), /objeto/);
});

test('landing: las secciones únicas no se pueden repetir', () => {
  const con = tipo => {
    const l = copia(landing);
    l.secciones.push({ tipo, titulo: 'Repetida', contenido: 'x', items_ids: [] });
    return l;
  };
  // El ejemplo ya trae «Sobre mí» y «Contacto»
  rechaza(() => validateLanding(con('sobre-mi'), ids), /Solo puede haber una sección «Sobre mí»/);
  rechaza(() => validateLanding(con('contacto'), ids), /Solo puede haber una sección «Contacto»/);
  // Testimonios: una vez vale, dos no
  const una = con('testimonios');
  validateLanding(una, ids);
  una.secciones.push({ tipo: 'testimonios', titulo: 'Otra', contenido: '', items_ids: [] });
  rechaza(() => validateLanding(una, ids), /Solo puede haber una sección «Testimonios»/);
  // Texto, destacados y galería sí pueden repetirse
  validateLanding(con('texto'), ids);
  validateLanding(con('destacados'), ids);
  validateLanding(con('galeria'), ids);
});

test('landing: hero.fondo_estilo admite oscuro o claro', () => {
  const con = fondo => { const l = copia(landing); l.hero = { ...l.hero, fondo_estilo: fondo }; return l; };
  validateLanding(con('claro'), ids);
  validateLanding(con('acento'), ids);
  validateLanding(con('oscuro'), ids);
  rechaza(() => validateLanding(con('rojo'), ids), /fondo_estilo/);
});
