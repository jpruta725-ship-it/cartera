# Mi Cartera iPhone 3.4.7 — bloqueo al salir opcional

Abre **Copias y ajustes → Privacidad y acceso** con el PIN configurado. En **Bloquear al salir de Mi Cartera**, selecciona **Activado (más seguro)** o **Desactivado**. El valor inicial es Activado.

Con Desactivado, al cambiar de app y volver **sin cerrar ni recargar** Mi Cartera no te pedirá el PIN si aún no venció el tiempo de inactividad (configurable entre 30 segundos y 60 minutos). En segundo plano se sigue contando ese tiempo; al regresar después del plazo el contenido se bloqueará. Si el sistema cierra la aplicación por memoria o vuelves a abrirla desde cero, se pedirá el PIN por seguridad. Bloquear ahora y Modo discreto funcionan siempre.

La configuración queda local a cada iPhone; no altera clientes, documentos, rutas, créditos, Caja o respaldos. **Antes de subir la actualización, exporta una copia de seguridad completa. No borres los datos de Safari ni desinstales la PWA.**

## Publicar en GitHub Pages

1. Extrae los archivos del ZIP.
2. Sube los archivos de la raíz a `https://github.com/jpruta725-ship-it/cartera` con **Add file → Upload files**, reemplazando los anteriores. En particular deben cambiar `security.js`, `index.html` y `sw.js`.
3. Guarda con **Commit changes**.
4. Visita `https://jpruta725-ship-it.github.io/cartera/?v=347` en Safari cuando termine la publicación. No borres los datos de la web.

La aplicación funciona de forma local; las rutas y los datos no se sincronizan automáticamente entre dispositivos.
