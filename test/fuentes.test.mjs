import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detectarFormato, htmlFuentesPropias } from '../src/_lib/fuentes.js';
import { raiz } from './ayuda.mjs';

// admin.js se carga con un window/document mínimos, como app.js en las otras pruebas
function cargarAdmin() {
  globalThis.window = {};
  globalThis.document = { addEventListener() {} };
  new Function(readFileSync(fileURLToPath(new URL('public/assets/admin.js', raiz)), 'utf8'))();
  return globalThis.window.admin;
}

const bytes = (...partes) => Uint8Array.from(partes.flat());
const texto = s => [...s].map(c => c.charCodeAt(0));
const relleno = Array(16).fill(0);

test('fuentes: el formato se reconoce por los primeros bytes', () => {
  assert.equal(detectarFormato(bytes(texto('wOF2'), relleno)), 'woff2');
  assert.equal(detectarFormato(bytes(texto('wOFF'), relleno)), 'woff');
  assert.equal(detectarFormato(bytes(texto('OTTO'), relleno)), 'opentype');
  assert.equal(detectarFormato(bytes([0, 1, 0, 0], relleno)), 'truetype');
  assert.equal(detectarFormato(bytes(texto('GIF8'), relleno)), null);
  assert.equal(detectarFormato(bytes(texto('<svg'), relleno)), null);
  assert.equal(detectarFormato(bytes(texto('wOF2'))), null);
});

test('fuentes: el CSS inyectado usa nombres fijos y respeta el respaldo', () => {
  assert.equal(htmlFuentesPropias({ fuente: 'serif' }), '');
  const html = htmlFuentesPropias({
    fuente: 'serif',
    fuentes_propias: {
      titulos: { nombre: 'Lora', archivos: [{ peso: '400', formato: 'woff2', v: 5 }, { peso: '700', formato: 'woff2', v: 5 }] },
      texto: { nombre: '"><script>', archivos: [{ peso: 'variable', formato: 'woff', v: 7 }, { peso: '999', formato: 'woff', v: 1 }] },
    },
  });
  assert.match(html, /font-family:"Fuente Titulos"/);
  assert.match(html, /\/api\/fuente\?id=titulos-700&v=5/);
  assert.match(html, /font-weight:100 900/);
  assert.match(html, /--font-heading:"Fuente Titulos",Georgia/);
  assert.match(html, /--font-body:"Fuente Texto",Georgia/);
  assert.doesNotMatch(html, /script|999/);
});

test('fuentes: la fuente de toda la página también va en los títulos, salvo que haya otra para ellos', () => {
  const archivos = [{ peso: '400', formato: 'woff2', v: 1 }];
  const solaTexto = htmlFuentesPropias({ fuente: 'sans', fuentes_propias: { texto: { nombre: 'A', archivos } } });
  assert.match(solaTexto, /--font-body:"Fuente Texto"/);
  assert.match(solaTexto, /--font-heading:"Fuente Texto"/);
  const solaTitulos = htmlFuentesPropias({ fuente: 'sans', fuentes_propias: { titulos: { nombre: 'A', archivos } } });
  assert.match(solaTitulos, /--font-heading:"Fuente Titulos"/);
  assert.doesNotMatch(solaTitulos, /--font-body/);
  const ambas = htmlFuentesPropias({ fuente: 'sans', fuentes_propias: { texto: { nombre: 'A', archivos }, titulos: { nombre: 'B', archivos } } });
  assert.match(ambas, /--font-heading:"Fuente Titulos"/);
  assert.doesNotMatch(ambas, /--font-heading:"Fuente Texto"/);
});

test('fuentes: de un .zip de Google Fonts se eligen Regular y Bold, y si no, la variable', () => {
  const admin = cargarAdmin();
  const d = new Uint8Array(4);
  const f = nombre => ({ nombre, datos: d });
  const google = [
    f('OFL.txt'), f('README.txt'), f('__MACOSX/._x.ttf'),
    f('Lora[wght].ttf'), f('Lora-Italic[wght].ttf'),
    f('static/Lora-Regular.ttf'), f('static/Lora-Bold.ttf'), f('static/Lora-BoldItalic.ttf'),
    f('static/Lora-SemiBold.ttf'), f('static/Lora-Italic.ttf'),
  ];
  const elegida = admin.clasificarFuentes(google);
  assert.deepEqual(elegida.archivos.map(a => [a.peso, a.nombre]), [['400', 'Lora-Regular.ttf'], ['700', 'Lora-Bold.ttf']]);
  assert.equal(elegida.nombre, 'Lora');
  assert.deepEqual(elegida.avisos, []);

  const soloVariable = admin.clasificarFuentes([f('OpenSans[wdth,wght].ttf'), f('OpenSans-Italic[wdth,wght].ttf')]);
  assert.deepEqual(soloVariable.archivos.map(a => a.peso), ['variable']);
  assert.equal(soloVariable.nombre, 'Open Sans');

  const soloNormal = admin.clasificarFuentes([f('Raleway-Regular.woff2'), f('Raleway-Regular.ttf')]);
  assert.equal(soloNormal.archivos[0].ext, 'woff2');
  assert.equal(soloNormal.avisos.length, 1);

  assert.equal(admin.clasificarFuentes([f('MiLetra.otf')]).archivos[0].peso, '400');
  assert.throws(() => admin.clasificarFuentes([f('a.txt'), f('b.png')]), /No encontré/);
  assert.throws(() => admin.clasificarFuentes([f('A-Light.ttf'), f('A-Medium.ttf')]), /Regular/);
});

test('fuentes: un TTF se convierte a WOFF con las tablas intactas', async () => {
  const admin = cargarAdmin();
  // TTF mínimo: cabecera + 2 tablas («head» y «name») de relleno repetitivo, que comprime bien
  const tablas = [['head', 54], ['name', 400]];
  let desplazamiento = 12 + 16 * tablas.length;
  const ttf = new Uint8Array(desplazamiento + tablas.reduce((t, [, n]) => t + ((n + 3) & ~3), 0));
  const v = new DataView(ttf.buffer);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, tablas.length);
  tablas.forEach(([etiqueta, largo], i) => {
    ttf.set(texto(etiqueta), 12 + i * 16);
    v.setUint32(12 + i * 16 + 8, desplazamiento);
    v.setUint32(12 + i * 16 + 12, largo);
    ttf.fill(65 + i, desplazamiento, desplazamiento + largo);
    desplazamiento += (largo + 3) & ~3;
  });
  const woff = await admin.aWoff(ttf);
  assert.equal(detectarFormato(woff), 'woff');
  assert.ok(woff.length < ttf.length);
  const w = new DataView(woff.buffer);
  assert.equal(w.getUint32(8), woff.length);           // longitud total
  assert.equal(w.getUint16(12), 2);                     // tablas
  assert.equal(w.getUint32(44 + 12), 54);               // tamaño original de «head»
  // La primera tabla se descomprime igual que el original
  const inicio = w.getUint32(44 + 4), comprimida = w.getUint32(44 + 8);
  const flujo = new Blob([woff.subarray(inicio, inicio + comprimida)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const original = new Uint8Array(await new Response(flujo).arrayBuffer());
  assert.deepEqual([...original], Array(54).fill(65));
  assert.equal(await admin.aWoff(bytes(texto('ttcf'), relleno)), null);
});
