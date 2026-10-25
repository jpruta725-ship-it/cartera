# Mi Cartera para iPhone — versión 2.7

Versión web instalable (PWA) con el estilo oscuro, organización y principales funciones de **Mi Cartera Android 2.7**.

## Funciones y organización

- Cinco secciones abajo: **Inicio, Clientes, Cobros, Caja, Reportes**.
- Menú superior `⋮`: **Créditos / Clavos**, Cobros, Reportes, Copias de seguridad y Ajustes.
- Botón flotante `+` con las acciones más frecuentes.
- Inicio: efectivo disponible, cartera activa, cobros del día, vencidos, Clientes, Clavos, últimos siete días y agenda.
- Clientes: búsqueda, editar/eliminar, prestar desde su ficha, historial con fechas, capital, abonos, saldos y advertencia de Clavos.
- Créditos: búsqueda, activos/vencidos/pagados, detalle de cuotas, edición, eliminación del crédito junto con sus abonos, menú `⋮` discreto para **Marcar como Clavo / Devolver a Cartera**.
- Cobros: importe sugerido automático, botón de cobro rápido, abonos parciales, adjuntar comprobante (imagen/PDF hasta 600 KB) y borrado confirmado, historial por cliente, filtros vencidos, hoy, 7 días, 30 días, mes siguiente y futuros, selector Cartera/Clavos.
- Préstamos: interés fijo sobre el capital inicial, fechas del crédito y del primer pago, frecuencias diaria/semanal/quincenal/mensual, selección de días de semana y 1–31 del mes, cuotas calculadas y redondeadas a centavos, selector de cliente con búsqueda.
- Caja: aportes de caja base, ingresos/egresos, desembolsos, cobros, anulaciones y ajustes de capital, cierre y bloqueo 24 horas, cierres históricos.
- Reportes: mes, capital prestado, recaudado, intereses, saldos, ingresos y egresos, gráfico diario.
- Respaldo JSON e importación; restaurar todos los datos exige escribir **`confirmo`** y confirmar otra vez.

La aplicación usa la misma clave localStorage de la versión web v1.1 (`micartera.pwa.data.v1`). Una actualización de archivos en el MISMO origen/URL no borra intencionadamente la cartera existente.

## Actualizar TU repositorio de GitHub Pages

Repositorio: `https://github.com/jpruta725-ship-it/cartera`

1. **Primero**: desde la aplicación instalada en cada iPhone, abre `⋮ → Copias de seguridad y ajustes → Exportar copia JSON` y guarda el archivo en Archivos / iCloud Drive. Hazlo en CADA teléfono con datos propios.
2. Descomprime este ZIP en Windows.
3. En el repositorio de GitHub `cartera` usa **Add file → Upload files** para actualizar los archivos de la raíz, incluidos `index.html`, `app.js`, **`parity.js`**, `styles.css`, `sw.js`, `manifest.json`, los dos iconos y este README. Guarda los cambios mediante **Commit changes**. Los archivos van directamente en la raíz, NO en una subcarpeta ni como ZIP.
4. En GitHub configura Pages para `main / (root)` si todavía no estaba activado.
5. En Safari del iPhone abre `https://jpruta725-ship-it.github.io/cartera/`, comprueba que aparece el menú `⋮` y cinco pestañas inferiores; si aún ves la versión anterior, actualiza la página, cierra y abre otra vez la app instalada (la caché offline puede conservar brevemente la versión antigua).
6. Conserva los respaldos JSON fuera del dispositivo y comprueba que tus clientes y Caja siguen intactos.

No necesitas Mac ni la App Store. Para instalarla: Safari → Compartir → Añadir a pantalla de inicio. Funciona offline una vez visitada correctamente y guardados sus archivos de aplicación. Cada dispositivo conserva datos independientes; no hay usuarios, nube ni sincronización.

## Compatibilidad con respaldos

- **iPhone PWA v1.1 y v2.7**: exporta/importa JSON de esta misma aplicación, con comprobantes embebidos en los datos exportados.
- **Android 2.x, archivo JSON**: puede convertir los datos básicos del formato Android (`clients`, `loans`, `cashMovements`, `cashClosures`, `cashBases`). Importa los importes de céntimos a R$, fechas de cuotas, abonos, Clavos y efectivo calculado. Antes de restaurar en el iPhone aparece confirmación explícita y REEMPLAZA todos los datos de ese iPhone. **Revisa los saldos importados con tu respaldo original.**
- **Android ZIP con comprobantes**: la importación directa de ese ZIP NO está implementada. Las referencias de comprobantes internos (`content://`, `file://`, `backup:`) no se pueden abrir en Safari. Debes conservar el ZIP de Android y sus comprobantes por separado; al convertir solo JSON no se transfieren los adjuntos de Android.

## Límites de iOS/PWA

Esta aplicación no es binario nativo iOS; se instala como **PWA** desde Safari. No puede garantizar que todos los detalles internos o integraciones del sistema funcionen exactamente igual a Kotlin/Android. Los comprobantes en la versión web se guardan como datos locales con límite individual de 600 KB. iOS puede eliminar almacenamiento web bajo algunas condiciones. La cuota de almacenamiento de `localStorage` es limitada: exporta con frecuencia y no dependas de una sola copia.

**Nunca publiques archivos con datos privados de clientes o respaldos JSON en un repositorio público.** Sube únicamente el código fuente de estos nueve archivos.

## Comprobaciones realizadas

- Sintaxis JavaScript `node --check`.
- Prueba de navegador Chromium emulando un móvil: alta de cliente y préstamo, lista de Créditos, menú discreto de Clavos, filtro de Cobros, cobro de una cuota, eliminación y vuelta del efectivo a Caja.
- Pruebas contables: abono/eliminación de crédito, eliminación de abono en cierre anterior sin reescribir el cierre, reglas de fechas 31/02 y conversión JSON de un ejemplo Android.
- Carga con datos existentes de la PWA v1.1 sin pérdida de registros.

**No se ha verificado en Safari de un iPhone físico.** Prueba primero con una copia de seguridad y, si la vas a usar con dinero real, compara los cálculos contra tus registros.
