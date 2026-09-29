import { supabase } from './supabase'

export type ClientDocumentType = 'RUC' | 'DNI'

export type Client = {
  id: string
  documentType: ClientDocumentType
  documentNumber: string
  name: string
  email: string
  phone: string
  addresses: string[]
}

type ClientRow = {
  id: string
  tipo_documento: ClientDocumentType
  numero_documento: string
  nombre: string
  email: string | null
  telefono: string | null
  cliente_direcciones?: Array<{
    direccion: string
    principal: boolean
  }>
}

function mapClient(row: ClientRow): Client {
  const addresses = [...(row.cliente_direcciones ?? [])]
    .sort((a, b) => Number(b.principal) - Number(a.principal))
    .map((item) => item.direccion)

  return {
    id: row.id,
    documentType: row.tipo_documento,
    documentNumber: row.numero_documento,
    name: row.nombre,
    email: row.email ?? '',
    phone: row.telefono ?? '',
    addresses,
  }
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      id,
      tipo_documento,
      numero_documento,
      nombre,
      email,
      telefono,
      cliente_direcciones (
        direccion,
        principal
      )
    `)
    .order('nombre', { ascending: true })

  if (error) throw error
  return (data as ClientRow[]).map(mapClient)
}

export async function createClient(input: Omit<Client, 'id'>): Promise<Client> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      tipo_documento: input.documentType,
      numero_documento: input.documentNumber,
      nombre: input.name,
      email: input.email || null,
      telefono: input.phone || null,
    })
    .select('id, tipo_documento, numero_documento, nombre, email, telefono')
    .single()

  if (error) throw error

  const addresses = input.addresses.filter(Boolean)
  if (addresses.length > 0) {
    const { error: addressError } = await supabase.from('cliente_direcciones').insert(
      addresses.map((direccion, index) => ({
        cliente_id: data.id,
        direccion,
        principal: index === 0,
      })),
    )

    if (addressError) {
      await supabase.from('clientes').delete().eq('id', data.id)
      throw addressError
    }
  }

  return {
    id: data.id,
    documentType: data.tipo_documento as ClientDocumentType,
    documentNumber: data.numero_documento,
    name: data.nombre,
    email: data.email ?? '',
    phone: data.telefono ?? '',
    addresses,
  }
}

export async function updateClient(id: string, input: Omit<Client, 'id'>): Promise<Client> {
  const { error } = await supabase
    .from('clientes')
    .update({
      tipo_documento: input.documentType,
      numero_documento: input.documentNumber,
      nombre: input.name,
      email: input.email || null,
      telefono: input.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error

  const { error: deleteAddressesError } = await supabase
    .from('cliente_direcciones')
    .delete()
    .eq('cliente_id', id)

  if (deleteAddressesError) throw deleteAddressesError

  const addresses = input.addresses.filter(Boolean)
  if (addresses.length > 0) {
    const { error: insertAddressesError } = await supabase.from('cliente_direcciones').insert(
      addresses.map((direccion, index) => ({
        cliente_id: id,
        direccion,
        principal: index === 0,
      })),
    )

    if (insertAddressesError) throw insertAddressesError
  }

  return { id, ...input, addresses }
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}
