# Mi Cartera iPhone 3.3.2 — Ubicación Google Maps de clientes

## Cambios
- Campo opcional **Ubicación en Google Maps** en Nuevo cliente y Editar cliente.
- Botón **Buscar dirección**: busca la dirección escrita en Maps; tras elegir el punto, usa Compartir → Copiar enlace y pégalo en Mi Cartera.
- Botón **Mi ubicación actual**: con permiso explícito, guarda las coordenadas del dispositivo; úsalo solamente si estás en la dirección del cliente. Sin seguimiento automático.
- Botón **Ver punto** para comprobar el enlace antes de guardarlo.
- Abrir ubicación desde la ficha, la tarjeta y el menú del cliente.
- Validación de enlaces HTTPS de Google Maps o enlaces cortos oficiales.
- El enlace se guarda en `client.mapUrl`, con el resto de datos locales de Mi Cartera, y se incluye en el respaldo JSON de la aplicación.
- Actualización de caché `v332` para que Safari cargue los archivos nuevos.

## Límites y privacidad
- Sin API key ni cuota de Google Maps: abre Maps externamente en lugar de integrar un mapa interactivo para elegir el punto dentro del formulario.
- **No subas respaldos** con información personal de clientes a un repositorio público.
- El mapa requiere conexión a Internet; los datos y el enlace se pueden consultar y editar sin conexión.
- Cada iPhone mantiene su cartera independiente. El proyecto y su identificador de almacenamiento no cambian.
- Antes de actualizar, exporta una copia desde cada dispositivo. No borres datos de Safari ni desinstales la PWA.
