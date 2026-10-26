# Auditoría técnica — Mi Cartera iPhone 3.3

Fecha: 26/10/2026. Base de revisión: Mi Cartera iPhone 3.2 (12 archivos). Alcance: lectura de JavaScript, HTML, caché, persistencia local, controles financieros, importación/exportación, cálculo de fechas y compatibilidad. Se conservaron los archivos y la clave de datos existentes.

## Fallos encontrados y corregidos

| Categoría | Problema | Corrección |
|---|---|---|
| Cobros | Se reunían todos los créditos de un cliente en una única tarjeta, con cobro vinculado al primer préstamo. | Una tarjeta por crédito, historial y cobro propios. |
| Vencimientos | Estado «Atrasado» sin diferenciar la última fecha del contrato; podía confundirse una cuota atrasada con todo el crédito vencido. | Estados «Cuotas atrasadas» y «Crédito vencido» y fecha final a la vista. |
| Organización | Faltaban categorías diarias, semanales, quincenales y mensuales en las listas actuales. | Filtros con contadores por frecuencia. |
| Precisión | Suma de importes y totales mediante flotantes, con posibilidad de decimales binarios residuales. | Total, abonos y saldo calculados en centavos enteros. |
| Guardado | Varias operaciones no comprobaban el resultado de guardar; un fallo de cuota de almacenamiento podía dejar cambios visibles pero no persistentes. | Guardia de escritura con reversión al estado financiero previamente guardado. |
| Datos corruptos | La capa básica abre una cartera vacía cuando no consigue leer JSON local. | Se detecta la situación, bloquea nuevas escrituras y se muestra una advertencia. |
| Caché offline | Los recursos se precargaban sin parámetro `v`, mientras la página los solicitaba con `?v=32`; podía fallar la apertura offline antes de una segunda visita. | Alternativa de caché por URL sin query, precarga de `quality.js` y caché versión 33. |
| Cambio de fecha | El recálculo automático a medianoche dependía principalmente del cierre de Caja. | Refresco de interfaz también sin cierre previo. |
| Identificación de versión | Difícil saber si GitHub publicó cambios o Safari mostraba la versión anterior. | Versión 3.3 visible y comprobación manual de publicación. |

## Mejoras adicionales

- Caja muestra el pendiente de cartera normal y de Clavos, sin alterar el efectivo ni crear asientos.
- Contadores de cuotas completamente pagadas y aún pendientes en tarjetas.
- Se conservan nombres de las categorías, búsqueda y combinaciones de filtros anteriores.
- Conservación de la clave financiera `micartera.pwa.data.v1` y documentos IndexedDB `micartera.client-documents.v1`.

## Riesgos que todavía requieren trabajo

1. **Almacenamiento iPhone:** iOS puede liberar el almacenamiento de una web app. No equivale a una base de datos nativa con garantía de conservación. Los respaldos externos son esenciales.
2. **Persistencia dividida:** dinero en `localStorage` y documentos en IndexedDB. Importar/restaurar intenta proteger las dos partes, pero no es una transacción única entre ambos motores. Para una futura versión mayor conviene trasladar también la información financiera a IndexedDB con migración y respaldo comprobados.
3. **Respaldo sensible:** el JSON exportado contiene datos personales y, si están adjuntos, documentos. **No está cifrado.** Se recomienda cifrado por contraseña y restauración comprobada en una futura versión.
4. **Código acumulado:** hay funciones sobrescritas en varias capas (`app.js`, `parity.js`, `documents.js`, `improvements.js`, `integrity.js`, `quality.js`). Para escalar con menos riesgo conviene modularizar la aplicación y crear un conjunto formal de pruebas end-to-end.
5. **Actualización remota:** el código publicado en GitHub es público, pero los registros privados no se suben allí. Hay que reemplazar correctamente los archivos para activar cada entrega.
6. **Cobros y Caja:** no se modificaron los criterios de reconocimiento financiero ya existentes ni se recalcularon cierres pasados. Se necesita una revisión con movimientos reales anonimizados antes de hacer cambios de contabilidad profunda.

## Pruebas

Se ejecutaron `node --check` de los archivos JavaScript, dos conjuntos de pruebas de lógica con DOM simulado y una prueba de restauración tras fallo de `localStorage`. Las pruebas pasaron. **No se completó una prueba visual interactiva real de Safari:** el navegador de este entorno bloqueó URL locales. Eso limita el alcance de la garantía.
