// Validadores de contenido (config, catalogo, landing, faq). Módulo puro: sin APIs de Cloudflare,
// para poder probarlo con Node y reutilizarlo desde functions/api/content.js.

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateType(value, expected, field) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const actual = valueType(value);
  if (!allowed.includes(actual)) {
    fail(`El campo '${field}' debe ser de tipo ${allowed.join(' o ')}, recibido ${actual}`);
  }
}

function validateObject(data, schema, prefix = '') {
  if (!isPlainObject(data)) {
    fail(`El campo '${prefix || 'datos'}' debe ser un objeto`);
  }

  for (const [key, expected] of Object.entries(schema)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (!(key in data)) {
      fail(`Campo requerido faltante: ${field}`);
    }

    if (isPlainObject(expected)) {
      validateObject(data[key], expected, field);
    } else {
      validateType(data[key], expected, field);
    }
  }

  return data;
}

// Ids que no pueden usarse en el catálogo: se reservan para fotos de la landing (ver /api/upload).
export const ID_RESERVADOS = ['sobre-mi'];

// Las fotos extra de un servicio se guardan con el id «{id}-g{n}» (n de 1 a MAX_GALERIA).
export const MAX_GALERIA = 6;
export const ID_GALERIA = /^(.+)-g([1-6])$/;

