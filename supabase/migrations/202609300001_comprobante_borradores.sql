begin;

-- Borradores internos: no asignan serie/correlativo ni representan emisión fiscal.
create table public.comprobante_borradores (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id),
  contenido jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contenido_version check (
    jsonb_typeof(contenido) = 'object'
    and (contenido ->> 'version' = '1') is true
    and (contenido ->> 'documentType' in ('01', '03')) is true
    and (contenido ->> 'currency' in ('PEN', 'USD')) is true
    and (jsonb_typeof(contenido -> 'items') = 'array') is true
  )
);
create index comprobante_borradores_owner_updated_idx
  on public.comprobante_borradores(owner_id, updated_at desc);

alter table public.comprobante_borradores enable row level security;
revoke all on public.comprobante_borradores from anon, authenticated;
grant select, insert, update on public.comprobante_borradores to authenticated;
create policy borradores_select on public.comprobante_borradores
  for select to authenticated using (owner_id = (select auth.uid()));
create policy borradores_insert on public.comprobante_borradores
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy borradores_update on public.comprobante_borradores
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create function public.touch_comprobante_borrador() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
create trigger touch_comprobante_borrador before update
  on public.comprobante_borradores for each row
  execute function public.touch_comprobante_borrador();
commit;
