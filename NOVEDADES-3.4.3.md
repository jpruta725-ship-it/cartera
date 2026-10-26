# Mi Cartera iPhone 3.4.3 — Paleta clara y viva

Actualización visual de la versión 3.4.2. No cambia el formato ni la ubicación de los datos, las rutas, los respaldos o los cálculos financieros.

## Diseño
- Fondo blanco azulado suave para aumentar la luminosidad.
- Cabecera con degradado azul eléctrico, violeta y magenta.
- Tarjetas blancas con contornos suaves, mejor jerarquía tipográfica y acentos turquesa, amarillo y coral.
- Botones, filtros, menús, formularios, Caja, Clavos, documentos, ajustes, respaldos y gráficos recoloreados para un tema claro coherente.
- Iconos de aplicación actualizados con la nueva identidad visual.
- Colores de estado accesibles: verde azulado = cobrado/positivo; coral = peligro/egreso; ámbar = pendiente; azul = acciones.
- Respetar el ajuste de reducir movimiento de iOS.

## Compatibilidad y privacidad
- Se conservan las mismas claves de almacenamiento local y la estructura financiera de 3.4.2.
- Se mantienen todas las rutas independientes y los documentos guardados localmente.
- Google Drive sigue requiriendo la configuración OAuth de 3.4.2 para subida directa.
- Cada iPhone mantiene sus datos independientes; cambiar estilos NO sincroniza ni importa datos.

## Publicación GitHub Pages
1. Exporta un respaldo completo (rutas y documentos) y guárdalo fuera del iPhone.
2. Extrae el ZIP en Windows.
3. Sube TODOS los archivos de la aplicación directamente a la raíz del repositorio **cartera** y pulsa Commit changes. El ZIP también contiene archivos README y novedades; pueden subirse.
4. Comprueba que **index.html** indique `iPhone 3.4.3`, que `styles.css` esté actualizado y que **sw.js** use el caché `micartera-iphone-v343-luminous-theme`.
5. Abre la URL de GitHub Pages en Safari cuando termine la publicación: https://jpruta725-ship-it.github.io/cartera/?v=343
6. Si el icono instalado muestra el aspecto anterior, abre primero el enlace en Safari con internet y vuelve a abrir Mi Cartera. No borres el sitio ni desinstales sin respaldo.

## Comprobaciones realizadas
- Validación sintáctica de JavaScript y análisis de reglas CSS.
- Apertura y navegación de Inicio, Clientes, Caja y Reportes con tamaño de iPhone en Chromium con almacenamiento simulado; sin errores JavaScript.
- Comprobación del formulario Nuevo cliente y de los colores computados.

**Pendiente:** prueba de actualización y persistencia en Safari de un iPhone físico.
