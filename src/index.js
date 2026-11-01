import { paginaPublica, urlImagenValida } from './_lib/paginas.js';
import { direccionPostal, htmlCatalogoEstatico, zonasAtendidas } from './_lib/seo.js';

export const onRequestGet = paginaPublica({
  claves: ['config', 'catalogo', 'landing'],
  meta: ({ config, catalogo, landing }, { origen }) => {
    const perfil = config.perfil;
    const logo = urlImagenValida(perfil.logo_url, origen);
    const redes = [perfil.redes?.instagram, perfil.redes?.facebook, perfil.redes?.tiktok, perfil.redes?.youtube].filter(Boolean);

    const hero = landing.hero || {};
    const zonas = zonasAtendidas(catalogo, config);
    const direccion = direccionPostal(perfil.direccion);

    return {
      reescribir: rw => rw
        .on('.hero h1', { element(el) { el.setInnerContent(hero.titulo || perfil.nombre); } })
        .on('.hero p', { element(el) { if (hero.subtitulo) el.setInnerContent(hero.subtitulo); } })
        .on('#catalogo', { element(el) { el.append(htmlCatalogoEstatico(catalogo, config), { html: true }); } }),
      titulo: landing.seo?.titulo || perfil.nombre,
      descripcion: landing.seo?.descripcion || perfil.descripcion_corta,
      ruta: '/',
      imagen: logo || urlImagenValida(landing.hero?.imagen_fondo_url, origen),
      imagenAlt: logo ? `Logo de ${perfil.nombre}` : perfil.nombre,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', name: perfil.nombre, url: origen + '/' },
          {
            // LocalBusiness exige dirección para Google; sin ella, Organization (que también admite areaServed)
            '@type': direccion ? 'LocalBusiness' : 'Organization',
            name: perfil.nombre,
            url: origen + '/',
            description: perfil.descripcion_corta,
            ...(logo && { logo }),
            ...(redes.length && { sameAs: redes }),
            ...(direccion && { address: direccion }),
            ...(zonas.length && { areaServed: zonas.length === 1 ? zonas[0] : zonas }),
          },
        ],
      },
    };
  },
});
