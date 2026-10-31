# Registro de fricciones

Aquí se anota todo lo que le cuesta a una persona real al desplegar y usar el template. **Todavía no se ha hecho una prueba con una persona ajena ni un despliegue real en Cloudflare con esta guía**: las filas de abajo son riesgos detectados al revisar el diseño, no observaciones.

## Cómo usarlo

Pide a alguien que **no conozca el proyecto** que despliegue siguiendo solo [la guía de capagratuita.com](https://capagratuita.com), sin ayuda. Anota el minuto en que se atasca, qué dijo y qué cambió la guía o el panel para evitarlo.

## Riesgos conocidos (por verificar)

| # | Dónde | Riesgo | Cómo comprobarlo | Estado |
|---|---|---|---|---|
| 1 | Paso 1 | Los dos campos de KV del formulario traen el mismo nombre por defecto (el del Worker) y el despliegue falla («title already exists»). Con `wrangler.toml` los KV del formulario no se enlazaban; con `wrangler.jsonc` sí (2026-10-30). | Cambiar los dos nombres a valores distintos (`catalogo-datos`, `catalogo-fotos`); si falla, borrar los KV sobrantes antes de repetir. | Verificado con `wrangler.jsonc` (bindings ya enlazados, sin «Provisioning») |
| 2 | Paso 1 | Si el formulario no pide la contraseña, queda sin secreto hasta añadirla a mano y volver a desplegar. | Igual que el anterior. | Sin verificar |
| 2b | Actualizar | El repo creado por el botón no incluye `.github/`: el workflow de sincronización hay que copiarlo a mano (visto el 2026-10-30). | Copiar el archivo desde la web de GitHub y ejecutarlo. | Verificado en un repo de prueba (copia, ejecución, PR y merge) |
| 3 | Paso 1 | El nombre exacto de los menús y formularios de Cloudflare puede diferir de la guía. | Seguir la guía con una cuenta nueva. | Sin verificar |
| 4 | Actualizar | El repo del botón no es un fork (historial distinto): «Sync fork» no existe; se usa el workflow. | Ejecutar el workflow y fusionar el PR. | Verificado (2026-10-30) |
| 5 | Actualizar | El workflow no puede crear el PR si el repo no tiene activado *Allow GitHub Actions to create and approve pull requests* (visto: `not permitted to create or approve pull requests`). | Ejecutar el workflow con el ajuste desactivado: deja la rama y un enlace en el resumen (verificado). | Fallback verificado; creación automática con el ajuste activado verificada el 2026-10-31 |
| 5b | Despliegue | Un build creado por el botón no se puede reintentar («seed_repo override»); un primer despliegue fallido deja KV sobrantes en la cuenta. | Borrar los KV sobrantes y repetir el botón desde cero, o hacer un commit en el repo creado. | Visto el 2026-10-30; documentado en la guía |
| 5c | Antes de empezar | El subdominio `workers.dev` de una cuenta nueva es aleatorio (p. ej. `mute-haze-3d90`). Cambiarlo después del despliegue funciona, pero la nueva URL tarda un par de minutos en tener certificado y la vieja deja de servir (probado el 2026-10-30). | Cambiarlo antes de pulsar el botón. | Documentado en la guía |
| 5d | Paso 1 | Cambiar el nombre del proyecto en el formulario (probado: `mi-portafolio`) renombra repo, Worker y URL; los KV elegidos quedan enlazados (2026-10-31). | Repetir el flujo con otro nombre. | Verificado |
| 5e | Despliegue | «Enable Preview builds» viene activado y su comando `npx wrangler preview` falla («missing a `previews` block»): cada PR de sincronización muestra un build fallido ❌ (visto el 2026-10-31). | Desactivarlo en el formulario o, en un Worker ya creado, en Settings → Builds → Previews Base → «Builds for Preview branches». `versions upload` como comando alternativo falla por el nombre del Worker. | Verificado el 2026-10-31: con el interruptor apagado el PR no muestra check de Cloudflare |
| 5f | Actualizar | La creación automática del PR con el ajuste de Actions activado funciona (2026-10-31). El aviso «wrangler.jsonc cambió» salía siempre en falso (el `name` y los `id` de cada persona difieren). | Ejecutar el workflow en un repo creado por el botón. | PR automático verificado; aviso corregido en el template, falta volver a ejecutarlo |
| 5g | Despliegue | Desplegar con el botón desde la **misma cuenta de GitHub que el repo original** (`capagratuita/mi-catalogo-digital`): la copia intenta crearse con el nombre del proyecto y puede chocar con el repo original si se deja ese nombre. Tampoco se ha comprobado que el workflow de sincronización traiga cambios sin confundir ambos repos. Es una suposición, no se ha visto. | Pulsar el botón con la cuenta propietaria del template, con un nombre de proyecto distinto (`mi-portafolio`, `kuntukata`…) y dos nombres de KV distintos (`catalogo-datos`, `catalogo-fotos`); si choca el nombre, anotar el mensaje exacto. Después instalar y ejecutar el workflow de sincronización. | Sin verificar |
| 6 | Admin | ~~Opciones de precio de un servicio escritas como texto con `|`.~~ | Resuelto: filas con nombre, precio y minutos, y botones para añadir y quitar. | Resuelto (jsdom) |
| 7 | Admin | ~~Testimonios con `|` e IDs de items a mano en Landing.~~ | Resuelto: pestañas por sección, tarjetas de testimonios y casillas de items. | Resuelto (jsdom) |
| 8 | Cuota | Un ataque de contraseñas desde muchas IP podría gastar las escrituras diarias de KV. | Revisar el uso de KV tras unos días en línea. | Sin verificar |
| 9 | Revisión visual | Revisado con Chromium (Playwright) la portada en los 4 estilos y los editores del admin a 375 px; sin desbordes en 40 combinaciones de página, estilo y ancho. Tras el rediseño visual (blanco, Inter, tarjetas sobrias) también se revisaron a ojo ficha, carrito y FAQ; falta probar en un celular real. | Pasar el checklist E2E. | Parcial |
