-- Emisión fiscal: documentos definitivos y reserva atómica de correlativos.
-- Factura (01) y boleta (03) comparten numeración segura, pero tienen ciclos SUNAT distintos.

create table if not exists public.electronic_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profile(id) on delete restrict,
  document_type varchar(2) not null check (document_type in ('01','03')),
  series varchar(4) not null,
  number bigint not null check (number > 0),
  issue_date date not null,
  currency varchar(3) not null check (currency in ('PEN','USD')),
  client_id uuid,
  content jsonb not null,
  taxable_amount numeric(14,2) not null default 0,
  igv_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  sunat_flow text not null check (sunat_flow in ('individual','daily_summary')),
  status text not null default 'issued'
    check (status in ('issued','pending_sunat','accepted','observed','rejected','voided','error')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document_type, series, number),
  check (
    (document_type = '01' and series ~ '^F[A-Z0-9]{3}$' and sunat_flow = 'individual')
    or
    (document_type = '03' and series ~ '^B[A-Z0-9]{3}$' and sunat_flow = 'daily_summary')
  )
);

create index if not exists idx_electronic_documents_issue_date
  on public.electronic_documents(company_id, issue_date);
create index if not exists idx_electronic_documents_status
  on public.electronic_documents(company_id, status);

alter table public.electronic_documents enable row level security;

create policy "authenticated read electronic documents"
on public.electronic_documents for select to authenticated
using (true);

-- La emisión definitiva no se habilita todavía desde el navegador.
-- Un backend/Edge Function validará el documento y llamará a reserve_document_number().

create or replace function public.reserve_document_number(
  p_company_id uuid,
  p_document_type varchar,
  p_series varchar
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
  v_role text;
begin
  v_role := public.current_app_role();

  if v_role not in ('admin','contador','usuario') then
    raise exception 'Usuario no autorizado para reservar correlativos';
  end if;

  if p_document_type not in ('01','03') then
    raise exception 'Tipo de documento no soportado';
  end if;

  if (p_document_type = '01' and p_series !~ '^F[A-Z0-9]{3}$')
     or (p_document_type = '03' and p_series !~ '^B[A-Z0-9]{3}$') then
    raise exception 'Serie incompatible con el tipo de documento';
  end if;

  update public.document_series
     set current_number = current_number + 1,
         updated_at = now()
   where company_id = p_company_id
     and document_type = p_document_type
     and series = p_series
     and active = true
  returning current_number into v_next;

  if v_next is null then
    raise exception 'Serie no configurada o inactiva';
  end if;

  return v_next;
end;
$$;

revoke all on function public.reserve_document_number(uuid, varchar, varchar) from public;
grant execute on function public.reserve_document_number(uuid, varchar, varchar) to authenticated;

comment on function public.reserve_document_number(uuid, varchar, varchar) is
'Incrementa y devuelve el siguiente correlativo de forma atómica. La emisión final debe invocarlo desde el flujo backend.';

alter table public.sunat_submissions
  add constraint sunat_submissions_document_fk
  foreign key (document_id) references public.electronic_documents(id) on delete cascade;
