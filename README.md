# Mi Cartera iPhone 3.4.3 · Tema claro y vibrante

Versión **PWA local para iPhone**, con la nueva paleta clara, colores vivos y todas las funcionalidades previas de la 3.4.2 (rutas independientes, puntaje, Google Maps, cuotas múltiples, documentos, Google Drive, Caja y Clavos).

**Actualización:** abre `NOVEDADES-3.4.3.md` para instrucciones de publicación y precauciones con la caché de Safari.

**Datos:** misma clave local y mismos formatos que 3.4.2. Los archivos JSON con documentos no están cifrados, no los subas a GitHub público. Antes de actualizar guarda un respaldo fuera del iPhone.

---

# Mi Cartera iPhone 3.4.2

Nueva función: copias de seguridad en Google Drive. Revisa `NOVEDADES-3.4.2.md` para la configuración, limitaciones y modo Compartir.

# Mi Cartera iPhone 3.4.1

**Novedad:** selector de 1 o varias cuotas al registrar un abono, con cálculo de importe sugerido y abonos parciales. Consulta `NOVEDADES-3.4.1.md`.

# Mi Cartera para iPhone 3.4 — Rutas y puntaje de clientes

PWA local para iPhone en español y reales brasileños, con diseño oscuro.

**Novedades:**
- Varias **rutas de cobranza** totalmente separadas en la interfaz, cada una con sus clientes, préstamos, Caja, cierres, Clavos, cobros y reportes.
- **Puntaje explicable** del historial de puntualidad en Clientes y Reportes.
- **Respaldo completo de todas las rutas**, con documentos adjuntos, y respaldo de una sola ruta.
- Continúan Google Maps, documentos de clientes, categorías por frecuencia, cobros rápidos y Caja con cierre diario y reapertura a las 00:00.

## Publicar en el GitHub actual

1. Exporta un respaldo de la versión que ya tienes en cada iPhone **antes** de reemplazar archivos.
2. Descomprime y sube los archivos de la raíz a tu repositorio de GitHub Pages `jpruta725-ship-it/cartera` (no subas el ZIP ni una carpeta exterior).
3. Comprueba que subiste `routes.js`, `index.html`, `sw.js`, `quality.js`, `integrity.js`, además de los demás archivos. Pulsa **Commit changes**.
4. Abre la misma dirección publicada `https://jpruta725-ship-it.github.io/cartera/?v=34` en Safari tras actualizar.
5. No desinstales la PWA ni borres los datos de Safari. Comprueba primero la Ruta principal y el saldo de Caja; después crea una ruta de prueba.

Para todas las reglas, limitaciones y pruebas, lee [NOVEDADES-3.4.md](NOVEDADES-3.4.md).

**Datos privados:** no subas clientes, créditos, documentos ni copias JSON al repositorio público. Cada iPhone guarda sus propias rutas. Las rutas no son cuentas separadas con contraseña.


## Mi Cartera iPhone 3.4.4 — Acceso y modo discreto

Desde **Copias y ajustes → Privacidad y acceso** se puede configurar una clave de seis dígitos.
Después, Mi Cartera exige el PIN al volver a abrir o regresar a la app y se bloquea
tras cinco minutos de inactividad. **Bloquear ahora** está disponible también desde
el menú superior.

**Modo discreto** reemplaza la vista financiera por una pantalla neutra. Para
volver, mantén pulsado el círculo central aproximadamente un segundo (o pulsa
«Acceder» para accesibilidad) e introduce el PIN. Al desbloquear se desactiva
el modo discreto y aparece Mi Cartera de nuevo.

Puedes cambiar o desactivar el PIN introduciendo la clave actual. La verificación
usa PBKDF2-SHA256 con sal aleatoria. El PIN no se sincroniza entre iPhone ni se
incluye en el respaldo de clientes, rutas y documentos.

**Limitaciones y seguridad:** esto NO cifra la base de datos local, NO oculta el
icono de la pantalla de inicio y NO es Face ID. Una aplicación PWA no puede
ocultar por sí sola su icono en iOS. Los respaldos JSON siguen sin cifrar;
consérvalos en una ubicación privada. Si olvidas el PIN no hay recuperación
por correo ni clave maestra; conserva siempre un respaldo exportado antes de
activar la función. Borrar los datos de Safari o desinstalar la PWA puede
eliminar la información local no respaldada.

Para actualizar la app que ya usas en iPhone, sube **todos los archivos** de
esta versión a GitHub Pages, especialmente `security.js`, `index.html`,
`styles.css` y `sw.js`. Mantén el mismo dominio/ruta para conservar datos.
