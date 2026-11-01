# Checklist de pruebas de extremo a extremo

Marca cada punto a mano en un sitio recién desplegado (o en `npm run dev`). Pruébalo a **375 px** (celular) y en escritorio. Anota lo que te cueste en [friction-log.md](friction-log.md).

## Acceso
- [ ] `/admin` pide contraseña; una incorrecta muestra un error claro.
- [ ] Tras 5 contraseñas incorrectas seguidas aparece «Demasiados intentos…».
- [ ] El menú del panel sigue el orden General · Mi página · Mi catálogo · FAQ · Respaldo.
- [ ] Con la correcta se entra; cerrar sesión devuelve al login; `/admin/identidad` sin sesión redirige al login.

## Primer arranque
- [ ] Sin guardar nada, la portada muestra datos de ejemplo y el panel avisa de que son de ejemplo.
- [ ] Al pulsar Guardar en una sección, el sitio pasa a usar tus datos.

## Contenido
- [ ] General: guardar con un WhatsApp, una moneda y un correo; un enlace sin `https://` se rechaza con un mensaje claro.
- [ ] Catálogo: crear una categoría de servicio, un servicio con precio fijo, otro «Precio a consultar», otro con opciones de precio y detalles (modalidad, zona, qué incluye).
- [ ] Catálogo: marcar una categoría como *con reserva* y poner un enlace de reserva.
- [ ] Catálogo → foto: en un item guardado, «Subir foto» con una imagen de más de 1 MB; se reduce, se ve la miniatura y aparece en la tarjeta y en la ficha. En un item nuevo sin guardar el botón está desactivado con el aviso «Guarda el catálogo…»; tras guardar se activa. `/admin/fotos` redirige a Catálogo.
- [ ] Mi página: añadir *Sobre mí* (con foto subida desde el editor de la sección), *Testimonios* y *Contacto* desde **+ Añadir sección**; marcar items en *Destacados*; subir/bajar y eliminar una sección; poner una sección «Antes del catálogo» y comprobar que aparece justo bajo la portada; cambiar el color de acento (uno muy oscuro se rechaza con un mensaje claro).
- [ ] Apariencia: cambiar **Estilo** (Moderno, Minimalista, Rústico, Elegante) y recargar el sitio: cambian bordes, sombras y títulos en portada, ficha, carrito y FAQ, sin cambiar los colores.
- [ ] Mi página: las pestañas se pueden recorrer con las flechas del teclado, y al salir con cambios sin guardar el navegador avisa.
- [ ] FAQ: añadir una pregunta y verla en `/faq`.
- [ ] Respaldo: exportar, borrar una pregunta, importar el respaldo y comprobar que vuelve.
- [ ] Respaldo → fotos: «Descargar fotos (.zip)» baja un zip con `fotos/{id}.jpg`; borrar una foto de un item, importar el zip (tras el .json) y comprobar que vuelve.
- [ ] General: subir un logo (PNG con transparencia) y ver que sale junto al nombre en la cabecera de las 4 páginas; «Quitar» y Guardar lo retira. Un logo menor de 200 × 200 avisa.
- [ ] Mi página → Portada: subir una imagen de fondo (1920 × 1080) y comprobar el texto blanco sobre ella; «Quitar» la retira.
- [ ] General: «Símbolo en los precios» (`S/.`) y «Formato de los precios» (`1,234.50`) se reflejan en tarjetas, ficha, carrito y mensajes de WhatsApp, con la moneda siempre delante.
- [ ] Catálogo → servicio: «Qué incluye» se añade con Enter o «+ Añadir» como cápsulas (máx. 8); con 4 opciones de precio cada una es una tarjeta numerada y la moneda va delante del valor.
- [ ] Mi página → Apariencia y SEO → «Presentación de listados» = Carrusel: servicios, productos, destacados y galería se deslizan con el dedo y con las flechas, quedan alineados a una tarjeta, las flechas se desactivan en los extremos y no hay saltos al cambiar de filtro (probar en iOS).

## Sitio público
- [ ] Servicio con precio fijo sin reserva → botón «Consultar por WhatsApp» con mensaje que incluye nombre, precio y duración.
- [ ] Servicio «Precio a consultar» → «Consultar por WhatsApp» (cotización).
- [ ] Servicio de categoría con reserva → «Reservar Cita» abre tu agenda.
- [ ] Servicio con opciones → «Desde X» en la tarjeta; la ficha lista las opciones (nombre con la duración debajo, precio a la derecha) y las duraciones se leen «1 h 30 min».
- [ ] Ninguna tarjeta de servicio tiene «Añadir al Carrito».
- [ ] Tipo *mixto* (cámbialo en General; el ejemplo viene en *solo servicios*): producto → carrito → «Finalizar Pedido» abre WhatsApp con el resumen.
- [ ] Modo *solo servicios*: no se ve el icono ni el enlace del carrito; `/carrito` muestra un aviso.
- [ ] La ficha tiene «Compartir: WhatsApp · Copiar enlace»; la vista previa en WhatsApp muestra la foto.
- [ ] Teclado: se puede recorrer el menú, las tarjetas y el panel con Tab, con el foco visible.

## Datos e indexación
- [ ] `/sitemap.xml` lista la portada, el FAQ y cada item; `/robots.txt` responde.
- [ ] `/carrito` y un id inexistente llevan `noindex`.
- [ ] Con token de analítica, el script aparece en la portada y no en `/carrito`.

## Límites
- [ ] Un cambio guardado se ve en el sitio en menos de ~1 minuto.
