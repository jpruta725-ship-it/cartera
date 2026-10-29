# Mi Cartera iPhone 3.4.9 — Cobros del día y renovaciones

## 1. Cobros: «Por pagar» / «Pagado hoy»

- «Por pagar» oculta todo préstamo que haya recibido **al menos un abono registrado hoy**, aunque siga atrasado o tenga saldo pendiente.
- «Pagado hoy» muestra esos préstamos por separado, incluidos los que ya quedaron totalmente liquidados.
- La clasificación usa la fecha local real del registro (`createdAt`); en datos antiguos que carecen de ella se usa la fecha del abono.
- El cambio se recalcula por ruta y por crédito. Dos créditos del mismo cliente permanecen independientes.
- Se mantienen los filtros de fecha, frecuencia y Cartera/Clavos.

## 2. Corrección de pagos/«cuotas»

- Desde «Pagado hoy», junto a cada abono encontrarás **Eliminar abono** con confirmación.
- Anular el abono reduce Caja exactamente por el importe cobrado y recalcula la asignación a cuotas. Se conserva el número contratado de cuotas: **no se elimina la cuota del calendario**.
- Un solo abono puede cubrir varias cuotas. En ese caso, «Eliminar abono» revierte ese pago completo; para corregirlo parcialmente debes registrar de nuevo el importe correcto.
- La eliminación respeta el bloqueo diario de Caja. El tratamiento de ajustes históricos sigue la lógica existente.

## 3. Inicio: cuotas por cliente

- En los cobros próximos se ve el total del préstamo y cuántas cuotas están pagadas/pendientes.
- Nuevo resumen «Cuotas por cliente» con préstamos separados, totales y cuotas pagadas/pendientes para la ruta activa.

## 4. Renovar crédito

- Menú `⋮` → «Renovar crédito», también accesible desde el detalle.
- El formulario reutiliza cliente, frecuencia, cantidad, interés y días de cobro; permite editar monto, fecha y condiciones nuevas.
- Se crea un **nuevo préstamo independiente** vinculado históricamente con `renewalOf` y se registra el capital nuevo que realmente se entrega en Caja.
- Si el anterior aún debe dinero, exige confirmar que ese saldo **no se refinancia, liquida ni perdona automáticamente**. Ambos créditos siguen separados.
- No se ofrece renovar créditos en Clavos hasta devolverlos a Cartera.

## Seguridad y compatibilidad

- Mismas claves de almacenamiento local y rutas, respaldo JSON y documentos existentes.
- No hay migración destructiva de datos.
- Haz siempre un respaldo antes de actualizar los archivos de GitHub.
- Pruebas de lógica realizadas con Node.js; sintaxis JavaScript verificada. La prueba visual automatizada en navegador está bloqueada en este entorno. Pendiente verificar Safari real.
