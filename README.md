# Mi Cartera — iPhone Local Independiente (PWA)

Una misma aplicación instalable para muchos iPhone **sin sincronización**. Cada iPhone empieza con su cartera vacía y guarda clientes, préstamos, cobros, Caja y cierres en SU propio almacenamiento local. Un iPhone nunca consulta los datos de otro.

## Distribución gratuita (desde Windows)
1. Crea un repositorio público nuevo en GitHub (cuenta gratuita), por ejemplo `mi-cartera-iphone`. Nunca subas copias de seguridad ni archivos reales de clientes al repositorio.
2. Sube a la **raíz** del repositorio los archivos `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png` (sin la carpeta contenedora).
3. En el repositorio abre `Settings > Pages > Build and deployment > Deploy from a branch`, elige `main` y `/ (root)` y guarda.
4. GitHub publica una dirección HTTPS tipo `https://USUARIO.github.io/mi-cartera-iphone/`.
5. Desde Safari en CADA iPhone abre esa dirección. Usa `Compartir > Añadir a pantalla de inicio > Abrir como app web > Añadir`.
6. Abre la aplicación desde el icono, con internet al menos la primera vez. Luego se conservarán los archivos estáticos para usar la interfaz sin conexión.

## Funciones
- Clientes con ficha e historial de créditos.
- Créditos editables con interés fijo sobre el capital original y calendario semanal, quincenal o mensual.
- Cobros rápidos con importe predefinido y filtros: vencidos, hoy, 7/30 días, mes siguiente, futuros.
- Abonos parciales y comprobantes (archivo por abono de hasta 1 MB, por limitaciones del almacenamiento local).
- Anulación de créditos y sus abonos con corrección automática del saldo de Caja; cierre histórico intacto y ajuste actual para pagos históricos.
- Caja base, ingresos, egresos, cierres y bloqueo de 24 horas.
- Informes mensuales y gráficos; exportar/importar respaldo JSON (incluye comprobantes).
- Restablecimiento total solo tras escribir exactamente `confirmo` y una segunda confirmación.

## MUY IMPORTANTE: datos
- **Esta versión NO tiene sincronización, usuarios ni servidor de datos.** Distribuir la misma URL no distribuye ninguna información.
- **GitHub Pages aloja solo el código vacío**; no subas archivos JSON de clientes ni comprobantes.
- El almacenamiento web puede ser eliminado por iOS cuando hay presión de espacio, al borrar datos de Safari o al quitar la aplicación. Haz copias de seguridad a Archivos/iCloud Drive por lo menos cada día de trabajo.
- Un backup JSON transferido manualmente a otro iPhone REEMPLAZA la información de ese segundo iPhone. Nunca importes la copia de un dispositivo en otro si quieres mantener ambas carteras independientes.
- La versión iPhone tiene su propio formato JSON. **No importa directamente los ZIP/JSON de Android 2.5**; se necesitaría un conversor si quieres migrar datos existentes.
- Para distribuir a varios iPhone no necesitas Mac ni Xcode, ni pagar Apple Developer. Necesitas una URL HTTPS para instalar.
- Esta entrega no es una app nativa App Store, ni ha sido probada directamente en hardware iPhone; prueba las operaciones con datos ficticios antes de usarla en un negocio.

## Privacidad
- Los datos de negocio no se envían a GitHub ni a un servidor por el código de esta aplicación; se guardan en el almacenamiento del navegador/web app del dispositivo.
- Al visitar el hosting HTTPS se produce tráfico técnico ordinario a ese proveedor (IP y descarga de archivos estáticos).
- No cambies el dominio de alojamiento sin prever que cada origen HTTPS usa un almacenamiento local diferente.


## Versión 1.1 — mejoras
- Acceso a instrucciones de instalación desde el botón `?` y desde Ajustes.
- Edición de préstamos bloqueada durante el cierre de 24 horas (como cobros y anulaciones).
- Validación de importación para evitar archivos JSON incompletos o ajenos.
- Prevención de doble envío de formularios; límite de 600 KB por comprobante para reducir riesgo de llenar el almacenamiento del navegador.
- Validación de créditos para evitar que una edición deje un préstamo con un total menor que sus pagos ya registrados.
- La configuración HTTPS y el service worker necesitan publicación estática; no hay servicios de datos.

**Importante:** esta versión usa el almacenamiento web local (`localStorage`), no una base de datos de servidor. No es una solución empresarial con garantías de permanencia de registros: exporta copias frecuentemente, pruébala con información ficticia antes de trabajar con clientes reales y considera una aplicación nativa/base de datos auditada para un uso intensivo.
