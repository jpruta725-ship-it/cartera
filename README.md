# Mi Cartera para iPhone 3.3 — Revisión integral

**Aplicación web instalable (PWA)** para Safari. Funciona sin cuentas, mantiene los datos separados en cada teléfono y utiliza reales brasileños (R$). No es una aplicación nativa de App Store.

## Novedades verificadas de esta versión

1. **Cobros separados por crédito:** si una persona tiene dos préstamos, aparecen como dos tarjetas independientes y cada botón Cobrar se vincula a su propio préstamo.
2. **Categorías por frecuencia en Créditos y Cobros:** Todas, Diarios, Semanales, Quincenales y Mensuales, con contadores y combinación con Cartera/Clavos y filtros de vencimiento.
3. **Vencimientos más claros:** «Cuotas atrasadas» cuando existen cuotas vencidas pendientes y «Crédito vencido» solo después de la fecha final del préstamo con saldo pendiente. La fecha final queda visible.
4. **Cuotas pagadas y pendientes** en cada tarjeta, usando el calendario y los abonos registrados.
5. **Cálculos monetarios en centavos** para saldo, total de interés fijo y suma de pagos, evitando resultados de coma flotante al agregar valores pequeños.
6. **Caja con saldos pendientes por categoría:** cartera normal, Clavos y total, expresamente separados del efectivo disponible.
7. **Protección de escritura:** si Safari rechaza el guardado, se restaura el último estado financiero persistido y se informa del error; si el archivo local almacenado no se puede leer, se bloquea su sobrescritura accidental.
8. **Caché sin conexión corregida:** los scripts y estilos con parámetro `?v=33` pueden utilizar los archivos precargados por el service worker sin internet.
9. **Indicadores actualizados al cambiar de fecha:** incluso si no se cerró Caja, mientras la PWA está abierta y visible.
10. **Comprobar versión publicada** en Copias y ajustes para detectar si GitHub Pages ofrece una versión distinta de la instalada.

## Cómo actualizar sin perder datos

1. En **cada iPhone**, entra en Copias y ajustes y **exporta un respaldo JSON completo**. Comprueba que se guardó en Archivos o en una ubicación fuera de la aplicación. El respaldo puede contener documentos y datos personales sensibles; no lo subas a GitHub.
2. Descarga y descomprime este ZIP desde Windows.
3. Abre el repositorio GitHub `jpruta725-ship-it/cartera`. Usa **Add file → Upload files**.
4. Sube **todos los archivos de la raíz del ZIP**, reemplazando los que ya existen. Muy importante: añade el archivo nuevo `quality.js`. El archivo `index.html` debe mostrar `iPhone 3.3` y `sw.js` contener la caché `v33`.
5. Pulsa **Commit changes**, espera a que GitHub Pages publique los cambios y abre `https://jpruta725-ship-it.github.io/cartera/?v=33` en Safari.
6. **No desinstales ni elimines la PWA, no borres datos de Safari** y no restablezcas la cartera para actualizar.
7. Comprueba un cliente, dos créditos, un abono y el saldo de Caja ANTES de realizar nuevos movimientos. Busca el panel «Versión 3.3» en Copias y ajustes.

La clave local `micartera.pwa.data.v1` y la base de documentos `micartera.client-documents.v1` no cambiaron. Esta actualización **no modifica ni restablece los registros existentes** al instalarse.

## Pruebas realizadas

- `node --check` de los siete scripts JavaScript: correcto.
- Carga secuencial de los seis scripts de interfaz/lógica en un entorno Node VM con DOM simulado: correcto.
- Dos créditos normales del mismo cliente → dos tarjetas en Cobros, filtrado diario, categoría Clavos separada: correcto.
- Crédito diario desde el 14/10/2026 con 20 cuotas → fecha final 03/11/2026 y etiqueta de cuotas atrasadas antes de esa fecha: correcto.
- Interés fijo 20 % sobre R$ 1.000 → total R$ 1.200; abonos R$ 0,10 + R$ 0,20 → R$ 0,30: correcto.
- Cambio de fecha en crédito mensual → invalidación de la caché del calendario: correcto.
- Cierre del día actual → reapertura a las 00:00 del día siguiente: correcto.
- Respaldo con fecha imposible → rechazado: correcto.
- Simulación de error al guardar por falta de espacio → revertidos los cambios no persistidos: correcto.

**Pendiente:** prueba completa de UI en Safari físico, carga real de archivos y persistencia IndexedDB en iOS, instalación/caché al alternar offline/online y auditoría de seguridad externa. El navegador automatizado de este entorno bloqueó el acceso a las URL de prueba locales; no se afirma que se haya completado una validación visual en Safari.

Consulta `AUDITORIA-3.3.md` para los hallazgos y los riesgos restantes.
