# Mi Cartera iPhone 3.4 — Rutas y calidad del historial de pago

## Qué cambió

### Rutas independientes (sin cuentas ni sincronización)
- El botón **⌖ Ruta principal** en la barra superior abre el administrador de rutas.
- Puedes crear, renombrar, abrir y eliminar rutas, hasta un límite de 25.
- **Cada ruta** tiene clientes, créditos, Clavos, abonos, movimientos, saldo de Caja, cierres y reportes completamente separados en la interfaz.
- La cartera existente se convierte automáticamente en **Ruta principal** sin modificar la clave antigua `micartera.pwa.data.v1` (se mantiene una copia de recuperación).
- La ruta activa se guarda para la próxima apertura. Cambiar de ruta no traspasa dinero ni clientes.
- Para eliminar una ruta hay que escribir su nombre exacto y confirmar. Para restablecer solo la ruta activa hay que escribir `confirmo`. Ninguna de esas operaciones debe ejecutarse sin respaldo.
- Se conserva el funcionamiento offline después de instalar los archivos de la PWA.

### Puntaje de historial de pagos
- En **Clientes** hay una etiqueta de evaluación; en el detalle del cliente está el informe por préstamo.
- En **Reportes** hay un resumen de los clientes de la ruta activa clasificados como Bueno, Regular, Malo e Historial insuficiente.
- **Fórmula**: porcentaje de créditos evaluables SIN atraso en su historial, multiplicado por 100.
- Un crédito cuenta **una** vez como atrasado si alguna cuota no estaba cubierta en su fecha de vencimiento. Se consideran pagos del mismo día como puntuales; una cuota pagada después mantiene el registro histórico de atraso.
- Se evalúan créditos con alguna fecha de cuota anterior a hoy o que fueron totalmente pagados antes. Un crédito que no tenga fecha vencida y siga pendiente no se considera evaluable.
- Si hay menos de 3 créditos evaluables, muestra **Historial insuficiente**; de lo contrario, Bueno ≥80 %, Regular 50–79 %, Malo <50 %.
- **Ejemplo**: 5 créditos evaluables y 3 con atrasos → 2/5 = 40 puntos → Malo.
- Indicador descriptivo, no historial oficial de crédito ni decisión automática de aprobación. Solo analiza lo que registraste y puede cambiar si corriges calendarios o pagos.

### Respaldo seguro para varias rutas
- El botón de respaldo superior y **Respaldar todas las rutas** generan un JSON que incluye todas las rutas con sus finanzas y documentos de clientes disponibles.
- En **Rutas** también puedes **Respaldar esta ruta** sin las demás.
- **Restaurar todas las rutas** reemplaza todas las rutas y sus documentos en este iPhone (previa confirmación).
- La opción antigua **Importar copia** acepta un respaldo anterior como sustitución de la ruta activa (y no altera otras rutas). Si seleccionas un respaldo de rutas, se restaura el conjunto completo con confirmación.
- Los documentos siguen en IndexedDB y se filtran por clientes de la ruta. Al borrar/restablecer una ruta, los documentos de otras rutas se mantienen.
- **No subas tus respaldos a GitHub público**. Los JSON incluyen información sensible y no están cifrados.

## Instalación / actualización en iPhone
1. **Antes de actualizar**, desde cada iPhone exporta el respaldo completo vigente y guárdalo en Archivos/iCloud Drive u otro lugar seguro. Comprueba que el archivo existe.
2. Descomprime el ZIP y sube todos los archivos de la carpeta raíz a `https://github.com/jpruta725-ship-it/cartera` sustituyendo los existentes. Incluye **`routes.js`**, **`index.html`** y **`sw.js`**.
3. Haz Commit changes; espera la publicación de GitHub Pages y abre `https://jpruta725-ship-it.github.io/cartera/?v=34` en Safari con internet.
4. **No borres ni desinstales** la PWA ni limpies los datos de Safari. Comprueba que sale el botón **⌖ Ruta principal** y que tus clientes actuales siguen allí.
5. Crea una ruta ficticia, regresa a Ruta principal y verifica que Caja y registros son independientes. Después exporta un **respaldo de todas las rutas**.

## Pruebas realizadas
- Revisión de sintaxis `node --check` de los 8 scripts JavaScript.
- Simulación UI en Chromium: creación de ruta, selección, cambio y conservación del estado local al volver a abrir.
- Prueba de migración con Caja R$ 30.000 y un cliente antiguo: los datos se conservaron en Ruta principal y la antigua clave quedó intacta.
- Prueba de puntaje con cinco créditos (tres tardíos y dos puntuales): 40/100, Malo.
- Prueba del informe agregado de Reportes por ruta.
- Respaldo y restauración de todas las rutas, con datos financieros independientes.
- Inclusión de un documento en el respaldo y restauración mediante **simulación** de IndexedDB (no es una prueba de persistencia real en Safari).
- Pendientes: prueba en iPhone físico, almacenamiento persistente de documentos en Safari real, cuotas/fecha locales con cambio de zona horaria y pruebas en dispositivo con almacenamiento cercano al límite.

## Limitaciones
- Las rutas comparten el almacenamiento local de **este iPhone** y no están protegidas entre sí por PIN o perfiles; quien abre la app puede cambiar de ruta.
- No hay sincronización entre teléfonos, servidor ni cuentas. Cada teléfono tiene sus propias rutas independientes.
- Safari puede borrar datos locales en determinadas circunstancias: realiza respaldos completos fuera de la PWA.
- Las rutas financieras usan almacenamiento local del navegador, que tiene límites de capacidad. No guardes archivos enormes como comprobantes base64; respalda regularmente.
- Este código no se ha ejecutado en Safari de un iPhone físico en esta sesión.
