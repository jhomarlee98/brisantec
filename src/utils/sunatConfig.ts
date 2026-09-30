import { supabase } from './supabase'

export type AppRole = 'admin' | 'contador' | 'usuario'
export type SunatEnvironment = 'beta' | 'production'
export type DocumentType = '01' | '03' | '07' | '08'

export type CompanyProfile = {
  id: string
  ruc: string
  razon_social: string
  nombre_comercial: string | null
}

export type SunatConfig = {
  id: string
  company_id: string
  environment: SunatEnvironment
  sol_username: string | null
  certificate_path: string | null
  certificate_expires_at: string | null
  active: boolean
}

export type DocumentSeries = {
  id: string
  document_type: DocumentType
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
  const [companyResult, configResult, seriesResult] = await Promise.all([
    supabase.from('company_profile').select('id,ruc,razon_social,nombre_comercial').limit(1).maybeSingle(),
    supabase.from('sunat_config').select('id,company_id,environment,sol_username,certificate_path,certificate_expires_at,active').limit(1).maybeSingle(),
    supabase.from('document_series').select('id,document_type,series,current_number,active').order('document_type').order('series'),
  ])

  if (companyResult.error) throw companyResult.error
  if (configResult.error) throw configResult.error
  if (seriesResult.error) throw seriesResult.error

  return {
    company: companyResult.data as CompanyProfile | null,
    config: configResult.data as SunatConfig | null,
    series: (seriesResult.data ?? []) as DocumentSeries[],
  }
}

export async function saveCompanyProfile(input: {
  ruc: string
  razonSocial: string
  nombreComercial: string
}): Promise<CompanyProfile> {
  const payload = {
    ruc: input.ruc.trim(),
    razon_social: input.razonSocial.trim(),
    nombre_comercial: input.nombreComercial.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing, error: lookupError } = await supabase
    .from('company_profile')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (lookupError) throw lookupError

  const result = existing
    ? await supabase.from('company_profile').update(payload).eq('id', existing.id).select('id,ruc,razon_social,nombre_comercial').single()
    : await supabase.from('company_profile').insert(payload).select('id,ruc,razon_social,nombre_comercial').single()

  if (result.error) throw result.error
  return result.data as CompanyProfile
}

export async function saveSunatEnvironment(companyId: string, environment: SunatEnvironment): Promise<SunatConfig> {
  const { data, error } = await supabase
    .from('sunat_config')
    .upsert(
      {
        company_id: companyId,
        environment,
        active: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' },
    )
    .select('id,company_id,environment,sol_username,certificate_path,certificate_expires_at,active')
    .single()

  if (error) throw error
  return data as SunatConfig
}

export async function saveDocumentSeries(
  companyId: string,
  input: { documentType: '01' | '03'; series: string; currentNumber: number },
): Promise<DocumentSeries> {
  const { data, error } = await supabase
    .from('document_series')
    .upsert(
      {
        company_id: companyId,
        document_type: input.documentType,
        series: input.series.trim().toUpperCase(),
        current_number: input.currentNumber,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,document_type,series' },
    )
    .select('id,document_type,series,current_number,active')
    .single()

  if (error) throw error
  return data as DocumentSeries
}
