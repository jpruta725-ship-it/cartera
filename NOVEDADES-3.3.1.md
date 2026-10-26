# Mi Cartera iPhone 3.3.1 — Frecuencia diaria predefinida

- **Nuevo crédito**: el selector «Frecuencia» inicia en **Diaria**.
- Se mantienen disponibles Semanal, Quincenal y Mensual.
- **Editar crédito**: respeta la frecuencia ya guardada en el crédito, sin cambiarla a Diaria automáticamente.
- Se conserva el calendario de cobros de los créditos existentes.
- Se incrementó la versión de caché y las referencias de recursos para que Safari descargue el formulario actualizado.
- No cambian el almacenamiento local, el formato de respaldo, el identificador de la PWA ni los importes de Caja.

## Publicación

1. Exporta respaldo desde cada iPhone con datos.
2. Sube los archivos del ZIP **directamente a la raíz** de tu repositorio `cartera` en GitHub, reemplazando los anteriores (sin subir el ZIP cerrado).
3. Comprueba que `index.html` diga `iPhone 3.3.1` y que `sw.js` contenga `v331`.
4. Tras publicarse GitHub Pages, abre `https://jpruta725-ship-it.github.io/cartera/?v=331` en Safari. No borres los datos del navegador.
5. Prueba un Nuevo crédito sin guardarlo: debe mostrarse **Diaria**; edita un préstamo semanal antiguo y debe seguir mostrándose **Semanal**.

**Advertencia:** no se ha probado el resultado en un iPhone físico; haz copia de seguridad antes de actualizar.
