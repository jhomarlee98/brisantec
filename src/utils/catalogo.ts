import { supabase } from './supabase'

export type CatalogItemType = 'PRODUCTO' | 'SERVICIO'

export type CatalogItem = {
  id: string
  type: CatalogItemType
  code: string
  description: string
  unit: string
  salePrice: number
}

type CatalogRow = {
  id: string
  tipo: CatalogItemType
  codigo: string | null
  descripcion: string
  unidad: string
  precio_venta: number | string
}

function mapCatalogItem(row: CatalogRow): CatalogItem {
  return {
    id: row.id,
    type: row.tipo,
    code: row.codigo ?? '',
    description: row.descripcion,
    unit: row.unidad,
    salePrice: Number(row.precio_venta),
  }
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('catalogo_items')
    .select('id, tipo, codigo, descripcion, unidad, precio_venta')
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
          precio_venta: input.salePrice,
          activo: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, tipo, codigo, descripcion, unidad, precio_venta')
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
      precio_venta: input.salePrice,
    })
    .select('id, tipo, codigo, descripcion, unidad, precio_venta')
    .single()

  if (error) throw error
  return mapCatalogItem(data as CatalogRow)
}


export async function updateCatalogItem(id: string, input: Omit<CatalogItem, 'id'>): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from('catalogo_items')
    .update({
      tipo: input.type,
      codigo: input.code.trim() || null,
      descripcion: input.description,
      unidad: input.unit,
      precio_venta: input.salePrice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, tipo, codigo, descripcion, unidad, precio_venta')
    .single()

  if (error) throw error
  return mapCatalogItem(data as CatalogRow)
}

export async function deactivateCatalogItem(id: string) {
  const { error } = await supabase
    .from('catalogo_items')
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}
