# Mi Cartera iPhone 3.2 — Auditoría y rendimiento

PWA local para iPhone. Conserva diseño oscuro, clientes y documentos, créditos, cobros, Clavos, Caja, reportes y respaldos de la versión 3.1. **Cada iPhone mantiene su propia cartera**.

## Novedades trasladadas desde Android 2.18

- **Copias y ajustes → Diagnóstico de datos**: número de clientes, créditos, abonos, cierres; detección de clientes o créditos huérfanos, IDs repetidos, fechas imposibles, importes inválidos y abonos que superan el total pactado.
- **Restauraciones más seguras**: antes de sustituir la cartera, comprueba la integridad de los registros y limita los registros financieros (sin el contenido base64 de comprobantes o documentos) a 12 MB; los adjuntos conservan sus límites anteriores.
- **Rendimiento**: caché automática de calendarios y reparto de cuotas. Se recalculan tras cambiar fechas, frecuencia, capital o interés. Se devuelven copias para no modificar accidentalmente lo almacenado.
- Actualización de la etiqueta a iPhone 3.2 y nueva versión del caché offline.

## Cómo actualizar el sitio de GitHub Pages

1. En **cada iPhone**, abre la app actual y usa **Copias y ajustes → Exportar copia JSON**. Comprueba que el archivo esté guardado en **Archivos** u otro lugar seguro. Nunca subas respaldos con datos reales a un repositorio público.
2. Descomprime el ZIP y sube **los 12 archivos sueltos** a la raíz de `https://github.com/jpruta725-ship-it/cartera`, reemplazando los anteriores. **Incluye `integrity.js`**.
3. Pulsa **Commit changes** en GitHub y verifica que se publique GitHub Pages.
4. En Safari abre `https://jpruta725-ship-it.github.io/cartera/?v=32` con conexión. Vuelve a abrir el icono instalado si hace falta.
5. En **Copias y ajustes**, comprueba que se lea "Versión iPhone 3.2" y utiliza **Ver diagnóstico completo**. Verifica clientes, saldos y respaldos antes de seguir registrando datos.

### Notas

- Mantiene **exactamente** la clave local `micartera.pwa.data.v1`; no borra ni sustituye datos durante la actualización.
- El diagnóstico es **solo lectura** y no modifica registros. Una advertencia no significa que una operación haya cambiado.
- Rechaza importaciones con integridad incorrecta antes de presentar la confirmación. Las copias Android en JSON se convierten antes de validarse. No soporta directamente comprobantes del ZIP interno de Android.
- Los documentos de clientes permanecen en IndexedDB y son incluidos al exportar el respaldo completo.
- No existe sincronización entre dispositivos. La aplicación web en iOS requiere respaldos frecuentes: iOS puede eliminar los datos locales en algunas circunstancias.
- Pruebas automáticas en Chromium **no sustituyen** la verificación en Safari real.
