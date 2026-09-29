import { supabase } from './supabase'

export type CatalogItemType = 'PRODUCTO' | 'SERVICIO'

export type CatalogItem = {
  id: string
  type: CatalogItemType
  code: string
  description: string
  unit: string
  unitValue: number
  igvRate: number
}

type CatalogRow = {
  id: string
  tipo: CatalogItemType
  codigo: string | null
  descripcion: string
  unidad: string
  valor_unitario: number | string
  igv_rate: number | string
}

function mapCatalogItem(row: CatalogRow): CatalogItem {
  return {
    id: row.id,
    type: row.tipo,
    code: row.codigo ?? '',
    description: row.descripcion,
    unit: row.unidad,
    unitValue: Number(row.valor_unitario),
    igvRate: Number(row.igv_rate),
  }
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('catalogo_items')
    .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate')
    .eq('activo', true)
    .order('descripcion', { ascending: true })

  if (error) throw error
  return (data as CatalogRow[]).map(mapCatalogItem)
}

export async function saveCatalogItem(input: Omit<CatalogItem, 'id'>): Promise<CatalogItem> {
  const normalizedCode = input.code.trim() || null

  if (normalizedCode) {
    const { data: existing, error: findError } = await supabase
      .from('catalogo_items')
      .select('id')
      .eq('tipo', input.type)
      .eq('codigo', normalizedCode)
      .maybeSingle()

    if (findError) throw findError

    if (existing) {
      const { data, error } = await supabase
        .from('catalogo_items')
        .update({
          descripcion: input.description,
          unidad: input.unit,
          valor_unitario: input.unitValue,
          igv_rate: input.igvRate,
          activo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate')
        .single()

      if (error) throw error
      return mapCatalogItem(data as CatalogRow)
    }
  }

  const { data, error } = await supabase
    .from('catalogo_items')
    .insert({
      tipo: input.type,
      codigo: normalizedCode,
      descripcion: input.description,
      unidad: input.unit,
      valor_unitario: input.unitValue,
      igv_rate: input.igvRate,
    })
    .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate')
    .single()

  if (error) throw error
  return mapCatalogItem(data as CatalogRow)
}
