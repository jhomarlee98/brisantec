import { supabase } from './supabase'

export type AppRole = 'admin' | 'contador' | 'usuario'

export type CompanyProfile = {
  id: string
  ruc: string
  razon_social: string
  nombre_comercial: string | null
}

export type SunatConfig = {
  id: string
  company_id: string
  environment: 'beta' | 'production'
  sol_username: string | null
  certificate_path: string | null
  certificate_expires_at: string | null
  active: boolean
}

export type DocumentSeries = {
  id: string
  document_type: '01' | '03' | '07' | '08'
  series: string
  current_number: number
  active: boolean
}

export async function getCurrentRole(): Promise<AppRole | null> {
  const { data, error } = await supabase.rpc('current_app_role')
  if (error) throw error
  return (data as AppRole | null) ?? null
}

export async function getSunatSettings() {
  const [{ data: company, error: companyError }, { data: config, error: configError }, { data: series, error: seriesError }] =
    await Promise.all([
      supabase.from('company_profile').select('id,ruc,razon_social,nombre_comercial').limit(1).maybeSingle(),
      supabase.from('sunat_config').select('id,company_id,environment,sol_username,certificate_path,certificate_expires_at,active').limit(1).maybeSingle(),
      supabase.from('document_series').select('id,document_type,series,current_number,active').order('document_type').order('series'),
    ])

  if (companyError) throw companyError
  if (configError) throw configError
  if (seriesError) throw seriesError

  return {
    company: company as CompanyProfile | null,
    config: config as SunatConfig | null,
    series: (series ?? []) as DocumentSeries[],
  }
}
