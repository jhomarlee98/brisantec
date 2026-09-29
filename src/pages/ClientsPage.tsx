import { ArrowLeft, Building2, MapPin, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient, deleteClient, listClients, updateClient, type Client, type ClientDocumentType } from '../utils/clientes'

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    documentType: 'RUC' as ClientDocumentType,
    documentNumber: '',
    name: '',
    email: '',
    phone: '',
    addresses: [''],
  })

  useEffect(() => {
    let active = true

    listClients()
      .then((data) => {
        if (active) setClients(data)
      })
      .catch((error) => {
        console.error(error)
        if (active) setPageError('No se pudieron cargar los clientes. Revisa las políticas de Supabase.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return clients

    return clients.filter((client) =>
      [client.documentNumber, client.name, client.email, client.phone, ...client.addresses]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [clients, search])

  function openNewClient() {
    setEditingId(null)
    setDraft({
      documentType: 'RUC',
      documentNumber: '',
      name: '',
      email: '',
      phone: '',
      addresses: [''],
    })
    setFormOpen(true)
  }

  function openEditClient(client: Client) {
    setEditingId(client.id)
    setDraft({
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      name: client.name,
      email: client.email,
      phone: client.phone,
      addresses: client.addresses.length ? client.addresses : [''],
    })
    setFormOpen(true)
  }

  function updateAddress(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) => (addressIndex === index ? value : address)),
    }))
  }

  function addAddress() {
    setDraft((current) => ({ ...current, addresses: [...current.addresses, ''] }))
  }

  function removeAddress(index: number) {
    setDraft((current) => ({
      ...current,
      addresses:
        current.addresses.length === 1
          ? ['']
          : current.addresses.filter((_, addressIndex) => addressIndex !== index),
    }))
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const documentNumber = draft.documentNumber.trim()
    const name = draft.name.trim()
    const addresses = draft.addresses.map((address) => address.trim()).filter(Boolean)
    const expectedLength = draft.documentType === 'RUC' ? 11 : 8

    if (!/^\d+$/.test(documentNumber) || documentNumber.length !== expectedLength || !name) {
      return
    }

    setSaving(true)
    setPageError('')

    try {
      const payload = {
        documentType: draft.documentType,
        documentNumber,
        name,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        addresses,
      }

      if (editingId === null) {
        const created = await createClient(payload)
        setClients((current) => [created, ...current])
      } else {
        const updated = await updateClient(editingId, payload)
        setClients((current) => current.map((client) => (client.id === editingId ? updated : client)))
      }

      setFormOpen(false)
    } catch (error) {
      console.error(error)
      setPageError('No se pudo guardar el cliente. Verifica que el documento no esté duplicado y que RLS permita la operación.')
    } finally {
      setSaving(false)
    }
  }

  async function removeClient(id: string) {
    setPageError('')

    try {
      await deleteClient(id)
      setClients((current) => current.filter((client) => client.id !== id))
    } catch (error) {
      console.error(error)
      setPageError('No se pudo eliminar el cliente.')
    }
  }

  const expectedDocumentLength = draft.documentType === 'RUC' ? 11 : 8
  const validDocument =
    /^\d+$/.test(draft.documentNumber) && draft.documentNumber.length === expectedDocumentLength

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
              aria-label="Volver"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="font-semibold leading-none text-slate-950">Clientes</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">Personas y empresas para facturas y boletas</p>
            </div>
          </div>

          <button
            onClick={openNewClient}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Nuevo cliente
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1536px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div>
          <p className="text-sm font-semibold text-blue-600">Directorio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Gestiona tus clientes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Registra RUC o DNI, datos de contacto y varias direcciones para reutilizarlos al emitir comprobantes.
          </p>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por RUC, DNI, nombre, correo, teléfono o dirección..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {pageError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
              {pageError}
            </div>
          )}

          {loading ? (
            <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
              <div>
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="mt-3 text-sm text-slate-500">Cargando clientes...</p>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="grid min-h-80 place-items-center px-6 py-12 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <UserRound className="size-7" />
                </div>
                <h2 className="mt-4 font-semibold text-slate-900">
                  {clients.length === 0 ? 'Aún no hay clientes registrados' : 'No se encontraron clientes'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {clients.length === 0
                    ? 'Agrega el primer cliente para tener sus datos disponibles al momento de emitir una factura o boleta.'
                    : 'Prueba con otro número de documento, nombre o dirección.'}
                </p>
                {clients.length === 0 && (
                  <button
                    onClick={openNewClient}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="size-4" />
                    Registrar cliente
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <article key={client.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {client.documentType}
                        </span>
                        <span className="text-sm font-medium text-slate-500">{client.documentNumber}</span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-slate-950">{client.name}</h2>

                      <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <p>{client.email || 'Sin correo registrado'}</p>
                        <p>{client.phone || 'Sin teléfono registrado'}</p>
                      </div>

                      <div className="mt-4 space-y-2">
                        {client.addresses.length > 0 ? (
                          client.addresses.map((address, index) => (
                            <div key={`${client.id}-${index}`} className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                              <span>{address}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400">Sin direcciones registradas</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openEditClient(client)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => removeClient(client.id)}
                        className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar cliente"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          onMouseDown={() => setFormOpen(false)}
        >
          <form
            onSubmit={saveClient}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {editingId === null ? 'Nuevo cliente' : 'Editar cliente'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Guarda los datos tributarios y las direcciones que utilizarás en los comprobantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Tipo de documento</span>
                  <select
                    value={draft.documentType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        documentType: event.target.value as ClientDocumentType,
                        documentNumber: '',
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{draft.documentType}</span>
                  <input
                    inputMode="numeric"
                    maxLength={expectedDocumentLength}
                    value={draft.documentNumber}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        documentNumber: event.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder={draft.documentType === 'RUC' ? '20600670949' : '71234567'}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {draft.documentType === 'RUC' ? 'Razón social' : 'Nombres y apellidos'}
                </span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder={draft.documentType === 'RUC' ? 'Empresa SAC' : 'Nombre completo'}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Correo</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="cliente@empresa.com"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Teléfono</span>
                  <input
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="999 999 999"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Direcciones</p>
                    <p className="mt-1 text-xs text-slate-400">Puedes registrar varias y elegir una al emitir el comprobante.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addAddress}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {draft.addresses.map((address, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={address}
                          onChange={(event) => updateAddress(index, event.target.value)}
                          placeholder="Dirección fiscal o sede"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar dirección"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !validDocument || !draft.name.trim()}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId === null ? 'Guardar cliente' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
