begin;
-- Requiere 202609300001_comprobante_borradores.sql.
-- Solo el propietario puede eliminar sus borradores; no concede acceso a anon.
grant delete on public.comprobante_borradores to authenticated;
create policy borradores_delete on public.comprobante_borradores
  for delete to authenticated using (owner_id = (select auth.uid()));
commit;
