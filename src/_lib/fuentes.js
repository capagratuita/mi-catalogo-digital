// Fuentes propias: la persona sube un tipo de letra para los títulos y/o el texto (KV `IMAGES`, clave
// `fuentes/{ranura}-{peso}`) y `landing.tema.fuentes_propias` dice cuáles usar. Módulo puro (sin acceso a KV).

export const RANURAS_FUENTE = ['titulos', 'texto'];
export const PESOS_FUENTE = ['400', '700', 'variable'];
export const ID_FUENTE = /^(titulos|texto)-(400|700|variable)$/;
export const MAX_FUENTE_BYTES = 1024 * 1024;

export const TIPOS_FUENTE = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  truetype: 'font/ttf',
  opentype: 'font/otf',
};

const STACKS = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

const FAMILIA = { titulos: 'Fuente Titulos', texto: 'Fuente Texto' };

// Reconoce el formato por los primeros bytes (no se fía del nombre ni del tipo que declare el navegador).
// Devuelve 'woff2' | 'woff' | 'truetype' | 'opentype' o null si no es una fuente web válida.
export function detectarFormato(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const firma = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (firma === 'wOF2') return 'woff2';
  if (firma === 'wOFF') return 'woff';
  if (firma === 'OTTO') return 'opentype';
  if (firma === 'true' || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return 'truetype';
  return null;
}

// <link rel="preload"> y <style> con los @font-face y las variables que usan las páginas públicas.
// `:root:root:root` (especificidad 0,3,0) gana a los estilos del tema, que redefinen --font-heading.
export function htmlFuentesPropias(tema) {
  const propias = tema?.fuentes_propias;
  if (!propias || typeof propias !== 'object') return '';
  const respaldo = STACKS[tema.fuente] || STACKS.sans;
  const reglas = [];
  const precargas = [];
  const variables = [];
  const usadas = new Set();

  for (const ranura of RANURAS_FUENTE) {
    const fuente = propias[ranura];
    if (!fuente || !Array.isArray(fuente.archivos)) continue;
    let usada = false;
    for (const [i, archivo] of fuente.archivos.entries()) {
      if (!PESOS_FUENTE.includes(archivo?.peso) || !TIPOS_FUENTE[archivo?.formato] || !Number.isInteger(archivo?.v)) continue;
      const url = `/api/fuente?id=${ranura}-${archivo.peso}&v=${archivo.v}`;
      const peso = archivo.peso === 'variable' ? '100 900' : archivo.peso;
      const formato = archivo.formato;
      reglas.push(`@font-face{font-family:"${FAMILIA[ranura]}";src:url("${url}") format("${formato}");font-weight:${peso};font-style:normal;font-display:swap}`);
      if (i === 0) precargas.push(`<link rel="preload" href="${url}" as="font" type="${TIPOS_FUENTE[formato]}" crossorigin>`);
      usada = true;
    }
    if (usada) variables.push(`--font-${ranura === 'texto' ? 'body' : 'heading'}:"${FAMILIA[ranura]}",${respaldo}`);
    if (usada) usadas.add(ranura);
  }
  // La fuente «de toda la página» también va en los títulos, salvo que haya una propia para ellos
  if (usadas.has('texto') && !usadas.has('titulos')) variables.push(`--font-heading:"${FAMILIA.texto}",${respaldo}`);
  if (!reglas.length) return '';
  return `${precargas.join('\n')}\n<style>${reglas.join('')}:root:root:root{${variables.join(';')}}</style>`;
}