// Color de acento: se usa como fondo de botones con texto --ink (#12161C), así que ese par debe cumplir AA.
const COLOR_TINTA = '#12161c';
const CONTRASTE_MINIMO = 4.5;

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const canal = parseInt(hex.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(hexA, hexB) {
  const [claro, oscuro] = [luminancia(hexA), luminancia(hexB)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

// URL http(s) absoluta; con { relativa: true } también acepta rutas del propio sitio ("/…").
// Cadena vacía y null se consideran "sin valor".
function validarUrl(valor, campo, { relativa = false } = {}) {
  if (valor === null || valor === undefined || valor === '') return;
  const mensaje = `El campo '${campo}' debe ser una URL que empiece por https:// o http://`;
  if (typeof valor !== 'string') fail(mensaje);
  if (relativa && valor.startsWith('/') && !valor.startsWith('//')) return;
  try {
    const { protocol } = new URL(valor);
    if (protocol !== 'https:' && protocol !== 'http:') fail(mensaje);
  } catch (error) {
    if (error.message === mensaje) throw error;
    fail(mensaje);
  }
}

export const USUARIO_WHATSAPP = /^(?=.*[A-Za-z])[A-Za-z0-9._]{3,35}$/;
export const TOKEN_ANALITICA = /^[A-Za-z0-9]{16,64}$/;

// Datos guardados antes del cambio de nombres: `negocio` pasó a `perfil` y
// `modo_negocio` a `tipo_catalogo`. Se traducen al leer y al guardar, sin mutar el original.
export function normalizarConfig(data) {
  if (!isPlainObject(data)) return data;
  let resultado = data;
  if (isPlainObject(data.negocio)) {
    const { negocio, ...resto } = data;
    const { modo_negocio, ...perfil } = { ...negocio, ...(isPlainObject(data.perfil) ? data.perfil : {}) };
    if (modo_negocio !== undefined && perfil.tipo_catalogo === undefined) perfil.tipo_catalogo = modo_negocio;
    resultado = { ...resto, perfil };
  }
  // «Otra moneda»: si trae un código válido, es la moneda efectiva (perfil.moneda) en todo el sitio,
  // aunque el dato venga de un respaldo o de una escritura directa donde ambos campos no coincidan.
  const personalizada = resultado.perfil?.moneda_personalizada;
  if (isPlainObject(resultado.perfil) && typeof personalizada === 'string' && /^[A-Z]{3}$/.test(personalizada)
      && resultado.perfil.moneda !== personalizada) {
    resultado = { ...resultado, perfil: { ...resultado.perfil, moneda: personalizada } };
  }
  return resultado;
}

// Dirección postal opcional (datos estructurados de negocio local). Todos los campos son texto;
// si se rellena alguno, la ciudad es obligatoria y el país, si está, es un código ISO 3166-1 de 2 letras.
export const CAMPOS_DIRECCION = { calle: 120, ciudad: 80, region: 80, codigo_postal: 20, pais: 2 };

function validarDireccion(direccion) {
  if (direccion === undefined || direccion === null) return;
  if (!isPlainObject(direccion)) fail("El campo 'perfil.direccion' debe ser un objeto o null");
  for (const [campo, maximo] of Object.entries(CAMPOS_DIRECCION)) {
    const valor = direccion[campo];
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== 'string') fail(`El campo 'perfil.direccion.${campo}' debe ser un texto`);
    if (campo !== 'pais' && valor.length > maximo) fail(`El campo 'perfil.direccion.${campo}' admite como máximo ${maximo} caracteres`);
  }
  if (direccion.pais && !/^[A-Z]{2}$/.test(direccion.pais)) {
    fail("El país de la dirección debe ser un código de 2 letras en mayúsculas, por ejemplo PE, MX o ES");
  }
  const rellena = Object.keys(CAMPOS_DIRECCION).some(campo => String(direccion[campo] || '').trim());
  if (rellena && !String(direccion.ciudad || '').trim()) {
    fail("Si indicas una dirección, la ciudad es obligatoria (perfil.direccion.ciudad)");
  }
}

export function validateConfig(data) {
  validateObject(data, {
    perfil: {
      nombre: 'string',
      descripcion_corta: 'string',
      email: ['string', 'null'],
      moneda: 'string',
      tipo_catalogo: 'string',
      logo_url: ['string', 'null'],
      redes: {
        instagram: ['string', 'null'],
        facebook: ['string', 'null'],
      },
    },
  });

  // WhatsApp: número o nombre de usuario (al menos uno); si hay usuario, tiene prioridad en los enlaces.
  for (const campo of ['whatsapp', 'whatsapp_usuario']) {
    const valor = data.perfil[campo];
    if (valor !== undefined) validateType(valor, ['string', 'null'], `perfil.${campo}`);
  }
  const usuario = String(data.perfil.whatsapp_usuario || '').trim().replace(/^@/, '');
  if (usuario && !USUARIO_WHATSAPP.test(usuario)) {
    fail("El campo 'perfil.whatsapp_usuario' debe tener entre 3 y 35 caracteres: letras, números, puntos o guiones bajos, y al menos una letra (sin espacios)");
  }
  if (!usuario && !String(data.perfil.whatsapp || '').trim()) {
    fail("Indica un número en 'perfil.whatsapp' (con código de país) o un nombre de usuario en 'perfil.whatsapp_usuario'");
  }

  if (!['solo-productos', 'solo-servicios', 'mixto'].includes(data.perfil.tipo_catalogo)) {
    fail("El campo 'perfil.tipo_catalogo' debe ser 'solo-productos', 'solo-servicios' o 'mixto'");
  }
  if (!/^[A-Z]{3}$/.test(data.perfil.moneda)) {
    fail("El campo 'perfil.moneda' debe ser un código ISO 4217 de 3 letras");
  }
  const personalizada = data.perfil.moneda_personalizada;
  if (personalizada !== undefined) validateType(personalizada, ['string', 'null'], 'perfil.moneda_personalizada');
  if (personalizada && !/^[A-Z]{3}$/.test(personalizada)) {
    fail("El campo 'perfil.moneda_personalizada' debe ser un código de 3 letras mayúsculas, por ejemplo UYU");
  }
  // simbolo_moneda es opcional: texto que precede al precio en vez del que da Intl («S/», «S/.», «$/.», «Bs.»)
  const simbolo = data.perfil.simbolo_moneda;
  if (simbolo !== undefined) validateType(simbolo, ['string', 'null'], 'perfil.simbolo_moneda');
  if (typeof simbolo === 'string' && simbolo !== '') {
    if (simbolo.length > 6 || simbolo !== simbolo.trim() || /[\u0000-\u001f\u007f<>]/.test(simbolo)) {
      fail("El campo 'perfil.simbolo_moneda' debe tener hasta 6 caracteres, sin espacios al inicio o al final, por ejemplo S/ o S/.");
    }
  }
  // formato_numero es opcional: separadores de miles y decimales; sin valor se usa el del idioma
  const formatoNumero = data.perfil.formato_numero;
  if (formatoNumero !== undefined && formatoNumero !== null
      && !['coma-punto', 'punto-coma', 'espacio-coma'].includes(formatoNumero)) {
    fail("El campo 'perfil.formato_numero' debe ser 'coma-punto', 'punto-coma' o 'espacio-coma'");
  }
  if (data.perfil.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.perfil.email)) {
    fail("El campo 'perfil.email' debe ser un correo válido, por ejemplo nombre@dominio.com");
  }
  // Enlace de reserva global (Calendly, Cal.com, Google Calendar…). `calendly_url` es el nombre anterior.
  for (const campo of ['reserva_url', 'calendly_url']) {
    const valor = data.perfil[campo];
    if (valor !== undefined) validateType(valor, ['string', 'null'], `perfil.${campo}`);
    validarUrl(valor, `perfil.${campo}`);
  }

  validarDireccion(data.perfil.direccion);

  // Cloudflare Web Analytics (opcional): solo el token de la propiedad
  if (data.analitica !== undefined) {
    if (!isPlainObject(data.analitica)) fail("El campo 'analitica' debe ser un objeto");
    const token = data.analitica.cf_token;
    if (token !== undefined && token !== null && token !== '' && !(typeof token === 'string' && TOKEN_ANALITICA.test(token))) {
      fail("El campo 'analitica.cf_token' debe ser el token de Cloudflare Web Analytics (letras y números, sin espacios)");
    }
  }
  validarUrl(data.perfil.logo_url, 'perfil.logo_url', { relativa: true });
  validarUrl(data.perfil.redes.instagram, 'perfil.redes.instagram');
  validarUrl(data.perfil.redes.facebook, 'perfil.redes.facebook');
  // TikTok y YouTube son opcionales: los datos guardados antes no los traen.
  for (const red of ['tiktok', 'youtube']) {
    const valor = data.perfil.redes[red];
    if (valor !== undefined) validateType(valor, ['string', 'null'], `perfil.redes.${red}`);
    validarUrl(valor, `perfil.redes.${red}`);
  }

  return data;
}

function validarCategorias(categorias) {
  if (Array.isArray(categorias)) {
    if (!categorias.every(categoria => typeof categoria === 'string' && categoria.trim())) {
      fail('Cada categoría debe ser un string no vacío');
    }
    const todas = new Set(categorias);
    return { producto: todas, servicio: todas };
  }

  if (!isPlainObject(categorias)) {
    fail("El campo 'categorias' debe ser un array o un objeto con 'producto' y 'servicio'");
  }

  const clavesInvalidas = Object.keys(categorias).filter(clave => !['producto', 'servicio'].includes(clave));
  if (clavesInvalidas.length > 0) {
    fail(`Tipos de categoría inválidos: ${clavesInvalidas.join(', ')}`);
  }

  const resultado = {};
  for (const tipo of ['producto', 'servicio']) {
    const lista = categorias[tipo];
    if (lista !== undefined && !Array.isArray(lista)) {
      fail(`El campo 'categorias.${tipo}' debe ser un array`);
    }
    const valores = lista || [];
    if (!valores.every(categoria => typeof categoria === 'string' && categoria.trim())) {
      fail(`Cada categoría de ${tipo} debe ser un string no vacío`);
    }
    resultado[tipo] = new Set(valores);
  }

  return resultado;
}

const MODALIDADES = ['online', 'presencial', 'ambas'];
const MAX_VARIANTES = 6;
const MAX_INCLUYE = 8;

// Campos opcionales que solo tienen sentido en servicios: modalidad, zona, incluye y variantes.
function validarDetalleServicio(item) {
  const campos = ['modalidad', 'zona', 'incluye', 'variantes', 'galeria'].filter(campo => item[campo] !== undefined && item[campo] !== null);
  if (campos.length === 0) return;
  if (item.tipo !== 'servicio') {
    fail(`El item '${item.id}' es un producto: solo los servicios pueden tener ${campos.join(', ')}`);
  }

  if (item.modalidad !== undefined && item.modalidad !== null && item.modalidad !== '' && !MODALIDADES.includes(item.modalidad)) {
    fail(`La modalidad del item '${item.id}' debe ser 'online', 'presencial' o 'ambas'`);
  }
  if (item.zona !== undefined && item.zona !== null && (typeof item.zona !== 'string' || item.zona.length > 80)) {
    fail(`La zona del item '${item.id}' debe ser un texto de máximo 80 caracteres`);
  }

  if (item.incluye !== undefined && item.incluye !== null) {
    if (!Array.isArray(item.incluye) || item.incluye.length > MAX_INCLUYE) {
      fail(`'incluye' del item '${item.id}' debe ser una lista de máximo ${MAX_INCLUYE} líneas`);
    }
    if (!item.incluye.every(linea => typeof linea === 'string' && linea.trim() && linea.length <= 100)) {
      fail(`Cada línea de 'incluye' del item '${item.id}' debe ser un texto no vacío de máximo 100 caracteres`);
    }
  }

  if (item.galeria !== undefined && item.galeria !== null) {
    if (!Array.isArray(item.galeria) || item.galeria.length > MAX_GALERIA) {
      fail(`'galeria' del item '${item.id}' debe ser una lista de máximo ${MAX_GALERIA} fotos`);
    }
    const usados = new Set();
    for (const foto of item.galeria) {
      if (!isPlainObject(foto) || !Number.isInteger(foto.n) || foto.n < 1 || foto.n > MAX_GALERIA) {
        fail(`Cada foto de la galería del item '${item.id}' debe tener un número 'n' entero de 1 a ${MAX_GALERIA}`);
      }
      if (usados.has(foto.n)) fail(`La galería del item '${item.id}' repite la foto ${foto.n}`);
      usados.add(foto.n);
      if (foto.alt !== undefined && foto.alt !== null && (typeof foto.alt !== 'string' || foto.alt.length > 100)) {
        fail(`El texto alternativo de la foto ${foto.n} del item '${item.id}' debe ser de máximo 100 caracteres`);
      }
    }
  }

  if (item.variantes !== undefined && item.variantes !== null) {
    if (!Array.isArray(item.variantes) || item.variantes.length > MAX_VARIANTES) {
      fail(`'variantes' del item '${item.id}' debe ser una lista de máximo ${MAX_VARIANTES} opciones`);
    }
    for (const variante of item.variantes) {
      if (!isPlainObject(variante)) fail(`Cada variante del item '${item.id}' debe ser un objeto`);
      if (typeof variante.nombre !== 'string' || !variante.nombre.trim() || variante.nombre.length > 60) {
        fail(`Cada variante del item '${item.id}' debe tener un nombre de máximo 60 caracteres`);
      }
      if (typeof variante.precio !== 'number' || !Number.isFinite(variante.precio) || variante.precio < 0) {
        fail(`El precio de la variante '${variante.nombre}' del item '${item.id}' debe ser un número mayor o igual a 0`);
      }
      const duracion = variante.duracion_minutos;
      if (duracion !== undefined && duracion !== null && (typeof duracion !== 'number' || !Number.isFinite(duracion) || duracion < 0)) {
        fail(`La duración de la variante '${variante.nombre}' del item '${item.id}' debe ser un número mayor o igual a 0 o null`);
      }
    }
  }
}

export function validateCatalogo(data) {
  if (!isPlainObject(data)) fail('El catálogo debe ser un objeto');
  if (!Array.isArray(data.items)) fail("El campo 'items' debe ser un array");
  if (data.items.length > 200) fail('El catálogo debe tener máximo 200 items');

  const categorias = validarCategorias(data.categorias);
  const ids = new Set();

  if ('categorias_agendamiento' in data) {
    if (!Array.isArray(data.categorias_agendamiento)) {
      fail("El campo 'categorias_agendamiento' debe ser un array");
    }
    for (const categoria of data.categorias_agendamiento) {
      if (typeof categoria !== 'string' || !categoria.trim()) {
        fail("Cada categoría de agendamiento debe ser un string no vacío");
      }
      if (!categorias.servicio.has(categoria)) {
        fail(`La categoría de agendamiento '${categoria}' debe existir entre las categorías de servicio`);
      }
    }
  }

  for (const item of data.items) {
    if (!isPlainObject(item)) fail('Cada item debe ser un objeto');

    if (typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id)) {
      fail(`El id del item '${item.id}' debe ser un slug en minúsculas, sin tildes ni espacios`);
    }
    if (ID_GALERIA.test(item.id) && data.items.some(otro => otro.id === item.id.replace(ID_GALERIA, '$1'))) {
      fail(`El id '${item.id}' se confunde con una foto de la galería de '${item.id.replace(ID_GALERIA, '$1')}'; cámbialo`);
    }
    if (ID_RESERVADOS.includes(item.id)) {
      fail(`El id '${item.id}' está reservado para la landing; elige otro`);
    }
    if (ids.has(item.id)) {
      fail(`El id del item '${item.id}' está duplicado`);
    }
    ids.add(item.id);

    if (!['producto', 'servicio'].includes(item.tipo)) {
      fail(`El tipo del item '${item.id}' debe ser 'producto' o 'servicio'`);
    }
    if (typeof item.nombre !== 'string' || !item.nombre.trim()) {
      fail(`El item '${item.id}' debe tener un nombre`);
    }
    if (typeof item.descripcion !== 'string' || item.descripcion.length > 200) {
      fail(`La descripción del item '${item.id}' debe ser un string de máximo 200 caracteres`);
    }
    if (typeof item.precio !== 'number' || !Number.isFinite(item.precio) || item.precio < 0) {
      fail(`El precio del item '${item.id}' debe ser un número mayor o igual a 0`);
    }
    if (typeof item.categoria !== 'string') {
      fail(`La categoría del item '${item.id}' debe ser un string`);
    }
    if (item.categoria) {
      const categoriasTipo = item.tipo === 'producto' ? categorias.producto : categorias.servicio;
      if (!categoriasTipo.has(item.categoria)) {
        fail(`La categoría del item '${item.id}' debe existir entre las categorías de ${item.tipo}`);
      }
    }
    if (typeof item.disponible !== 'boolean') {
      fail(`El campo 'disponible' del item '${item.id}' debe ser booleano`);
    }
    if (typeof item.destacado !== 'boolean') {
      fail(`El campo 'destacado' del item '${item.id}' debe ser booleano`);
    }

    if (item.tipo === 'servicio') {
      if (typeof item.duracion_minutos !== 'number' || !Number.isFinite(item.duracion_minutos) || item.duracion_minutos < 0) {
        fail(`La duración del item '${item.id}' debe ser un número mayor o igual a 0`);
      }
    } else if (item.duracion_minutos !== null) {
      fail(`El item '${item.id}' es un producto, duracion_minutos debe ser null`);
    }

    // Enlace de reserva propio del servicio (opcional); `calendly_url` es el nombre anterior
    for (const campo of ['reserva_url', 'calendly_url']) {
      const valor = item[campo];
      if (valor !== undefined && valor !== null && typeof valor !== 'string') {
        fail(`El campo '${campo}' del item '${item.id}' debe ser una cadena o null`);
      }
      validarUrl(valor, `${campo} (item ${item.id})`);
    }

    validarDetalleServicio(item);

    // Opcional. Con true, el precio es orientativo ("Desde X"; con 0, "Precio a consultar")
    if ('precio_a_consultar' in item) {
      if (typeof item.precio_a_consultar !== 'boolean') {
        fail(`El campo 'precio_a_consultar' del item '${item.id}' debe ser booleano`);
      }
      if (item.precio_a_consultar && item.tipo !== 'servicio') {
        fail(`El item '${item.id}' es un producto: solo los servicios pueden tener precio a consultar`);
      }
    }
  }

  return data;
}

