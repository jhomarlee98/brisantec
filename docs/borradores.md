# Activar borradores de comprobantes

## Instalación

1. En Supabase, abrir SQL Editor en el proyecto usado por la aplicación.
2. Ejecutar una sola vez `supabase/migrations/202609300001_comprobante_borradores.sql` completa. Si se usa Supabase CLI con historial de migraciones, aplicar por el flujo de migraciones del proyecto, sin volver a ejecutar manualmente.
3. Conservar las variables existentes `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca usar una clave service_role en Vite.
4. Actualizar la aplicación e iniciar sesión. Entrar a Nuevo comprobante.

La migración crea exclusivamente una nueva tabla y su función/trigger. No modifica clientes ni catálogo. Es transaccional. Los borradores pertenecen al usuario que los crea; compartirlos entre trabajadores requerirá definir roles/empresa en otra iteración.

## Prueba de aceptación en el proyecto real

- Guardar un borrador vacío: debe permitir retomar un trabajo incompleto.
- Seleccionar cliente/dirección, agregar producto y servicio, cambiar cantidades, moneda, tipo de cambio, fecha, condición de pago y orden de compra. Guardar, recargar y recuperar: todos deben conservarse.
- Editar ese borrador y guardar dos veces: debe seguir existiendo una sola fila con ese ID. Ante error de red, reintentar con el mismo ID no crea un duplicado.
- Cambiar datos sin guardar e intentar recuperar otro borrador o salir: debe advertir sobre los cambios.
- Con una segunda cuenta, comprobar que no puede listar ni actualizar el borrador de la primera (también mediante la API, no solo en pantalla).
- Sin sesión, comprobar que la API deniega acceso a la tabla.
- Simular fallo de red al guardar: debe mostrar error y conservar los datos en pantalla.

## Alcance y límites

El JSON conserva el estado editable en una única escritura. No es un comprobante fiscal ni asigna numeración; no se envía a SUNAT. Los totales se recalculan en la pantalla y deberán validarse en el servidor durante la futura emisión. Los datos del cliente se referencian por ID; el snapshot fiscal se implementará al emitir. Edición simultánea en varias pestañas: prevalece el último guardado.

La compilación no sustituye las pruebas de permisos ni de persistencia contra Supabase. No se han aplicado migraciones remotas desde este cambio.

Referencia oficial: https://supabase.com/docs/guides/database/postgres/row-level-security

## Cuotas de ventas a crédito

El formulario permite agregar, editar y quitar cuotas con fecha e importe. La suma se comprueba en centavos contra el total mostrado. Se admiten punto o coma decimal, hasta dos decimales; cada importe debe ser positivo y cada vencimiento válido y no anterior a la emisión.

Un borrador incompleto se puede guardar con aviso. Las cuotas son un cronograma, no pagos registrados ni un comprobante emitido. Cambiar a contado pide confirmación y elimina las cuotas. Cambiar ítems recalcula las diferencias sin modificar automáticamente las cuotas.

No requiere migración adicional: se guarda `installments` dentro del JSON existente. Los borradores antiguos sin ese campo abren con una lista vacía.

Pruebas automáticas (Node 24): `node --test tests/cuotas.test.mjs`.

Prueba manual pendiente en Supabase: crear una venta de 118.00 a crédito, distribuir 59.00 y 59.00 con vencimientos válidos, guardar, recargar y recuperar. Deben conservarse ambas cuotas. Cambiar una a 60.00 debe mostrar exceso de 1.00; dejar una fecha vacía debe advertir y permitir guardar como borrador incompleto. Probar cambiar a contado cancelando y aceptando la confirmación.

## Pantalla Mis borradores

Desde el panel (también en móvil), abrir **Mis borradores**. Permite buscar por cliente, documento, fecha ISO, orden de compra o ID, filtrar facturas/boletas, consultar total y última modificación, continuar edición y eliminar con confirmación. Los borradores se siguen restringiendo a su propietario mediante RLS.

Aplicar una sola vez `supabase/migrations/202609300002_borradores_delete.sql` en SQL Editor, después de la primera migración. Solo añade el permiso y la política DELETE para el propietario. No elimina registros al ejecutarse. Sin esta migración, listado y edición funcionan, pero eliminar no está habilitado en la base.

Pruebas manuales pendientes en Supabase:

1. Guardar dos borradores con distintos clientes, monedas y condiciones. Buscar por nombre/documento y filtrar por tipo.
2. Abrir uno desde la lista y verificar cliente, dirección, ítems, moneda, fecha y cuotas. Recargar la URL: debe conservar el borrador seleccionado.
3. Editar y guardar. Volver a la lista: debe mostrar el nuevo importe sin duplicar la fila.
4. Cancelar la confirmación de eliminar: debe conservar el borrador. Aceptarla: debe desaparecer y seguir ausente al recargar.
5. Con otra cuenta, comprobar que no se lista el borrador ajeno, no se abre mediante su URL y no puede eliminarse mediante la API.
6. Un ID inexistente o enlace inválido debe mostrar un mensaje y permitir volver al listado.

El listado no representa comprobantes emitidos ni ventas cobradas. Ejecutar `node --test tests/*.test.mjs` para las pruebas de cuotas y comparación de JSONB. La compilación y estas pruebas no verifican la conexión real ni las políticas remotas.

## Vista previa e impresión

En Nuevo comprobante o Editar borrador, usar **Vista previa / PDF**. Muestra el estado actual del formulario: cliente, dirección, fecha, moneda, orden de compra, productos/servicios, importes y cuotas. Usa los mismos totales que el resumen de edición. Se presenta como borrador sin emisión ni numeración fiscal.

**Imprimir / PDF** abre el diálogo del navegador; elegir Guardar como PDF para exportar. Esto no guarda el borrador en Supabase, no registra cobros y no envía a SUNAT. Los datos incompletos quedan indicados en la vista previa. No incluye RUC del emisor, dirección fiscal, firma ni QR de emisión: esos datos aún no están configurados.

El diseño usa CSS de impresión A4, excluye los controles del formulario y permite repetir encabezados de tabla en varias páginas. Referencias: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing y https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal.

Verificación pendiente en navegador real: abrir y cerrar con Escape, imprimir 3 y 65 ítems y comprobar el último ítem/totales/cuotas; revisar en móvil, probar PEN y USD, y confirmar que no aparecen controles en el PDF. La prueba visual automatizada no pudo ejecutarse en este entorno: no había Chromium y su descarga falló. Build/lint y pruebas unitarias no sustituyen esa revisión de impresión.
