import { paginaPublica, urlImagenValida } from './_lib/paginas.js';
import { tituloPagina } from './_lib/seo.js';

export const onRequestGet = paginaPublica({
  claves: ['config', 'faq', 'landing'],
  meta: ({ config, faq }, { origen }) => {
    const perfil = config.perfil;
    const preguntas = faq.preguntas || [];

    return {
      titulo: tituloPagina('Preguntas frecuentes', perfil.nombre),
      descripcion: `Respuestas a las preguntas más comunes sobre ${perfil.nombre}.`,
      ruta: '/faq',
      imagen: urlImagenValida(perfil.logo_url, origen),
      imagenAlt: `Logo de ${perfil.nombre}`,
      jsonLd: preguntas.length && {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: preguntas.map(({ p, r }) => ({
          '@type': 'Question',
          name: p,
          acceptedAnswer: { '@type': 'Answer', text: r },
        })),
      },
    };
  },
});
