// assets/app.js
// Utilidades públicas para el frontend

async function fetchJSON(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

const contenido = {};

// Las páginas públicas llegan con los datos del sitio dentro del HTML (<script id="sitio-datos">),
// inyectados por functions/_lib/paginas.js: así no hace falta pedirlos a /api/content.
function datosEmbebidos() {
  try {
    const el = document.getElementById('sitio-datos');
    return el ? JSON.parse(el.textContent) : {};
  } catch {
    return {};
  }
}

// Cada key se pide una sola vez por página. Si aún no existe en KV (sitio recién
// desplegado), se usan los datos de ejemplo de /api/defaults. Si falla, se reintenta.
function loadContent(key) {
  if (!contenido[key]) {
    const embebido = datosEmbebidos()[key];
    contenido[key] = (embebido !== undefined ? Promise.resolve(embebido) : fetchContent(key)).catch(error => {
      delete contenido[key];
      throw error;
    });
  }
  return contenido[key];
}

async function fetchContent(key) {
  const response = await fetch(`/api/content?key=${key}`);
  if (response.status === 404) return await fetchJSON(`/api/defaults?key=${key}`);
  if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
  return await response.json();
}

const loadCatalogo = () => loadContent('catalogo');
const loadConfig = () => loadContent('config');
const loadLanding = () => loadContent('landing');
const loadFAQ = () => loadContent('faq');

const FUENTES = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

// Aplica landing.tema.fuente, estilo y color_acento. El resto de la paleta es fija (styles.css).
// El servidor ya inyecta el acento en <head>; aquí se repite por si la página no pasó por paginaPublica.
function aplicarTema(tema) {
  if (!tema) return;
  if (FUENTES[tema.fuente]) {
    document.documentElement.style.setProperty('--font-body', FUENTES[tema.fuente]);
  }
  // Estilo visual (ver styles.css); «moderno» es la base y se queda sin atributo
  if (['rustico', 'minimalista', 'elegante'].includes(tema.estilo)) {
    document.documentElement.dataset.estilo = tema.estilo;
  } else {
    delete document.documentElement.dataset.estilo;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(tema.color_acento || '')) {
    document.documentElement.style.setProperty('--accent', tema.color_acento);
  }
}

// Rellena nombre, pie de página, redes y título con los datos de config.perfil.
// Dirección en una línea para el pie: «calle, ciudad, región, código postal» (sin el código de país)
function textoDireccion(direccion) {
  if (!direccion || !String(direccion.ciudad || '').trim()) return '';
  return ['calle', 'ciudad', 'region', 'codigo_postal']
    .map(campo => String(direccion[campo] || '').trim())
    .filter(Boolean)
    .join(', ');
}

function aplicarMarca(config) {
  const perfil = config && config.perfil;
  if (!perfil) return;

  aplicarCarrito(config);
  document.querySelectorAll('nav .logo').forEach(el => { el.textContent = perfil.nombre; });

  const footerNombre = document.querySelector('footer h3');
  if (footerNombre) footerNombre.textContent = perfil.nombre;
  const footerDescripcion = document.querySelector('footer .container > div > p');
  if (footerDescripcion) footerDescripcion.textContent = perfil.descripcion_corta;

  // Dirección postal (la misma que va en los datos estructurados de la portada)
  const direccion = textoDireccion(perfil.direccion);
  let footerDireccion = document.querySelector('footer address');
  if (direccion && footerDescripcion && !footerDireccion) {
    footerDireccion = document.createElement('address');
    footerDireccion.className = 'footer-direccion';
    footerDescripcion.insertAdjacentElement('afterend', footerDireccion);
  }
  if (footerDireccion) {
    footerDireccion.textContent = direccion;
    footerDireccion.hidden = !direccion;
  }

  const enlaces = {
    instagram: perfil.redes && perfil.redes.instagram,
    facebook: perfil.redes && perfil.redes.facebook,
    tiktok: perfil.redes && perfil.redes.tiktok,
    youtube: perfil.redes && perfil.redes.youtube,
    whatsapp: tieneWhatsApp(config) ? buildWhatsAppLink(config, '') : null,
  };
  document.querySelectorAll('[data-red]').forEach(el => {
    const url = enlaces[el.dataset.red];
    el.hidden = !url;
    if (url) el.setAttribute('href', url);
  });

  if (!document.documentElement.dataset.marca) {
    document.documentElement.dataset.marca = '1';
    if (!document.getElementById('sitio-datos') && !document.title.includes(perfil.nombre)) {
      document.title = document.title ? `${document.title} - ${perfil.nombre}` : perfil.nombre;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadConfig().then(aplicarMarca).catch(() => {});
  loadLanding().then(landing => aplicarTema(landing.tema)).catch(() => {});
});

// URL limpia de la ficha: /servicio/{id} para servicios y /producto/{id} para productos
function urlFicha(item) {
  const id = encodeURIComponent(item.id);
  return `/${item.tipo === 'servicio' ? 'servicio' : 'producto'}/${id}`;
}

function renderItem(item, config, catalogo) {
  const accion = accionItem(item, config, catalogo);
  const esServicio = item.tipo === 'servicio';
  const precioHtml = `<span class="precio">${textoPrecio(item, config.perfil.moneda)}</span>`;
  const duracionHtml = esServicio
    ? `<div class="servicio-info">Duración: ${item.duracion_minutos} minutos</div>`
    : '';
  const accionHtml = accion ? htmlAccion(accion, item.id) : '';

  return `
    <div class="item-card" data-id="${item.id}" data-tipo="${item.tipo}">
      <h3>${item.nombre}</h3>
      <p class="descripcion">${item.descripcion}</p>
      ${precioHtml}
      ${duracionHtml}
      <div class="item-actions">
        <a href="${urlFicha(item)}" class="btn-ver">Ver Detalles</a>
        ${accionHtml}
      </div>
    </div>
  `;
}

// Nombre de usuario de WhatsApp sin «@» ni espacios; '' si no hay.
function usuarioWhatsApp(config) {
  return String(config.perfil.whatsapp_usuario || '').trim().replace(/^@/, '');
}

function tieneWhatsApp(config) {
  return Boolean(usuarioWhatsApp(config) || String(config.perfil.whatsapp || '').replace(/\D/g, ''));
}

// Con nombre de usuario se usa api.whatsapp.com (wa.me solo admite números); si no, el número.
function buildWhatsAppLink(config, mensaje) {
  const encodedMensaje = encodeURIComponent(mensaje || '');
  const usuario = usuarioWhatsApp(config);
  if (usuario) {
    return `https://api.whatsapp.com/send/?text=${encodedMensaje}&username=${encodeURIComponent(usuario)}&type=username&app_absent=0`;
  }
  const numero = String(config.perfil.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodedMensaje}`;
}

// Enlace de reserva (Calendly, Cal.com…). `calendly_url` es el nombre anterior y se sigue leyendo.
function urlReserva(objeto) {
  return (objeto && (objeto.reserva_url || objeto.calendly_url)) || null;
}

function requiereAgendamiento(item, catalogo) {
  if (!item || item.tipo !== 'servicio') return false;
  const categorias = Array.isArray(catalogo?.categorias_agendamiento)
    ? catalogo.categorias_agendamiento
    : [];
  return categorias.includes(item.categoria);
}

// Servicios cuyo precio se confirma antes de contratar: no van al carrito, se consultan por WhatsApp.
function requiereCotizacion(item) {
  return Boolean(item) && item.tipo === 'servicio' && item.precio_a_consultar === true;
}

// Opciones de precio de un servicio (sesión suelta, pack…), o [] si no tiene.
function variantesDe(item) {
  return item && item.tipo === 'servicio' && Array.isArray(item.variantes) ? item.variantes : [];
}

// "Desde X" si hay precio orientativo o varias opciones de precio, "Precio a consultar" si es 0;
// precio normal en el resto.
function textoPrecio(item, moneda) {
  const variantes = variantesDe(item);
  if (variantes.length > 0) {
    const precios = variantes.map(v => v.precio);
    const minimo = Math.min(...precios);
    if (minimo === 0 && requiereCotizacion(item)) return 'Precio a consultar';
    return precios.every(p => p === minimo) ? formatPrecio(minimo, moneda) : `Desde ${formatPrecio(minimo, moneda)}`;
  }
  if (!requiereCotizacion(item)) return formatPrecio(item.precio, moneda);
  return item.precio > 0 ? `Desde ${formatPrecio(item.precio, moneda)}` : 'Precio a consultar';
}

function buildCotizacionLink(config, item) {
  let mensaje = `Hola, quisiera cotizar el servicio "${item.nombre}"`;
  if (item.duracion_minutos > 0) mensaje += ` (duración estimada: ${item.duracion_minutos} min)`;
  mensaje += '. ¿Me confirmas el precio y la disponibilidad?';
  return buildWhatsAppLink(config, mensaje);
}

// Consulta general de un servicio con precio fijo y sin agenda: pregunta por disponibilidad.
function buildConsultaLink(config, item) {
  if (requiereCotizacion(item)) return buildCotizacionLink(config, item);
  let mensaje = `Hola, me interesa el servicio "${item.nombre}"`;
  if (item.precio > 0) mensaje += ` (${formatPrecio(item.precio, config.perfil.moneda)}`;
  if (item.duracion_minutos > 0) mensaje += `${item.precio > 0 ? ', ' : ' ('}${item.duracion_minutos} min`;
  if (item.precio > 0 || item.duracion_minutos > 0) mensaje += ')';
  mensaje += '. ¿Me confirmas la disponibilidad?';
  return buildWhatsAppLink(config, mensaje);
}

// El carrito solo existe para productos: un catálogo solo de servicios no lo muestra.
function usaCarrito(config) {
  return config?.perfil?.tipo_catalogo !== 'solo-servicios';
}

// Única acción de una oferta. Los servicios nunca van al carrito:
//  - precio a consultar -> cotizar por WhatsApp
//  - categoría con agenda y enlace de reserva -> reservar
//  - resto -> consultar disponibilidad por WhatsApp
// Los productos van al carrito (o ninguna acción si el catálogo es solo-servicios).
function accionItem(item, config, catalogo) {
  if (item.tipo !== 'servicio') return usaCarrito(config) ? { tipo: 'carrito' } : null;
  if (requiereCotizacion(item)) return { tipo: 'cotizar', url: buildCotizacionLink(config, item) };
  if (requiereAgendamiento(item, catalogo)) {
    const url = urlReserva(item) || urlReserva(config.perfil);
    if (url) return { tipo: 'reservar', url };
  }
  return { tipo: 'consultar', url: buildConsultaLink(config, item) };
}

const ETIQUETAS_ACCION = {
  carrito: 'Añadir al Carrito',
  cotizar: 'Consultar por WhatsApp',
  reservar: 'Reservar Cita',
  consultar: 'Consultar por WhatsApp',
};

function escaparAtributo(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// HTML del botón de una acción en las tarjetas; el carrito se enlaza luego por clase.
function htmlAccion(accion, id) {
  if (accion.tipo === 'carrito') {
    return `<button type="button" class="btn-add-to-cart" data-id="${escaparAtributo(id)}">${ETIQUETAS_ACCION.carrito}</button>`;
  }
  return `<a href="${escaparAtributo(accion.url)}" class="btn-calendly" target="_blank" rel="noopener">${ETIQUETAS_ACCION[accion.tipo]}</a>`;
}

// Oculta el carrito (icono y enlaces) cuando el catálogo no tiene productos.
function aplicarCarrito(config) {
  const mostrar = usaCarrito(config);
  document.querySelectorAll('.carrito-icon, a[href="/carrito"]').forEach(el => {
    const contenedor = el.matches('a') ? (el.closest('li') || el) : el;
    contenedor.hidden = !mostrar;
  });
}

function formatPrecio(precio, moneda) {
  const formato = new Intl.NumberFormat('es', {
    style: 'currency',
    currency: moneda || 'PEN',
  });
  return formato.format(precio);
}

function getCarrito() {
  const carrito = localStorage.getItem('carrito');
  return carrito ? JSON.parse(carrito) : [];
}

function saveCarrito(carrito) {
  localStorage.setItem('carrito', JSON.stringify(carrito));
}

function addToCarrito(id, nombre, precio, moneda) {
  const carrito = getCarrito();
  const itemExistente = carrito.find(item => item.id === id);
  
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({
      id: id,
      nombre: nombre,
      precio: precio,
      moneda: moneda,
      cantidad: 1
    });
  }
  
  saveCarrito(carrito);
  return carrito;
}

function getCarritoTotal(carrito, config) {
  return carrito.reduce((total, item) => {
    return total + (item.precio * item.cantidad);
  }, 0);
}

function getCarritoItemsCount(carrito) {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}

window.app = {
  fetchJSON,
  loadCatalogo,
  loadConfig,
  aplicarMarca,
  textoDireccion,
  urlFicha,
  aplicarTema,
  loadLanding,
  loadFAQ,
  renderItem,
  buildWhatsAppLink,
  tieneWhatsApp,
  requiereAgendamiento,
  requiereCotizacion,
  textoPrecio,
  variantesDe,
  buildCotizacionLink,
  buildConsultaLink,
  usaCarrito,
  accionItem,
  urlReserva,
  htmlAccion,
  formatPrecio,
  getCarrito,
  saveCarrito,
  addToCarrito,
  getCarritoTotal,
  getCarritoItemsCount
};
