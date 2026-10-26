# Mi Cartera iPhone 3.4.4 — PIN y pantalla discreta

- PIN de seis dígitos por dispositivo, con derivación PBKDF2-SHA256 y sal aleatoria; no se almacena la clave en texto claro.
- Solicitud al abrir/volver a la app; bloqueo por inactividad de cinco minutos.
- Botones de bloqueo y modo discreto desde Ajustes y menú superior.
- Pantalla neutra que no muestra clientes, Caja, créditos ni rutas; mantener pulsado el círculo y escribir PIN para reactivar.
- Cambio y desactivación de clave con PIN anterior; pausa temporal después de intentos repetidos.
- Sin cambios al formato de datos financieros, comprobantes, Google Maps ni respaldos.

## Limitaciones

La PWA no puede ocultar el icono de iOS ni reemplazar el sistema Face ID de apps nativas.
Los datos financieros y documentos locales NO están cifrados por este PIN. Mantén el teléfono protegido y respaldos en lugar seguro.
No hay recuperación de PIN por email. Recomendable exportar respaldo fuera del iPhone antes de activar.

## Pruebas

- Sintaxis de módulos JavaScript y existencia de referencias HTML/PWA.
- Prueba de funciones de clave y cambio de estado con DOM simulado y WebCrypto.
- No se pudo probar visualmente en Safari de un iPhone físico ni en Chromium en este entorno debido a restricciones de navegación.
