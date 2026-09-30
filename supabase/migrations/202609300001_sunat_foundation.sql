-- Base reutilizable por empresa: perfil, roles y configuración SUNAT.
create extension if not exists pgcrypto;

create table if not exists public.company_profile (
  id uuid primary key default gen_random_uuid(),
  ruc varchar(11) not null unique check (ruc ~ '^[0-9]{11}$'),
  razon_social text not null,
  nombre_comercial text,
  direccion_fiscal text,
  ubigeo varchar(6),
  telefono text,
  email text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','contador','usuario')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create table if not exists public.sunat_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.company_profile(id) on delete cascade,
  environment text not null default 'beta' check (environment in ('beta','production')),
  sol_username text,
  -- No guardar SOL password ni password del certificado en esta tabla.
  certificate_path text,
  certificate_expires_at date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_series (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profile(id) on delete cascade,
  document_type varchar(2) not null check (document_type in ('01','03','07','08')),
  series varchar(4) not null check (series ~ '^[FBN][A-Z0-9]{3}$'),
  current_number bigint not null default 0 check (current_number >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document_type, series)
);

create table if not exists public.sunat_submissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid,
  environment text not null check (environment in ('beta','production')),
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'pending' check (status in ('pending','sent','accepted','observed','rejected','error')),
  sunat_code text,
  sunat_message text,
  xml_path text,
  cdr_path text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sunat_submissions_document_id on public.sunat_submissions(document_id);
create index if not exists idx_sunat_submissions_status on public.sunat_submissions(status);
create index if not exists idx_document_series_company_id on public.document_series(company_id);

alter table public.company_profile enable row level security;
alter table public.user_roles enable row level security;
alter table public.sunat_config enable row level security;
alter table public.document_series enable row level security;
alter table public.sunat_submissions enable row level security;

create policy "authenticated read company profile"
on public.company_profile for select to authenticated
using (true);

create policy "admin accountant manage company profile"
on public.company_profile for all to authenticated
using (public.current_app_role() in ('admin','contador'))
with check (public.current_app_role() in ('admin','contador'));

create policy "user reads own role"
on public.user_roles for select to authenticated
using (user_id = auth.uid());

create policy "admin manages roles"
on public.user_roles for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admin accountant read sunat config"
on public.sunat_config for select to authenticated
using (public.current_app_role() in ('admin','contador'));

create policy "admin accountant manage sunat config"
on public.sunat_config for all to authenticated
using (public.current_app_role() in ('admin','contador'))
with check (public.current_app_role() in ('admin','contador'));

create policy "authenticated read document series"
on public.document_series for select to authenticated
using (true);

create policy "admin accountant manage document series"
on public.document_series for all to authenticated
using (public.current_app_role() in ('admin','contador'))
with check (public.current_app_role() in ('admin','contador'));

create policy "admin accountant read sunat submissions"
on public.sunat_submissions for select to authenticated
using (public.current_app_role() in ('admin','contador'));

-- Los inserts/updates de sunat_submissions se harán desde backend/Edge Function
-- con service role; no se concede escritura directa al navegador.

comment on table public.sunat_config is
'Configuración no secreta de SUNAT. Las contraseñas SOL/certificado deben vivir en secretos del backend.';

comment on table public.sunat_submissions is
'Historial auditable de intentos de envío a SUNAT; escritura reservada al backend.';