const TIPOS_SECCION = ['texto', 'destacados', 'galeria', 'contacto', 'sobre-mi', 'testimonios'];
const POSICIONES_SECCION = ['antes', 'despues']; // respecto al catálogo; por defecto 'despues'
// Secciones que solo pueden aparecer una vez: repetirlas no tiene sentido (misma foto, mismos botones…)
export const SECCIONES_UNICAS = { 'sobre-mi': 'Sobre mí', contacto: 'Contacto', testimonios: 'Testimonios' };
const MAX_TESTIMONIOS = 8;

function validarTestimonios(seccion) {
  if (seccion.testimonios === undefined) return;
  if (seccion.tipo !== 'testimonios') {
    fail(`La sección '${seccion.titulo}' no es de testimonios: no puede tener 'testimonios'`);
  }
  if (!Array.isArray(seccion.testimonios) || seccion.testimonios.length > MAX_TESTIMONIOS) {
    fail(`'testimonios' debe ser una lista de máximo ${MAX_TESTIMONIOS} opiniones`);
  }
  for (const [index, t] of seccion.testimonios.entries()) {
    if (!isPlainObject(t)) fail(`El testimonio ${index + 1} debe ser un objeto`);
    if (typeof t.texto !== 'string' || !t.texto.trim() || t.texto.length > 300) {
      fail(`El testimonio ${index + 1} debe tener un texto de máximo 300 caracteres`);
    }
    if (typeof t.autor !== 'string' || !t.autor.trim() || t.autor.length > 60) {
      fail(`El testimonio ${index + 1} debe tener un autor de máximo 60 caracteres`);
    }
    if (t.detalle !== undefined && t.detalle !== null && (typeof t.detalle !== 'string' || t.detalle.length > 80)) {
      fail(`El detalle del testimonio ${index + 1} debe ser un texto de máximo 80 caracteres`);
    }
  }
}

