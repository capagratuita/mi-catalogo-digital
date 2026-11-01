import { paginaPublica, existeFoto, urlImagenValida } from './paginas.js';
import { rutaItem, tituloPagina } from './seo.js';

// Ficha de un item. Los servicios viven en /servicio/{id} y los productos en /producto/{id} (el HTML es
// producto.html en ambos); cada URL redirige a la que le corresponde al item. `tipo` es el del item que
// atiende la ruta; sin él es la URL antigua /producto?id=, que siempre redirige.
export const fichaPublica = ({ tipo } = {}) => paginaPublica({
  claves: ['config', 'catalogo', 'landing'],
  fuente: tipo ? ({ env, request }) => env.ASSETS.fetch(new URL('/producto', request.url)) : undefined,
  meta: async ({ config, catalogo }, { request, env, origen, params }) => {
    const perfil = config.perfil;
    const id = tipo ? params.id : new URL(request.url).searchParams.get('id');
    const item = catalogo.items.find(i => i.id === id);

    if (!item) {
      return { titulo: `Producto no encontrado - ${perfil.nombre}`, noindex: true, status: 404 };
    }

    const ruta = rutaItem(item);
    if (item.tipo !== tipo) return { titulo: item.nombre, redirigir: ruta };
    const tieneFoto = await existeFoto(env, item.id);
    const imagen = tieneFoto
      ? `${origen}/api/image?id=${encodeURIComponent(item.id)}`
      : urlImagenValida(perfil.logo_url, origen);
    const esServicio = item.tipo === 'servicio';
    const aConsultar = esServicio && item.precio_a_consultar === true;

    const variantes = esServicio && Array.isArray(item.variantes) ? item.variantes : [];
    const precios = variantes.map(v => v.precio);

    let oferta;
    if (variantes.length > 0 && !(aConsultar && Math.min(...precios) === 0)) {
      // Varias opciones de precio (sesión suelta, pack…): rango y una oferta por opción
      oferta = {
        '@type': 'AggregateOffer',
        priceCurrency: perfil.moneda,
        lowPrice: Math.min(...precios),
        highPrice: Math.max(...precios),
        offerCount: variantes.length,
        offers: variantes.map(v => ({ '@type': 'Offer', name: v.nombre, priceCurrency: perfil.moneda, price: v.precio })),
      };
    } else if (aConsultar) {
      // «Desde X»: precio base orientativo; con 0 no hay precio que publicar
      if (item.precio > 0) oferta = { '@type': 'AggregateOffer', priceCurrency: perfil.moneda, lowPrice: item.precio };
    } else {
      oferta = {
        '@type': 'Offer',
        priceCurrency: perfil.moneda,
        price: item.precio,
        availability: item.disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: origen + ruta,
      };
    }

    return {
      reescribir: rw => rw
        .on('#producto-nombre', { element(el) { el.setInnerContent(item.nombre); } })
        .on('#producto-descripcion', { element(el) { el.setInnerContent(item.descripcion); } })
        .on('#producto-imagen', { element(el) { el.setAttribute('alt', item.nombre); } }),
      titulo: tituloPagina(item.nombre, perfil.nombre),
      descripcion: item.descripcion,
      ruta,
      imagen,
      imagenAlt: tieneFoto ? item.nombre : `Logo de ${perfil.nombre}`,
      tipo: esServicio ? 'website' : 'product',
      extra: !esServicio ? [['product:price:amount', String(item.precio)], ['product:price:currency', perfil.moneda]] : [],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': esServicio ? 'Service' : 'Product',
        name: item.nombre,
        description: item.descripcion,
        ...(imagen && { image: imagen }),
        ...(esServicio
          ? {
            provider: { '@type': 'Organization', name: perfil.nombre, url: origen + '/' },
            ...(item.modalidad !== 'online' && item.zona && { areaServed: item.zona }),
          }
          : { sku: item.id }),
        ...(oferta && { offers: oferta }),
      },
    };
  },
});
