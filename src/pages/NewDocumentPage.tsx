import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Package,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Wrench,
  X,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient, listClients, type Client, type ClientDocumentType } from '../utils/clientes'

type DocumentType = '01' | '03'
type Currency = 'PEN' | 'USD'
type PaymentCondition = 'CONTADO' | 'CREDITO'
type ItemType = 'PRODUCTO' | 'SERVICIO'
type Item = {
  id: number
  type: ItemType
  code?: string
  description: string
  unit: string
  quantity: number
  unitValue: number
  igvRate: number
  saveToCatalog?: boolean
}

const initialItems: Item[] = [
  {
    id: 1,
    type: 'PRODUCTO',
    description: 'ESPÁRRAGO DE ARO Y CAMBIO CAC-888',
    unit: 'UNIDAD',
    quantity: 2,
    unitValue: 13.42,
    igvRate: 0.18,
  },
]

export default function NewDocumentPage() {
  const navigate = useNavigate()
  const [documentType, setDocumentType] = useState<DocumentType>('01')
  const [currency, setCurrency] = useState<Currency>('PEN')
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>('CONTADO')
  const [items, setItems] = useState<Item[]>(initialItems)
  const [clients, setClients] = useState<Client[]>([])
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientSaving, setClientSaving] = useState(false)
  const [clientError, setClientError] = useState('')
  const [clientDraft, setClientDraft] = useState({
    documentType: 'RUC' as ClientDocumentType,
    documentNumber: '',
    name: '',
    email: '',
    phone: '',
    addresses: [''],
  })
  const [itemTypeDialogOpen, setItemTypeDialogOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [itemDraft, setItemDraft] = useState({
    type: 'PRODUCTO' as ItemType,
    code: '',
    description: '',
    unit: 'UNIDAD',
    quantity: '1',
    unitValue: '',
    igvRate: '18',
    saveToCatalog: true,
  })

  useEffect(() => {
    let active = true

    listClients()
      .then((data) => {
        if (active) setClients(data)
      })
      .catch((error) => {
        console.error(error)
        if (active) setClientError('No se pudieron cargar los clientes desde Supabase.')
      })
      .finally(() => {
        if (active) setClientsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const totals = useMemo(() => {
    const taxable = items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0)
    const igv = items.reduce((sum, item) => sum + item.quantity * item.unitValue * item.igvRate, 0)
    return {
      taxable,
      igv,
      total: taxable + igv,
    }
  }, [items])

  const currencySymbol = currency === 'PEN' ? 'S/' : '$'
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null
  const filteredClients = clients.filter((client) => {
    const query = clientQuery.trim().toLowerCase()
    if (!query) return false

    return [client.documentNumber, client.name, client.email ?? '', client.phone ?? '']
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  function openQuickClient() {
    const inferredType: ClientDocumentType = documentType === '01' ? 'RUC' : 'DNI'
    setClientDraft({
      documentType: inferredType,
      documentNumber: /^\d+$/.test(clientQuery.trim()) ? clientQuery.trim() : '',
      name: '',
      email: '',
      phone: '',
      addresses: [''],
    })
    setClientFormOpen(true)
  }

  function selectClient(client: Client) {
    setSelectedClientId(client.id)
    setClientQuery(client.documentNumber)
    setSelectedAddress(client.addresses[0] ?? '')
  }

  function updateClientAddress(index: number, value: string) {
    setClientDraft((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) =>
        addressIndex === index ? value : address,
      ),
    }))
  }

  function addClientAddress() {
    setClientDraft((current) => ({ ...current, addresses: [...current.addresses, ''] }))
  }

  function removeClientAddress(index: number) {
    setClientDraft((current) => ({
      ...current,
      addresses:
        current.addresses.length === 1
          ? ['']
          : current.addresses.filter((_, addressIndex) => addressIndex !== index),
    }))
  }

  async function saveQuickClient() {
    const expectedLength = clientDraft.documentType === 'RUC' ? 11 : 8
    const documentNumber = clientDraft.documentNumber.trim()
    const name = clientDraft.name.trim()

    if (!/^\d+$/.test(documentNumber) || documentNumber.length !== expectedLength || !name) {
      return
    }

    const existingClient = clients.find(
      (client) =>
        client.documentType === clientDraft.documentType &&
        client.documentNumber === documentNumber,
    )

    if (existingClient) {
      selectClient(existingClient)
      setClientFormOpen(false)
      return
    }

    setClientSaving(true)
    setClientError('')

    try {
      const newClient = await createClient({
        documentType: clientDraft.documentType,
        documentNumber,
        name,
        email: clientDraft.email.trim(),
        phone: clientDraft.phone.trim(),
        addresses: clientDraft.addresses.map((address) => address.trim()).filter(Boolean),
      })

      setClients((current) => [newClient, ...current])
      setSelectedClientId(newClient.id)
      setClientQuery(newClient.documentNumber)
      setSelectedAddress(newClient.addresses[0] ?? '')
      setClientFormOpen(false)
    } catch (error) {
      console.error(error)
      setClientError('No se pudo registrar el cliente. Verifica que el documento no exista y que RLS permita insertar.')
    } finally {
      setClientSaving(false)
    }
  }

  function startNewItem(type: ItemType) {
    setItemDraft({
      type,
      code: '',
      description: '',
      unit: type === 'PRODUCTO' ? 'UNIDAD' : 'SERVICIO',
      quantity: '1',
      unitValue: '',
      igvRate: '18',
      saveToCatalog: true,
    })
    setEditingItemId(null)
    setItemTypeDialogOpen(false)
    setItemFormOpen(true)
  }

  function startEditItem(item: Item) {
    setEditingItemId(item.id)
    setItemDraft({
      type: item.type,
      code: item.code ?? '',
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      unitValue: String(item.unitValue),
      igvRate: String(Math.round(item.igvRate * 100)),
      saveToCatalog: item.saveToCatalog ?? false,
    })
    setItemFormOpen(true)
  }

  function saveNewItem() {
    const description = itemDraft.description.trim()
    const quantity = Number(itemDraft.quantity)
    const unitValue = Number(itemDraft.unitValue)
    const igvRate = Number(itemDraft.igvRate) / 100

    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitValue) || unitValue < 0) {
      return
    }

    if (editingItemId !== null) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                type: itemDraft.type,
                code: itemDraft.code.trim() || undefined,
                description,
                unit: itemDraft.unit,
                quantity,
                unitValue,
                igvRate,
                saveToCatalog: itemDraft.saveToCatalog,
              }
            : item,
        ),
      )
    } else {
      setItems((current) => [
        ...current,
        {
          id: Date.now(),
          type: itemDraft.type,
          code: itemDraft.code.trim() || undefined,
          description,
          unit: itemDraft.unit,
          quantity,
          unitValue,
          igvRate,
          saveToCatalog: itemDraft.saveToCatalog,
        },
      ])
    }

    setEditingItemId(null)
    setItemFormOpen(false)
  }

  const products = items.filter((item) => item.type === 'PRODUCTO')
  const services = items.filter((item) => item.type === 'SERVICIO')

  function removeItem(id: number) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-28 lg:pb-10">
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
              <p className="font-semibold leading-none text-slate-950">Nuevo comprobante</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">BRISANTEC · Facturación electrónica</p>
            </div>
          </div>

          <button className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
            <Save className="size-4" />
            Guardar borrador
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1536px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Section title="Comprobante" subtitle="Define el tipo de documento, fecha y moneda.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Tipo de comprobante">
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as DocumentType)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="01">Factura electrónica</option>
                    <option value="03">Boleta electrónica</option>
                  </select>
                </Field>

                <Field label="Fecha de emisión">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      defaultValue="2026-09-28"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </Field>

                <Field label="Moneda">
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as Currency)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section
              title="Cliente"
              subtitle="Busca un cliente existente o regístralo aquí mismo sin salir del comprobante."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={clientQuery}
                    onChange={(event) => {
                      setClientQuery(event.target.value)
                      setSelectedClientId(null)
                      setSelectedAddress('')
                    }}
                    placeholder="Buscar por RUC, DNI o nombre..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={openQuickClient}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="size-4" />
                  Nuevo cliente
                </button>
              </div>

              {clientError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {clientError}
                </div>
              )}

              {clientsLoading && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Cargando clientes...
                </div>
              )}

              {!clientsLoading && !selectedClient && clientQuery.trim() && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {filteredClients.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {filteredClients.slice(0, 5).map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => selectClient(client)}
                          className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {client.documentType} {client.documentNumber}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600">Seleccionar</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Cliente no registrado</p>
                        <p className="mt-1 text-xs text-slate-500">Puedes registrarlo sin salir de este comprobante.</p>
                      </div>
                      <button
                        type="button"
                        onClick={openQuickClient}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Plus className="size-3.5" />
                        Registrar cliente
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedClient && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                          {selectedClient.documentType} {selectedClient.documentNumber}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold text-slate-950">{selectedClient.name}</p>
                      {(selectedClient.email || selectedClient.phone) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {[selectedClient.email, selectedClient.phone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId(null)
                        setClientQuery('')
                        setSelectedAddress('')
                      }}
                      className="text-xs font-semibold text-blue-700"
                    >
                      Cambiar cliente
                    </button>
                  </div>

                  <div className="mt-4">
                    <Field label="Dirección para este comprobante">
                      {selectedClient.addresses.length > 1 ? (
                        <select
                          value={selectedAddress}
                          onChange={(event) => setSelectedAddress(event.target.value)}
                          className="h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          {selectedClient.addresses.map((address) => (
                            <option key={address} value={address}>{address}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <input
                            value={selectedAddress}
                            onChange={(event) => setSelectedAddress(event.target.value)}
                            placeholder="Dirección para el comprobante"
                            className="h-11 w-full rounded-xl border border-blue-100 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                      )}
                    </Field>
                  </div>
                </div>
              )}
            </Section>

            <Section
              title="Detalle del comprobante"
              subtitle="Productos y servicios se administran por separado. Los precios se ingresan sin IGV."
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Buscar en productos o servicios..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <button
                  onClick={() => setItemTypeDialogOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="size-4" />
                  Agregar
                </button>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <ItemGroup
                  title="Productos"
                  icon={Package}
                  items={products}
                  currencySymbol={currencySymbol}
                  emptyText="Aún no has agregado productos."
                  onAdd={() => startNewItem('PRODUCTO')}
                  onEdit={startEditItem}
                  onRemove={removeItem}
                />
                <ItemGroup
                  title="Servicios"
                  icon={Wrench}
                  items={services}
                  currencySymbol={currencySymbol}
                  emptyText="Aún no has agregado servicios."
                  onAdd={() => startNewItem('SERVICIO')}
                  onEdit={startEditItem}
                  onRemove={removeItem}
                />
              </div>
            </Section>

            <Section title="Pago y datos adicionales" subtitle="La orden de compra es opcional.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Condición de pago">
                  <select
                    value={paymentCondition}
                    onChange={(event) => setPaymentCondition(event.target.value as PaymentCondition)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </Field>

                <Field label="Orden de compra (opcional)">
                  <input
                    placeholder="Ej. OC-2026-001"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              {paymentCondition === 'CREDITO' && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">Venta a crédito</p>
                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    En la siguiente iteración agregaremos las cuotas y fechas de vencimiento.
                  </p>
                </div>
              )}
            </Section>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  {documentType === '01' ? <FileText className="size-5" /> : <Receipt className="size-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {documentType === '01' ? 'Factura electrónica' : 'Boleta electrónica'}
                  </p>
                  <p className="text-xs text-slate-500">Vista previa del resumen</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
                <SummaryRow label="Op. gravada" value={`${currencySymbol} ${totals.taxable.toFixed(2)}`} />
                <SummaryRow label="IGV (18%)" value={`${currencySymbol} ${totals.igv.toFixed(2)}`} />
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <span className="font-semibold text-slate-700">Total</span>
                    <span className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      {currencySymbol} {totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {currency === 'USD' && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CircleDollarSign className="size-4" />
                    Tipo de cambio
                  </div>
                  <input
                    inputMode="decimal"
                    placeholder="Ej. 3.45"
                    className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    El sistema sugerirá un valor, pero el usuario podrá fijar el tipo de cambio utilizado.
                  </p>
                </div>
              )}

              <button className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                Emitir {documentType === '01' ? 'factura' : 'boleta'}
              </button>

              <button className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:hidden">
                <Save className="size-4" />
                Guardar borrador
              </button>
            </div>
          </aside>
        </div>
      </main>

      {clientFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          onMouseDown={() => setClientFormOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Registrar cliente</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Se guardará y quedará seleccionado automáticamente en este comprobante.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClientFormOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <Field label="Tipo de documento">
                  <select
                    value={clientDraft.documentType}
                    onChange={(event) =>
                      setClientDraft((current) => ({
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
                </Field>

                <Field label={clientDraft.documentType}>
                  <input
                    inputMode="numeric"
                    maxLength={clientDraft.documentType === 'RUC' ? 11 : 8}
                    value={clientDraft.documentNumber}
                    onChange={(event) =>
                      setClientDraft((current) => ({
                        ...current,
                        documentNumber: event.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder={clientDraft.documentType === 'RUC' ? '20600670949' : '71234567'}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              <Field label={clientDraft.documentType === 'RUC' ? 'Razón social' : 'Nombres y apellidos'}>
                <input
                  value={clientDraft.name}
                  onChange={(event) => setClientDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder={clientDraft.documentType === 'RUC' ? 'Empresa SAC' : 'Nombre completo'}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Correo (opcional)">
                  <input
                    type="email"
                    value={clientDraft.email}
                    onChange={(event) => setClientDraft((current) => ({ ...current, email: event.target.value }))}
                    placeholder="cliente@empresa.com"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>

                <Field label="Teléfono (opcional)">
                  <input
                    inputMode="tel"
                    value={clientDraft.phone}
                    onChange={(event) => setClientDraft((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="999 999 999"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Direcciones</p>
                    <p className="mt-1 text-xs text-slate-400">Puedes guardar más de una dirección.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addClientAddress}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {clientDraft.addresses.map((address, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={address}
                          onChange={(event) => updateClientAddress(index, event.target.value)}
                          placeholder="Dirección fiscal o sede"
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClientAddress(index)}
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
                onClick={() => setClientFormOpen(false)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveQuickClient}
                disabled={
                  clientSaving ||
                  !clientDraft.name.trim() ||
                  !/^\d+$/.test(clientDraft.documentNumber) ||
                  clientDraft.documentNumber.length !== (clientDraft.documentType === 'RUC' ? 11 : 8)
                }
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clientSaving ? 'Guardando...' : 'Guardar y seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {itemTypeDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          onMouseDown={() => setItemTypeDialogOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">¿Qué deseas agregar?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Selecciona si el nuevo ítem corresponde a un producto o a un servicio.
                </p>
              </div>
              <button
                onClick={() => setItemTypeDialogOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => startNewItem('PRODUCTO')}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Package className="size-5" />
                </div>
                <p className="mt-4 font-semibold text-slate-950">Producto</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">Bien físico, repuesto, material o artículo.</p>
              </button>

              <button
                onClick={() => startNewItem('SERVICIO')}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Wrench className="size-5" />
                </div>
                <p className="mt-4 font-semibold text-slate-950">Servicio</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">Trabajo, instalación, mantenimiento u otro servicio.</p>
              </button>
            </div>
          </div>
        </div>
      )}
      {itemFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          onMouseDown={() => setItemFormOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  {itemDraft.type === 'PRODUCTO' ? <Package className="size-5" /> : <Wrench className="size-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {editingItemId !== null ? 'Editar' : 'Nuevo'} {itemDraft.type === 'PRODUCTO' ? 'producto' : 'servicio'}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Completa los datos que se mostrarán en el comprobante. La emisión no depende de existencias o stock.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setItemFormOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                <Field label="Código interno (opcional)">
                  <input
                    value={itemDraft.code}
                    onChange={(event) => setItemDraft((current) => ({ ...current, code: event.target.value }))}
                    placeholder={itemDraft.type === 'PRODUCTO' ? 'Ej. 90803' : 'Ej. SRV-001'}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>

                <Field label={itemDraft.type === 'PRODUCTO' ? 'Nombre / descripción del producto' : 'Descripción del servicio'}>
                  <input
                    value={itemDraft.description}
                    onChange={(event) => setItemDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder={itemDraft.type === 'PRODUCTO' ? 'Ej. Espárrago de aro y cambio CAC-888' : 'Ej. Servicio de cambio de llantas'}
                    autoFocus
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Unidad">
                  <select
                    value={itemDraft.unit}
                    onChange={(event) => setItemDraft((current) => ({ ...current, unit: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="SERVICIO">Servicio</option>
                    <option value="HORA">Hora</option>
                    <option value="DIA">Día</option>
                    <option value="METRO">Metro</option>
                    <option value="KILOGRAMO">Kilogramo</option>
                  </select>
                </Field>

                <Field label="Cantidad">
                  <input
                    inputMode="decimal"
                    value={itemDraft.quantity}
                    onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>

                <Field label={`Valor unitario (${currencySymbol})`}>
                  <input
                    inputMode="decimal"
                    value={itemDraft.unitValue}
                    onChange={(event) => setItemDraft((current) => ({ ...current, unitValue: event.target.value }))}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>

                <Field label="IGV">
                  <select
                    value={itemDraft.igvRate}
                    onChange={(event) => setItemDraft((current) => ({ ...current, igvRate: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="18">Gravado - 18%</option>
                    <option value="0">0% (preparado para otras afectaciones)</option>
                  </select>
                </Field>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={itemDraft.saveToCatalog}
                    onChange={(event) => setItemDraft((current) => ({ ...current, saveToCatalog: event.target.checked }))}
                    className="mt-1 size-4 rounded border-slate-300 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Guardar en el catálogo</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Si lo desmarcas, este {itemDraft.type === 'PRODUCTO' ? 'producto' : 'servicio'} se usará únicamente en este comprobante.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <ClipboardList className="size-4" />
                  Vista previa del cálculo
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-blue-600">Valor venta</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitValue) || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">IGV</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {(((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitValue) || 0)) * ((Number(itemDraft.igvRate) || 0) / 100)).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">Total</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {(((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitValue) || 0)) * (1 + ((Number(itemDraft.igvRate) || 0) / 100))).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                onClick={() => setItemFormOpen(false)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveNewItem}
                disabled={!itemDraft.description.trim() || Number(itemDraft.quantity) <= 0 || Number(itemDraft.unitValue) < 0 || itemDraft.unitValue === ''}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingItemId !== null ? 'Guardar cambios' : `Agregar ${itemDraft.type === 'PRODUCTO' ? 'producto' : 'servicio'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemGroup({
  title,
  icon: Icon,
  items,
  currencySymbol,
  emptyText,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string
  icon: typeof Package
  items: Item[]
  currencySymbol: string
  emptyText: string
  onAdd: () => void
  onEdit: (item: Item) => void
  onRemove: (id: number) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-400">{items.length} ítem{items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="size-3.5" />
          Agregar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-slate-500">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {items.map((item) => {
            const lineTotal = item.quantity * item.unitValue * (1 + item.igvRate)
            return (
              <article key={item.id} className="bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold leading-5 text-slate-900">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.code ? `${item.code} · ` : ''}{item.unit}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onEdit(item)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Editar ${item.type.toLowerCase()}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Eliminar ${item.type.toLowerCase()}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Cantidad</p>
                    <p className="mt-1 font-medium text-slate-800">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Valor unit.</p>
                    <p className="mt-1 font-medium text-slate-800">{currencySymbol} {item.unitValue.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Importe</p>
                    <p className="mt-1 font-semibold text-slate-950">{currencySymbol} {lineTotal.toFixed(2)}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}
