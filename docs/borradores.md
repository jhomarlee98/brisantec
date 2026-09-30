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
