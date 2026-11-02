// assets/admin.js
// Utilidades del admin

async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

async function login(password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en el servidor');
  }

  return await response.json();
}

async function isAuthenticated() {
  const response = await fetch('/api/session');
  return response.ok;
}

const CONTENT_KEYS = ['config', 'catalogo', 'landing', 'faq'];

// Devuelve el contenido guardado. Si la key aún no existe (primer arranque),
// devuelve los datos de ejemplo y avisa de que todavía no están guardados.
async function getContent(key) {
  const response = await fetch(`/api/content?key=${key}`, { cache: 'no-store' });

  if (response.status === 404) {
    const ejemplo = await fetch(`/api/defaults?key=${key}`);
    if (ejemplo.ok) {
      mostrarAvisoEjemplo();
      return await ejemplo.json();
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error obteniendo contenido');
  }
  return await response.json();
}

function mostrarAvisoEjemplo() {
  if (document.getElementById('aviso-ejemplo')) return;

  const panel = document.querySelector('.admin-panel');
  if (!panel) return;

  const aviso = document.createElement('div');
  aviso.id = 'aviso-ejemplo';
  aviso.setAttribute('role', 'status');
  aviso.style.cssText = 'background:#fff8e1;color:#5d4037;border:1px solid #ffb300;padding:0.8rem 1rem;border-radius:5px;margin-bottom:1.5rem;';
  aviso.textContent = 'Aún no hay datos guardados: se muestran datos de ejemplo. Edítalos y pulsa Guardar para publicarlos.';

  const header = panel.querySelector('.admin-header');
  panel.insertBefore(aviso, header ? header.nextSibling : panel.firstChild);
}

async function putContent(key, data) {
  const response = await fetch(`/api/content?key=${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // El servidor explica qué corregir en `detalle`; `error` es solo la categoría
    throw new Error(error.detalle || error.error || 'Error guardando contenido');
  }

  // Ya hay datos guardados: el aviso de ejemplo deja de ser cierto
  const aviso = document.getElementById('aviso-ejemplo');
  if (aviso) aviso.remove();

  return await response.json();
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/admin/index.html';
}

const FOTO_LADO_MAX = 1200;
const FOTO_PESO_MAX = 250 * 1024;

function canvasABlob(canvas, calidad, tipo = 'image/jpeg') {
  return new Promise(resolve => canvas.toBlob(resolve, tipo, calidad));
}

// Reduce la foto a JPEG de hasta 1200 px y ~250 KB. Una imagen ligera y en JPEG se ve rápido en el sitio
// y es la que WhatsApp acepta en la vista previa de un enlace (con WebP o pesos grandes no la muestra).
// Si el navegador no puede procesarla, devuelve el archivo original.
// opciones: { ladoMax, pesoMax, transparencia }. Con transparencia (logo) un PNG o WebP sale en PNG
// para conservar el fondo transparente; si no, siempre JPEG.
async function optimizarImagen(archivo, { ladoMax = FOTO_LADO_MAX, pesoMax = FOTO_PESO_MAX, transparencia = false } = {}) {
  try {
    const bitmap = await createImageBitmap(archivo);
    const conservarPng = transparencia && archivo.type !== 'image/jpeg';
    let escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    let blob;

    for (let intento = 0; intento < 6; intento++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));

      const ctx = canvas.getContext('2d');
      if (!conservarPng) {
        ctx.fillStyle = '#ffffff'; // JPEG no tiene transparencia
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      if (conservarPng) {
        blob = await canvasABlob(canvas, undefined, 'image/png');
      } else {
        for (const calidad of [0.85, 0.78, 0.7, 0.62, 0.55]) {
          blob = await canvasABlob(canvas, calidad);
          if (blob && blob.size <= pesoMax) break;
        }
      }
      if (blob && blob.size <= pesoMax) break;
      escala *= 0.85;
    }

    bitmap.close();
    if (!blob) return archivo;
    return conservarPng
      ? new File([blob], 'imagen.png', { type: 'image/png' })
      : new File([blob], 'foto.jpg', { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}

// Optimiza y sube la foto de un item (o del id reservado «sobre-mi») a POST /api/upload.
async function subirFoto(id, archivo, opciones) {
  const optimizada = await optimizarImagen(archivo, opciones);
  const datos = new FormData();
  datos.append('id', id);
  datos.append('file', optimizada);
  const respuesta = await fetch('/api/upload', { method: 'POST', body: datos });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.detalle || error.error || 'No se pudo subir la foto');
  }
  return respuesta.json();
}

// Imagen del sitio que se sube desde el admin (fondo del hero, logo): vista previa, «Subir imagen» y «Quitar»
// junto a un campo de texto con la URL. Al subir, el campo pasa a «/api/image?id=…&v=…» (la `v` evita ver una
// versión vieja en caché); se guarda con el botón Guardar de la página. Devuelve { refrescar } para
// repintar la vista previa cuando la página rellena el campo.
// opciones: { id, entrada, ladoMax, pesoMax, transparencia, minimo: { ancho, alto } }
function montarSubidaImagen(contenedor, { id, entrada, ladoMax, pesoMax, transparencia = false, minimo }) {
  contenedor.classList.add('subida-imagen');
  const vista = document.createElement('img');
  vista.className = 'subida-imagen-vista';
  vista.alt = '';
  vista.hidden = true;
  const archivo = document.createElement('input');
  archivo.type = 'file';
  archivo.accept = 'image/jpeg,image/png,image/webp';
  archivo.setAttribute('aria-label', 'Elegir una imagen de tu equipo');
  const subir = document.createElement('button');
  subir.type = 'button';
  subir.className = 'btn-mini';
  subir.textContent = 'Subir imagen';
  subir.disabled = true;
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'btn-mini';
  quitar.textContent = 'Quitar';
  const estado = document.createElement('p');
  estado.className = 'ayuda';
  estado.setAttribute('role', 'status');
  const fila = document.createElement('div');
  fila.className = 'subida-imagen-acciones';
  fila.append(archivo, subir, quitar);
  contenedor.append(vista, fila, estado);

  function refrescar() {
    const url = entrada.value.trim();
    quitar.hidden = !url;
    if (!url) { vista.hidden = true; return; }
    vista.onload = () => { vista.hidden = false; };
    vista.onerror = () => { vista.hidden = true; };
    vista.src = url;
  }
  entrada.addEventListener('change', refrescar);
  archivo.addEventListener('change', () => { subir.disabled = !archivo.files[0]; });
  quitar.addEventListener('click', () => {
    entrada.value = '';
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
    estado.textContent = 'Imagen quitada. Pulsa Guardar para aplicar el cambio.';
    refrescar();
  });
  subir.addEventListener('click', async () => {
    const original = archivo.files[0];
    if (!original) return;
    subir.disabled = true;
    subir.textContent = 'Subiendo…';
    try {
      let aviso = '';
      try {
        const bitmap = await createImageBitmap(original);
        if (minimo && (bitmap.width < minimo.ancho || bitmap.height < minimo.alto)) {
          aviso = ` Ojo: mide ${bitmap.width} × ${bitmap.height} px y lo mínimo recomendado es ${minimo.ancho} × ${minimo.alto} px; podría verse borrosa.`;
        }
        bitmap.close();
      } catch { /* si no se puede leer, el servidor la validará */ }
      const resultado = await subirFoto(id, original, { ladoMax, pesoMax, transparencia });
      entrada.value = `${resultado.url}&v=${Date.now()}`;
      entrada.dispatchEvent(new Event('input', { bubbles: true }));
      archivo.value = '';
      estado.textContent = 'Imagen subida. Pulsa Guardar para aplicarla.' + aviso;
      refrescar();
    } catch (error) {
      estado.textContent = error.message || 'No se pudo subir la imagen. Inténtalo de nuevo.';
      subir.disabled = false;
    } finally {
      subir.textContent = 'Subir imagen';
    }
  });
  refrescar();
  return { refrescar };
}

// (leerZip y crearZip están más abajo; las funciones declaradas se pueden usar antes)
// ---- Fuentes propias (tipografías) ----
// Elige, de una lista de archivos (los de un .zip de Google Fonts o sueltos), los que usaremos:
// Regular (400) y Bold (700) estáticos; si no hay, una fuente variable; si no, el único archivo que haya.
// entradas: [{ nombre, datos: Uint8Array }] -> { nombre, archivos: [{ peso, ext, nombre, datos }], avisos }
const ORDEN_EXT = ['woff2', 'woff', 'ttf', 'otf'];

function clasificarFuentes(entradas) {
  const candidatas = entradas
    .map(({ nombre, datos }) => {
      const base = nombre.split('/').pop();
      const m = /\.(woff2|woff|ttf|otf)$/i.exec(base);
      if (!m || nombre.startsWith('__MACOSX/') || base.startsWith('.')) return null;
      return { nombre: base, ext: m[1].toLowerCase(), datos };
    })
    .filter(Boolean)
    .filter(f => !/italic|oblique/i.test(f.nombre));
  if (!candidatas.length) throw new Error('No encontré archivos de fuente (.ttf, .otf, .woff o .woff2) en lo que elegiste.');

  const mejor = lista => [...lista].sort((a, b) => ORDEN_EXT.indexOf(a.ext) - ORDEN_EXT.indexOf(b.ext))[0];
  const variables = candidatas.filter(f => /\[[^\]]*wght[^\]]*\]|variablefont/i.test(f.nombre));
  const estaticas = candidatas.filter(f => !variables.includes(f));
  const normal = estaticas.filter(f => /(^|[-_ ])(regular|book)\./i.test(f.nombre));
  const negrita = estaticas.filter(f => /(^|[-_ ])bold\./i.test(f.nombre));

  const avisos = [];
  let elegidas;
  if (normal.length && negrita.length) {
    elegidas = [{ peso: '400', ...mejor(normal) }, { peso: '700', ...mejor(negrita) }];
  } else if (variables.length) {
    elegidas = [{ peso: 'variable', ...mejor(variables) }];
  } else if (normal.length) {
    elegidas = [{ peso: '400', ...mejor(normal) }];
    avisos.push('No encontré la versión Bold: lo que va en negrita se verá con una negrita simulada, menos bonita.');
  } else if (candidatas.length === 1) {
    elegidas = [{ peso: '400', ...candidatas[0] }];
    avisos.push('Solo hay un archivo: lo que va en negrita se verá con una negrita simulada, menos bonita.');
  } else {
    throw new Error('No pude saber cuál es la versión normal (Regular) de la fuente. Elige directamente el archivo que quieras usar.');
  }

  const nombre = elegidas[0].nombre
    .replace(/\.[^.]+$/, '')
    .replace(/\[.*$/, '')
    .split('-')[0]
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[<>"\\]/g, '')
    .trim()
    .slice(0, 60) || 'Mi fuente';
  return { nombre, archivos: elegidas, avisos };
}

// Convierte un .ttf/.otf a WOFF (cada tabla comprimida con zlib, sin librerías): pesa cerca de la mitad.
// Si no se puede (el navegador no tiene CompressionStream o el archivo no es un TTF/OTF simple) devuelve null.
async function aWoff(datos) {
  if (typeof CompressionStream !== 'function' || datos.length < 12) return null;
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  const version = vista.getUint32(0);
  if (![0x00010000, 0x4f54544f, 0x74727565].includes(version)) return null; // ttcf (colecciones) y demás: sin convertir
  const n = vista.getUint16(4);
  const tablas = [];
  for (let i = 0; i < n; i++) {
    const pos = 12 + i * 16;
    const tabla = {
      etiqueta: datos.subarray(pos, pos + 4),
      suma: vista.getUint32(pos + 4),
      largo: vista.getUint32(pos + 12),
      origen: vista.getUint32(pos + 8),
    };
    if (tabla.origen + tabla.largo > datos.length) return null;
    const bruto = datos.subarray(tabla.origen, tabla.origen + tabla.largo);
    const flujo = new Blob([bruto]).stream().pipeThrough(new CompressionStream('deflate'));
    const comprimido = new Uint8Array(await new Response(flujo).arrayBuffer());
    tabla.datos = comprimido.length < bruto.length ? comprimido : bruto;
    tablas.push(tabla);
  }
  const relleno = x => (x + 3) & ~3;
  let total = 44 + 20 * n;
  const desplazamientos = tablas.map(t => { const o = total; total += relleno(t.datos.length); return o; });
  const salida = new Uint8Array(total);
  const v = new DataView(salida.buffer);
  salida.set([0x77, 0x4f, 0x46, 0x46]); // «wOFF»
  v.setUint32(4, version);
  v.setUint32(8, total);
  v.setUint16(12, n);
  v.setUint32(16, 12 + 16 * n + tablas.reduce((suma, t) => suma + relleno(t.largo), 0));
  tablas.forEach((t, i) => {
    const pos = 44 + i * 20;
    salida.set(t.etiqueta, pos);
    v.setUint32(pos + 4, desplazamientos[i]);
    v.setUint32(pos + 8, t.datos.length);
    v.setUint32(pos + 12, t.largo);
    v.setUint32(pos + 16, t.suma);
    salida.set(t.datos, desplazamientos[i]);
  });
  return salida;
}

// Selector de fuente para «Títulos» o «Texto»: acepta el .zip que se descarga de Google Fonts o archivos sueltos,
// elige Regular y Bold (o la variable), los pasa a WOFF y los sube a POST /api/fuente.
// opciones: { ranura: 'titulos'|'texto', alCambiar(valor|null) }; valor = { nombre, archivos: [{ peso, formato, v }] }
// Devuelve { cargar(valor) } para pintar lo que ya estaba guardado. Se guarda con el botón Guardar de la página.
function montarSubidaFuente(contenedor, { ranura, alCambiar }) {
  const MAX_BYTES = 1024 * 1024;
  contenedor.classList.add('subida-fuente');
  const vista = document.createElement('div');
  vista.className = 'subida-fuente-vista';
  vista.hidden = true;
  const etiquetaVista = document.createElement('p');
  etiquetaVista.className = 'ayuda';
  const muestra = document.createElement('p');
  muestra.className = 'subida-fuente-muestra';
  muestra.textContent = 'Dibujo el mapa de tu web: 0123456789';
  const muestraNegrita = document.createElement('p');
  muestraNegrita.className = 'subida-fuente-muestra';
  muestraNegrita.style.fontWeight = '700';
  muestraNegrita.textContent = 'Así se ve en negrita';
  vista.append(etiquetaVista, muestra, muestraNegrita);

  const archivo = document.createElement('input');
  archivo.type = 'file';
  archivo.multiple = true;
  archivo.accept = '.zip,.woff2,.woff,.ttf,.otf';
  archivo.setAttribute('aria-label', 'Elegir el .zip de Google Fonts o archivos de fuente');
  const subir = document.createElement('button');
  subir.type = 'button';
  subir.className = 'btn-mini';
  subir.textContent = 'Subir fuente';
  subir.disabled = true;
  const quitar = document.createElement('button');
  quitar.type = 'button';
  quitar.className = 'btn-mini';
  quitar.textContent = 'Quitar';
  quitar.hidden = true;
  const estado = document.createElement('p');
  estado.className = 'ayuda';
  estado.setAttribute('role', 'status');
  const fila = document.createElement('div');
  fila.className = 'subida-imagen-acciones';
  fila.append(archivo, subir, quitar);
  contenedor.append(vista, fila, estado);

  const estilo = document.createElement('style');
  document.head.appendChild(estilo);
  const familia = `Vista previa ${ranura}`;
  muestra.style.fontFamily = muestraNegrita.style.fontFamily = `"${familia}", sans-serif`;

  function mostrar(valor) {
    quitar.hidden = !valor;
    vista.hidden = !valor;
    if (!valor) { estilo.textContent = ''; return; }
    etiquetaVista.textContent = `Fuente: ${valor.nombre}`;
    estilo.textContent = valor.archivos.map(a =>
      `@font-face{font-family:"${familia}";src:url("/api/fuente?id=${ranura}-${a.peso}&v=${a.v}") format("${a.formato}");font-weight:${a.peso === 'variable' ? '100 900' : a.peso};font-display:swap}`
    ).join('');
  }

  archivo.addEventListener('change', () => { subir.disabled = !archivo.files.length; });
  quitar.addEventListener('click', () => {
    mostrar(null);
    alCambiar(null);
    estado.textContent = 'Fuente quitada. Pulsa Guardar para aplicar el cambio.';
  });
  subir.addEventListener('click', async () => {
    subir.disabled = true;
    subir.textContent = 'Subiendo…';
    try {
      const entradas = [];
      for (const f of archivo.files) {
        if (/\.zip$/i.test(f.name)) entradas.push(...await leerZip(await f.arrayBuffer()));
        else entradas.push({ nombre: f.name, datos: new Uint8Array(await f.arrayBuffer()) });
      }
      const { nombre, archivos, avisos } = clasificarFuentes(entradas);

      const subidos = [];
      for (const elegido of archivos) {
        let datos = elegido.datos;
        if (elegido.ext === 'ttf' || elegido.ext === 'otf') datos = (await aWoff(datos)) || datos;
        if (datos.length > MAX_BYTES) {
          throw new Error(`«${elegido.nombre}» pesa ${Math.round(datos.length / 1024)} KB y el máximo es 1024 KB. Prueba con una fuente más ligera (las versiones Regular y Bold pesan menos que la variable).`);
        }
        const formulario = new FormData();
        formulario.append('id', `${ranura}-${elegido.peso}`);
        formulario.append('file', new File([datos], 'fuente', { type: 'application/octet-stream' }));
        const respuesta = await fetch('/api/fuente', { method: 'POST', body: formulario });
        const cuerpo = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(cuerpo.detalle || cuerpo.error || 'No se pudo subir la fuente');
        subidos.push({ peso: elegido.peso, formato: cuerpo.formato, v: Date.now(), kb: Math.round(cuerpo.bytes / 1024) });
      }
      const valor = { nombre, archivos: subidos.map(({ peso, formato, v }) => ({ peso, formato, v })) };
      mostrar(valor);
      alCambiar(valor);
      archivo.value = '';
      const pesos = subidos.map(s => s.peso === 'variable' ? 'variable' : s.peso === '700' ? 'negrita' : 'normal').join(' y ');
      estado.textContent = `Fuente «${nombre}» subida (${pesos}, ${subidos.reduce((t, s) => t + s.kb, 0)} KB). Pulsa Guardar para aplicarla. `
        + 'Comprueba que tengas licencia para usarla en una web.'
        + (avisos.length ? ' ' + avisos.join(' ') : '');
    } catch (error) {
      estado.textContent = error.message || 'No se pudo subir la fuente. Inténtalo de nuevo.';
      subir.disabled = !archivo.files.length;
    } finally {
      subir.textContent = 'Subir fuente';
    }
  });
  return { cargar: valor => { mostrar(valor || null); } };
}

// ---- ZIP mínimo (sin compresión) para descargar las fotos sin librerías ----
const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos) {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// archivos: [{ nombre, datos: Uint8Array }] -> Blob .zip (método «store», nombres en UTF-8)
function crearZip(archivos) {
  const codificador = new TextEncoder();
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
  const partes = [];
  const central = [];
  let posicion = 0;

  for (const { nombre, datos } of archivos) {
    const nombreBytes = codificador.encode(nombre);
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombreBytes.length, true);
    partes.push(local, nombreBytes, datos);

    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true);
    entrada.setUint16(6, 20, true);
    entrada.setUint16(8, 0x0800, true);
    entrada.setUint16(12, hora, true);
    entrada.setUint16(14, fecha, true);
    entrada.setUint32(16, crc, true);
    entrada.setUint32(20, datos.length, true);
    entrada.setUint32(24, datos.length, true);
    entrada.setUint16(28, nombreBytes.length, true);
    entrada.setUint32(42, posicion, true);
    central.push(entrada, nombreBytes);

    posicion += 30 + nombreBytes.length + datos.length;
  }

  const tamCentral = central.reduce((suma, p) => suma + (p.byteLength ?? p.length), 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, posicion, true);
  return new Blob([...partes, ...central, fin], { type: 'application/zip' });
}

// Lee un .zip (el nuestro, «store», o uno recomprimido con «deflate») -> [{ nombre, datos: Uint8Array }]
async function leerZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const vista = new DataView(buffer);
  const decodificador = new TextDecoder();

  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('El archivo no es un .zip válido');

  const total = vista.getUint16(fin + 10, true);
  let pos = vista.getUint32(fin + 16, true);
  const entradas = [];

  for (let n = 0; n < total; n++) {
    if (vista.getUint32(pos, true) !== 0x02014b50) throw new Error('El .zip está dañado');
    const metodo = vista.getUint16(pos + 10, true);
    const comprimido = vista.getUint32(pos + 20, true);
    const largoNombre = vista.getUint16(pos + 28, true);
    const largoExtra = vista.getUint16(pos + 30, true);
    const largoComentario = vista.getUint16(pos + 32, true);
    const desplazamiento = vista.getUint32(pos + 42, true);
    const nombre = decodificador.decode(bytes.subarray(pos + 46, pos + 46 + largoNombre));
    pos += 46 + largoNombre + largoExtra + largoComentario;
    if (nombre.endsWith('/')) continue;

    const inicio = desplazamiento + 30 + vista.getUint16(desplazamiento + 26, true) + vista.getUint16(desplazamiento + 28, true);
    const crudo = bytes.subarray(inicio, inicio + comprimido);
    let datos;
    if (metodo === 0) {
      datos = crudo;
    } else if (metodo === 8 && typeof DecompressionStream === 'function') {
      const flujo = new Blob([crudo]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      datos = new Uint8Array(await new Response(flujo).arrayBuffer());
    } else {
      throw new Error('El .zip usa una compresión que este navegador no puede leer. Usa el zip que descargaste de aquí.');
    }
    entradas.push({ nombre, datos });
  }
  return entradas;
}

// Sube las fotos de un .zip (como el de exportarFotos) a POST /api/upload, tal cual, sin recomprimirlas.
// El nombre de cada archivo (sin carpeta ni extensión) es el id de la foto; el item debe existir en el
// catálogo (importa antes el respaldo .json). Devuelve [{ id, ok, error? }].
async function importarFotos(archivoZip, alProgreso = () => {}) {
  const TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const todas = await leerZip(await archivoZip.arrayBuffer());
  const fuentes = todas
    .map(({ nombre, datos }) => {
      const m = /^fuentes\/((?:titulos|texto)-(?:400|700|variable))\.(?:woff2|woff|ttf|otf)$/i.exec(nombre);
      return m ? { id: m[1].toLowerCase(), datos } : null;
    })
    .filter(Boolean);
  const entradas = todas
    .map(({ nombre, datos }) => {
      const base = nombre.split('/').pop();
      const m = /^([a-z0-9-]+)\.(jpg|jpeg|png|webp)$/i.exec(base);
      return m && !nombre.startsWith('__MACOSX/') ? { id: m[1].toLowerCase(), tipo: TIPOS[m[2].toLowerCase()], datos } : null;
    })
    .filter(Boolean);
  if (!entradas.length && !fuentes.length) throw new Error('El .zip no contiene fotos con el formato esperado (por ejemplo fotos/mi-servicio.jpg).');

  const resultados = [];
  for (const { id, datos } of fuentes) {
    const formulario = new FormData();
    formulario.append('id', id);
    formulario.append('file', new File([datos], id, { type: 'application/octet-stream' }));
    try {
      const respuesta = await fetch('/api/fuente', { method: 'POST', body: formulario });
      if (respuesta.ok) resultados.push({ id: `fuente ${id}`, ok: true });
      else {
        const error = await respuesta.json().catch(() => ({}));
        resultados.push({ id: `fuente ${id}`, ok: false, error: error.detalle || error.error || `Error ${respuesta.status}` });
      }
    } catch {
      resultados.push({ id: `fuente ${id}`, ok: false, error: 'No se pudo conectar' });
    }
  }
  for (const [i, { id, tipo, datos }] of entradas.entries()) {
    alProgreso(i + 1, entradas.length);
    const formulario = new FormData();
    formulario.append('id', id);
    formulario.append('file', new File([datos], `${id}`, { type: tipo }));
    try {
      const respuesta = await fetch('/api/upload', { method: 'POST', body: formulario });
      if (respuesta.ok) {
        resultados.push({ id, ok: true });
      } else {
        const error = await respuesta.json().catch(() => ({}));
        resultados.push({ id, ok: false, error: error.detalle || error.error || `Error ${respuesta.status}` });
      }
    } catch {
      resultados.push({ id, ok: false, error: 'No se pudo conectar' });
    }
  }
  return resultados;
}

// Descarga todas las fotos subidas (items, galerías de servicios, «Sobre mí», logo y fondo) en un .zip.
// No hay listado de fotos en el servidor: se piden por los ids del catálogo y las reservadas; las que no
// existen (404) se omiten. Las fotos de items borrados del catálogo no se incluyen.
async function exportarFotos(alProgreso = () => {}) {
  const catalogo = await getContent('catalogo');
  const ids = ['sobre-mi', 'logo', 'fondo-hero'];
  for (const item of catalogo.items || []) {
    ids.push(item.id);
    for (const foto of item.galeria || []) ids.push(`${item.id}-g${foto.n}`);
  }

  const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const archivos = [];
  let hechas = 0;
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < ids.length) {
      const id = ids[siguiente++];
      try {
        const respuesta = await fetch(`/api/image?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (respuesta.ok) {
          const ext = EXTENSION[(respuesta.headers.get('Content-Type') || '').split(';')[0]] || 'jpg';
          archivos.push({ nombre: `fotos/${id}.${ext}`, datos: new Uint8Array(await respuesta.arrayBuffer()) });
        }
      } catch { /* una foto que falla se omite */ }
      alProgreso(++hechas, ids.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabajador));

  // Fuentes propias: van en la carpeta fuentes/ del mismo .zip
  const EXT_FUENTE = { 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf' };
  for (const id of ['titulos-400', 'titulos-700', 'titulos-variable', 'texto-400', 'texto-700', 'texto-variable']) {
    try {
      const respuesta = await fetch(`/api/fuente?id=${id}`, { cache: 'no-store' });
      if (respuesta.ok) {
        const ext = EXT_FUENTE[(respuesta.headers.get('Content-Type') || '').split(';')[0]];
        if (ext) archivos.push({ nombre: `fuentes/${id}.${ext}`, datos: new Uint8Array(await respuesta.arrayBuffer()) });
      }
    } catch { /* una fuente que falla se omite */ }
  }

  if (!archivos.length) throw new Error('Todavía no hay fotos subidas.');
  archivos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { blob: crearZip(archivos), total: archivos.length };
}

// Respaldo: un solo JSON con las 4 keys. Las escrituras pasan por PUT /api/content.
async function exportarTodo() {
  const respaldo = { version: 1, exportado: new Date().toISOString() };

  for (const key of CONTENT_KEYS) {
    const response = await fetch(`/api/content?key=${key}`, { cache: 'no-store' });
    if (response.ok) respaldo[key] = await response.json();
  }

  if (!CONTENT_KEYS.some(key => key in respaldo)) {
    throw new Error('No hay contenido guardado para exportar');
  }
  return respaldo;
}

async function importarTodo(respaldo) {
  if (!respaldo || typeof respaldo !== 'object' || Array.isArray(respaldo)) {
    throw new Error('El archivo no es un respaldo válido');
  }

  const presentes = CONTENT_KEYS.filter(key => key in respaldo);
  if (!presentes.length) {
    throw new Error('El archivo no contiene config, catalogo, landing ni faq');
  }

  const resultados = [];
  for (const key of presentes) {
    try {
      await putContent(key, respaldo[key]);
      resultados.push({ key, ok: true });
    } catch (error) {
      resultados.push({ key, ok: false, error: error.message });
    }
  }
  return resultados;
}

const SECCIONES_ADMIN = [
  ['identidad.html', 'General'],
  ['landing.html', 'Mi página'],
  ['catalogo.html', 'Mi catálogo'],
  ['faq.html', 'FAQ'],
  ['respaldo.html', 'Respaldo'],
];

// Barra de navegación común; el login (index.html) no la lleva.
function montarNavegacionAdmin() {
  // Workers (assets) sirve /admin/identidad sin la extensión .html
  const actual = location.pathname.split('/').pop().replace(/\.html$/, '');
  const contenedor = document.querySelector('nav .container');
  if (!contenedor || !SECCIONES_ADMIN.some(([archivo]) => archivo.replace(/\.html$/, '') === actual)) return;

  const lista = document.createElement('ul');
  lista.className = 'nav-links nav-admin';
  lista.setAttribute('aria-label', 'Secciones del panel');

  for (const [archivo, nombre] of SECCIONES_ADMIN) {
    const item = document.createElement('li');
    const enlace = document.createElement('a');
    enlace.href = `/admin/${archivo}`;
    enlace.textContent = nombre;
    if (archivo.replace(/\.html$/, '') === actual) {
      enlace.setAttribute('aria-current', 'page');
      enlace.style.color = 'var(--primary)';
      enlace.style.fontWeight = '700';
    }
    item.appendChild(enlace);
    lista.appendChild(item);
  }
  contenedor.appendChild(lista);
}

document.addEventListener('DOMContentLoaded', montarNavegacionAdmin);

// Los avisos de guardado son flotantes (CSS); el de éxito se cierra solo.
function prepararAvisosFlotantes() {
  const exito = document.getElementById('mensaje-exito');
  const error = document.getElementById('mensaje-error');
  if (exito) exito.setAttribute('role', 'status');
  if (error) error.setAttribute('role', 'alert');
  if (!exito) return;
  let temporizador;
  new MutationObserver(() => {
    clearTimeout(temporizador);
    if (!exito.classList.contains('oculto')) {
      temporizador = setTimeout(() => exito.classList.add('oculto'), 6000);
    }
  }).observe(exito, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', prepararAvisosFlotantes);

window.admin = {
  fetchJSON,
  login,
  isAuthenticated,
  getContent,
  putContent,
  optimizarImagen,
  subirFoto,
  montarSubidaImagen,
  montarSubidaFuente,
  clasificarFuentes,
  aWoff,
  exportarTodo,
  exportarFotos,
  importarFotos,
  importarTodo,
  logout
};
