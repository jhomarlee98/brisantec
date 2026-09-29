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
  priceIncludesIgv: boolean
}

type CatalogRow = {
  id: string
  tipo: CatalogItemType
  codigo: string | null
  descripcion: string
  unidad: string
  valor_unitario: number | string
  igv_rate: number | string
  precio_incluye_igv: boolean
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
    priceIncludesIgv: row.precio_incluye_igv,
  }
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('catalogo_items')
    .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate, precio_incluye_igv')
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
          precio_incluye_igv: input.priceIncludesIgv,
          activo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate, precio_incluye_igv')
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
      precio_incluye_igv: input.priceIncludesIgv,
    })
    .select('id, tipo, codigo, descripcion, unidad, valor_unitario, igv_rate, precio_incluye_igv')
    .single()

  if (error) throw error
  return mapCatalogItem(data as CatalogRow)
}
