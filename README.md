# Mi Cartera iPhone 3.1 — Cierre diario por fecha (apertura a medianoche)

Mi Cartera es una PWA gratuita de funcionamiento local; cada iPhone mantiene clientes, créditos y Caja independientes.

## Regla definitiva de cierre de Caja

- Puedes cerrar Caja a **cualquier hora** del día, siempre que aún no exista cierre en esa fecha local.
- Desde el momento del cierre, la Caja queda bloqueada **solo hasta las 00:00 del día siguiente** (no 24 horas después).
- Ejemplo: cierre el 25/10/2026 a las 11:00 -> reapertura automática el **26/10/2026 a las 00:00**.
- Inicio y Caja muestran la fecha y hora exactas de apertura.
- Solo hay **un cierre por fecha**. Si el formulario estaba abierto al llegar a la medianoche, no se admite el cierre retroactivo del día anterior; hay que iniciar uno para el día actual.
- Si no se realiza un cierre, los cobros y movimientos permanecen acumulados hasta cerrar manualmente.
- Los cierres antiguos, créditos, comprobantes, movimientos y respaldos continúan en el mismo almacenamiento local. El cambio no modifica el formato del archivo JSON.

## Actualizar la aplicación en varios iPhone

1. **Antes de actualizar**, exporta un respaldo desde cada iPhone con información. No subas ningún respaldo con datos personales a GitHub: el repositorio es público.
2. Descomprime este ZIP y sube los 11 archivos de la raíz al repositorio GitHub Pages, **reemplazando** los archivos antiguos (no subas el ZIP en sí).
3. En GitHub, haz `Commit changes` y espera a que termine la publicación en Pages.
4. Abre `https://jpruta725-ship-it.github.io/cartera/?v=31` en Safari con conexión. Si sigue mostrando la versión anterior, actualiza la página y reabre la app instalada. El service worker tiene una nueva versión de caché.
5. No desinstales la PWA ni borres datos del sitio antes de tener un respaldo comprobado.

La hora local del dispositivo debe estar configurada correctamente. La apertura se comprueba al cargar/volver a abrir la aplicación y cuando se alcanza la medianoche si permanece abierta.

## Pruebas

Verificados en navegador móvil simulado: cierre a las 11:00, bloqueo a las 23:59, reapertura a las 00:00, un solo cierre por fecha, cierre nuevo el día siguiente, protección contra cierre retroactivo en modal, formato de respaldo y ausencia de errores JavaScript. Pendiente prueba física en Safari iOS.