// `idsCatalogo` (opcional): ids existentes del catálogo guardado; si se pasa, items_ids debe usar solo esos.
export function validateLanding(data, idsCatalogo) {
  validateObject(data, {
    hero: {
      titulo: 'string',
      subtitulo: 'string',
      cta_texto: 'string',
      cta_enlace: 'string',
      imagen_fondo_url: ['string', 'null'],
    },
    secciones: 'array',
    tema: {
      fuente: 'string',
      estilo: 'string',
    },
    seo: {
      titulo: 'string',
      descripcion: 'string',
    },
  });

  // color_acento es opcional. color_primario/secundario antiguos se aceptan pero se ignoran.
  const acento = data.tema.color_acento;
  if (acento !== undefined && acento !== null) {
    if (typeof acento !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(acento)) {
      fail("El campo 'tema.color_acento' debe ser un color hexadecimal como #B6F23C");
    }
    const ratio = contraste(acento, COLOR_TINTA);
    if (ratio < CONTRASTE_MINIMO) {
      fail(`El color de acento ${acento} es demasiado oscuro: el texto sobre los botones no se leería bien (contraste ${ratio.toFixed(1)}:1, mínimo ${CONTRASTE_MINIMO}:1). Elige un tono más claro.`);
    }
  }
  if (!['serif', 'sans', 'mono'].includes(data.tema.fuente)) {
    fail("El campo 'tema.fuente' debe ser 'serif', 'sans' o 'mono'");
  }
  if (!['rustico', 'moderno', 'minimalista', 'elegante'].includes(data.tema.estilo)) {
    fail("El campo 'tema.estilo' debe ser 'rustico', 'moderno', 'minimalista' o 'elegante'");
  }
  // vista_listas es opcional: rejilla o carrusel infinito para servicios, productos, destacados y galerías
  const vista = data.tema.vista_listas;
  if (vista !== undefined && vista !== null && !['rejilla', 'deslizable'].includes(vista)) {
    fail("El campo 'tema.vista_listas' debe ser 'rejilla' o 'deslizable'");
  }

  const vistas = new Set();
  for (const seccion of data.secciones) {
    if (!isPlainObject(seccion)) fail('Cada sección debe ser un objeto');
    if (!TIPOS_SECCION.includes(seccion.tipo)) {
      fail(`El tipo de sección '${seccion.tipo}' no es válido`);
    }
    if (seccion.tipo in SECCIONES_UNICAS) {
      if (vistas.has(seccion.tipo)) {
        fail(`Solo puede haber una sección «${SECCIONES_UNICAS[seccion.tipo]}». Elimina la repetida.`);
      }
      vistas.add(seccion.tipo);
    }
    if (typeof seccion.titulo !== 'string') fail("Cada sección debe tener 'titulo' string");
    if (typeof seccion.contenido !== 'string') fail("Cada sección debe tener 'contenido' string");
    if (seccion.contenido.length > 2000) fail(`El contenido de la sección '${seccion.titulo}' debe tener máximo 2000 caracteres`);
    if (seccion.posicion !== undefined && !POSICIONES_SECCION.includes(seccion.posicion)) {
      fail(`La posición de la sección '${seccion.titulo}' debe ser 'antes' o 'despues' del catálogo`);
    }
    validarTestimonios(seccion);
    if (seccion.nombre !== undefined) {
      if (seccion.tipo !== 'sobre-mi') {
        fail(`La sección '${seccion.titulo}' no es de tipo «Sobre mí»: no puede tener 'nombre'`);
      }
      if (typeof seccion.nombre !== 'string' || seccion.nombre.length > 60) {
        fail(`El nombre de la sección '${seccion.titulo}' debe ser texto de máximo 60 caracteres`);
      }
    }
    if (!Array.isArray(seccion.items_ids) || !seccion.items_ids.every(id => typeof id === 'string')) {
      fail("Cada sección debe tener 'items_ids' como array de strings");
    }
    if (idsCatalogo) {
      const inexistentes = seccion.items_ids.filter(id => !idsCatalogo.has(id));
      if (inexistentes.length > 0) {
        fail(`La sección '${seccion.titulo}' usa items que no existen en el catálogo: ${inexistentes.join(', ')}`);
      }
    }
  }

  return data;
}

export function validateFAQ(data) {
  if (!isPlainObject(data)) fail('El FAQ debe ser un objeto');
  if (!Array.isArray(data.preguntas)) fail("El campo 'preguntas' debe ser un array");
  if (data.preguntas.length > 15) fail('El FAQ debe tener máximo 15 preguntas');

  for (const [index, pregunta] of data.preguntas.entries()) {
    if (!isPlainObject(pregunta)) fail(`La pregunta ${index + 1} debe ser un objeto`);
    if (typeof pregunta.p !== 'string' || !pregunta.p.trim()) {
      fail(`La pregunta ${index + 1} debe tener 'p' no vacío`);
    }
    if (typeof pregunta.r !== 'string' || !pregunta.r.trim()) {
      fail(`La pregunta ${index + 1} debe tener 'r' no vacío`);
    }
  }

  return data;
}
