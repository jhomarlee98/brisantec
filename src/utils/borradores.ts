import { supabase } from './supabase'
import type { Installment } from './cuotas'

export type DraftItem = {
  id: number
  type: 'PRODUCTO' | 'SERVICIO'
  code?: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  igvRate: number
}
export type DraftContent = {
  version: 1
  documentType: '01' | '03'
  currency: 'PEN' | 'USD'
  paymentCondition: 'CONTADO' | 'CREDITO'
  issueDate: string
  clientId: string | null
  address: string
  purchaseOrder: string
  exchangeRate: string
  installments?: Installment[]
  items: DraftItem[]
}
export type Draft = { id: string; contenido: DraftContent; updated_at: string }

export async function listDrafts(): Promise<Draft[]> {
  const { data, error } = await supabase.from('comprobante_borradores')
    .select('id, contenido, updated_at').order('updated_at', { ascending: false })
  if (error) throw error
  return data as Draft[]
}

export async function saveDraft(id: string, contenido: DraftContent): Promise<Draft> {
  const { data, error } = await supabase.from('comprobante_borradores')
    .upsert({ id, contenido }, { onConflict: 'id' })
    .select('id, contenido, updated_at').single()
  if (error) throw error
  return data as Draft
}

export async function getDraft(id: string): Promise<Draft | null> {
  const { data, error } = await supabase.from('comprobante_borradores')
    .select('id, contenido, updated_at').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Draft | null
}

export async function deleteDraft(id: string): Promise<void> {
  const { data, error } = await supabase.from('comprobante_borradores')
    .delete().eq('id', id).select('id')
  if (error) throw error
  if (data.length !== 1) throw new Error('No se encontró el borrador o no tienes permiso para eliminarlo.')
}
