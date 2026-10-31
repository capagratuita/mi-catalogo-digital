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

## Sitio público
- [ ] Servicio con precio fijo sin reserva → botón «Consultar por WhatsApp» con mensaje que incluye nombre, precio y duración.
- [ ] Servicio «Precio a consultar» → «Consultar por WhatsApp» (cotización).
- [ ] Servicio de categoría con reserva → «Reservar Cita» abre tu agenda.
- [ ] Servicio con opciones → «Desde X» en la tarjeta; la ficha lista las opciones.
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
