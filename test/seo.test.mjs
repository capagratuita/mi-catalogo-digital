import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlCatalogoEstatico } from '../src/_lib/seo.js';
import { ejemplo, copia } from './ayuda.mjs';

const catalogo = ejemplo('catalogo');
const config = ejemplo('config');

test('htmlCatalogoEstatico lista los items y enlaza solo los servicios', () => {
  const cfg = copia(config);
  cfg.perfil.tipo_catalogo = 'mixto';
  const cat = { items: [
    { id: 'pan', tipo: 'producto', nombre: 'Pan <b>', descripcion: 'Rico & fresco' },
    { id: 'clase', tipo: 'servicio', nombre: 'Clase', descripcion: 'Una hora' },
  ] };
  const html = htmlCatalogoEstatico(cat, cfg);
  assert.match(html, /Pan &lt;b&gt;/);
  assert.match(html, /Rico &amp; fresco/);
  assert.match(html, /<a href="\/servicio\/clase">Clase<\/a>/);
  assert.doesNotMatch(html, /id=pan/);
});

test('htmlCatalogoEstatico respeta tipo_catalogo y devuelve vacío sin items', () => {
  const cfg = copia(config);
  cfg.perfil.tipo_catalogo = 'solo-servicios';
  const html = htmlCatalogoEstatico(copia(catalogo), cfg);
  assert.doesNotMatch(html, /<h2>Productos<\/h2>/);
  assert.equal(htmlCatalogoEstatico({ items: [] }, cfg), '');
});

import { xmlSitemap } from '../src/_lib/seo.js';

test('xmlSitemap pone lastmod con la fecha más reciente y lo omite si no hay fecha', () => {
  const cat = { items: [{ id: 'a', tipo: 'servicio', nombre: 'A', descripcion: '' }] };
  const xml = xmlSitemap('https://x.test', cat, {
    config: '2026-01-01T00:00:00.000Z',
    catalogo: '2026-03-01T00:00:00.000Z',
    faq: '2026-02-01T00:00:00.000Z',
  });
  assert.match(xml, /<loc>https:\/\/x\.test\/<\/loc><lastmod>2026-03-01T/);
  assert.match(xml, /<loc>https:\/\/x\.test\/faq<\/loc><lastmod>2026-02-01T/);
  assert.match(xml, /\/servicio\/a<\/loc><lastmod>2026-03-01T/);
  assert.doesNotMatch(xmlSitemap('https://x.test', cat, {}), /lastmod/);
});

test('xmlSitemap omite los items no disponibles', () => {
  const cat = { items: [
    { id: 'a', tipo: 'servicio', disponible: true },
    { id: 'b', tipo: 'producto', disponible: false },
    { id: 'c', tipo: 'producto' },
  ] };
  const xml = xmlSitemap('https://x.test', cat);
  assert.match(xml, /\/servicio\/a</);
  assert.match(xml, /\/producto\/c</);
  assert.doesNotMatch(xml, /\/producto\/b</);
});

test('xmlSitemap solo lista los items del tipo que muestra el catálogo', () => {
  const cat = { items: [
    { id: 'a', tipo: 'servicio' },
    { id: 'b', tipo: 'producto' },
  ] };
  const con = modo => xmlSitemap('https://x.test', cat, {}, { perfil: { tipo_catalogo: modo } });
  assert.doesNotMatch(con('solo-servicios'), /\/producto\/b</);
  assert.match(con('solo-servicios'), /\/servicio\/a</);
  assert.doesNotMatch(con('solo-productos'), /\/servicio\/a</);
  assert.match(con('solo-productos'), /\/producto\/b</);
  const mixto = con('mixto');
  assert.match(mixto, /\/servicio\/a</);
  assert.match(mixto, /\/producto\/b</);
});

import { zonasAtendidas } from '../src/_lib/seo.js';

test('zonasAtendidas ignora servicios solo online, productos y solo-productos', () => {
  const cat = { items: [
    { id: 'a', tipo: 'servicio', modalidad: 'ambas', zona: ' Lima ' },
    { id: 'b', tipo: 'servicio', modalidad: 'presencial', zona: 'Lima' },
    { id: 'c', tipo: 'servicio', modalidad: 'online', zona: 'Todo el mundo' },
    { id: 'd', tipo: 'servicio' },
    { id: 'e', tipo: 'producto', zona: 'Cusco' },
  ] };
  assert.deepEqual(zonasAtendidas(cat, { perfil: { tipo_catalogo: 'mixto' } }), ['Lima']);
  assert.deepEqual(zonasAtendidas(cat, { perfil: { tipo_catalogo: 'solo-productos' } }), []);
});

import { direccionPostal } from '../src/_lib/seo.js';

test('direccionPostal devuelve PostalAddress solo con ciudad y omite campos vacíos', () => {
  assert.deepEqual(
    direccionPostal({ calle: ' Av. Larco 123 ', ciudad: 'Lima', region: null, codigo_postal: '', pais: 'PE' }),
    { '@type': 'PostalAddress', streetAddress: 'Av. Larco 123', addressLocality: 'Lima', addressCountry: 'PE' },
  );
  assert.equal(direccionPostal(null), null);
  assert.equal(direccionPostal({ calle: 'Av. Larco 123' }), null);
});

import { rutaItem } from '../src/_lib/seo.js';

test('rutaItem da URL limpia a servicios y productos', () => {
  assert.equal(rutaItem({ id: 'taller-masa-madre', tipo: 'servicio' }), '/servicio/taller-masa-madre');
  assert.equal(rutaItem({ id: 'pan-integral', tipo: 'producto' }), '/producto/pan-integral');
});

import { recortar, tituloPagina } from '../src/_lib/seo.js';

test('recortar corta en límite de palabra y no toca textos que caben', () => {
  assert.equal(recortar('  Hola   mundo ', 20), 'Hola mundo');
  const r = recortar('uno dos tres cuatro cinco seis siete, ocho nueve', 30);
  assert.ok(r.length <= 30 && r.endsWith('…') && !/\s…$/.test(r), r);
  assert.equal(recortar('a'.repeat(40), 10), 'a'.repeat(9) + '…');
});

test('tituloPagina quita el nombre del negocio si el título pasa de 60', () => {
  assert.equal(tituloPagina('Clase', 'Mi negocio'), 'Clase - Mi negocio');
  const largo = 'Taller intensivo de masa madre para principiantes';
  assert.equal(tituloPagina(largo, 'Panadería Artesanal El Molino'), largo);
  assert.ok(tituloPagina('x '.repeat(50), 'N').length <= 60);
});

import { localeOg } from '../src/_lib/seo.js';

test('localeOg deriva el idioma de la moneda y cae en es_LA', () => {
  assert.equal(localeOg('PEN'), 'es_PE');
  assert.equal(localeOg('MXN'), 'es_MX');
  for (const [m, l] of [['VES', 'es_VE'], ['GTQ', 'es_GT'], ['BOB', 'es_BO'], ['CUP', 'es_CU'], ['DOP', 'es_DO'], ['HNL', 'es_HN']]) assert.equal(localeOg(m), l);
  assert.equal(localeOg('USD'), 'es_LA');
  assert.equal(localeOg(undefined), 'es_LA');
});
