import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Eye,
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient, listClients, type Client, type ClientDocumentType } from '../utils/clientes'
import { listCatalogItems, saveCatalogItem, type CatalogItem } from '../utils/catalogo'

import { listDrafts, saveDraft, type Draft, type DraftContent } from '../utils/borradores'

import DocumentPreview from '../components/DocumentPreview'

import { draftSnapshot } from '../utils/draftSnapshot'

import { reviewInstallments, type Installment } from '../utils/cuotas'

type DocumentType = '01' | '03'
type Currency = 'PEN' | 'USD'
type PaymentCondition = 'CONTADO' | 'CREDITO'
type ItemType = 'PRODUCTO' | 'SERVICIO'
const DEFAULT_IGV_RATE = 0.18
type Item = {
  id: number
  type: ItemType
  code?: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  igvRate: number
}

export default function NewDocumentPage({ initialDraft, initialClients = [] }: { initialDraft?: Draft; initialClients?: Client[] }) {
  const initial = initialDraft?.contenido
  const initialClient = initialClients.find((client) => client.id === initial?.clientId)
  const incompatibleInitialClient = initial?.documentType === '01' && initialClient?.documentType === 'DNI'

  const navigate = useNavigate()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftId, setDraftId] = useState<string>(() => initialDraft?.id ?? crypto.randomUUID())
  const [issueDate, setIssueDate] = useState(() => initial?.issueDate ?? new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()))
  const [purchaseOrder, setPurchaseOrder] = useState(initial?.purchaseOrder ?? '')
  const [exchangeRate, setExchangeRate] = useState(initial?.exchangeRate ?? '')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftLoading, setDraftLoading] = useState(true)
  const [draftError, setDraftError] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const saveLock = useRef(false)
  const [savedContent, setSavedContent] = useState(() => initial ? draftSnapshot({ ...initial, installments: initial.installments ?? [] }) : '')

  useEffect(() => {
    let active = true
    listDrafts().then((data) => { if (active) setDrafts(data) })
      .catch(() => { if (active) setDraftError('No se pudieron cargar los borradores. Intenta nuevamente; si persiste, contacta al administrador.') })
      .finally(() => { if (active) setDraftLoading(false) })
    return () => { active = false }
  }, [])

  const [documentType, setDocumentType] = useState<DocumentType>(initial?.documentType ?? '01')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'PEN')
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>(initial?.paymentCondition ?? 'CONTADO')
  const [installments, setInstallments] = useState<Installment[]>(initial?.installments ?? [])
  const [items, setItems] = useState<Item[]>(initial?.items ?? [])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [clientQuery, setClientQuery] = useState(incompatibleInitialClient ? '' : initialClient?.documentNumber ?? '')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(incompatibleInitialClient ? null : initial?.clientId ?? null)
  const [selectedAddress, setSelectedAddress] = useState(incompatibleInitialClient ? '' : initial?.address ?? '')
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(!initialDraft)
  const [clientSaving, setClientSaving] = useState(false)
  const [clientError, setClientError] = useState(incompatibleInitialClient ? 'Este borrador de factura tenía un cliente con DNI. Selecciona un cliente con RUC.' : '')
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
    unitPrice: '',
    saveToCatalog: true,
  })

  useEffect(() => {
    let active = true

    if (initialDraft) return () => { active = false }

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
  }, [initialDraft])

  useEffect(() => {
    let active = true

    listCatalogItems()
      .then((data) => {
        if (active) setCatalogItems(data)
      })
      .catch((error) => {
        console.error(error)
        if (active) setCatalogError('No se pudo cargar el catálogo desde Supabase.')
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const lineTotal = item.quantity * item.unitPrice
        const lineTaxable = item.igvRate > 0 ? lineTotal / (1 + item.igvRate) : lineTotal
        const lineIgv = lineTotal - lineTaxable

        return {
          taxable: acc.taxable + lineTaxable,
          igv: acc.igv + lineIgv,
          total: acc.total + lineTotal,
        }
      },
      { taxable: 0, igv: 0, total: 0 },
    )
  }, [items])

  const installmentReview = reviewInstallments(installments, issueDate, totals.total)

  const currencySymbol = currency === 'PEN' ? 'S/' : '$'
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null
  const filteredCatalogItems = catalogItems.filter((catalogItem) => {
    const query = catalogQuery.trim().toLowerCase()
    if (!query) return false

    return [catalogItem.code, catalogItem.description, catalogItem.type]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  const filteredClients = clients.filter((client) => {
    const query = clientQuery.trim().toLowerCase()
    if (!query) return false

    return [client.documentNumber, client.name, client.email ?? '', client.phone ?? '']
      .join(' ')
      .toLowerCase()
      .includes(query)
  })

  function openQuickClient() {
    setClientError('')
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
    if (documentType === '01' && client.documentType !== 'RUC') {
      setClientError('Estás generando una factura: usa un cliente con RUC.')
      return
    }
    setClientError('')
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
    if (documentType === '01' && clientDraft.documentType !== 'RUC') {
      setClientError('Estás generando una factura: usa RUC y razón social.')
      return
    }
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
      unitPrice: '',
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
      unitPrice: String(item.unitPrice),
      saveToCatalog: false,
    })
    setItemFormOpen(true)
  }

  async function saveNewItem() {
    const description = itemDraft.description.trim()
    const quantity = Number(itemDraft.quantity)
    const unitPrice = Number(itemDraft.unitPrice)
    const igvRate = DEFAULT_IGV_RATE

    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return
    }

    setCatalogError('')

    if (editingItemId === null && itemDraft.saveToCatalog) {
      setCatalogSaving(true)

      try {
        const saved = await saveCatalogItem({
          type: itemDraft.type,
          code: itemDraft.code.trim(),
          description,
          unit: itemDraft.unit,
          salePrice: unitPrice,
        })

        setCatalogItems((current) => {
          const exists = current.some((item) => item.id === saved.id)
          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current]
        })
      } catch (error) {
        console.error(error)
        setCatalogError('No se pudo guardar el producto o servicio en el catálogo.')
        setCatalogSaving(false)
        return
      }

      setCatalogSaving(false)
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
                unitPrice,
                igvRate,
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
          unitPrice,
          igvRate,
        },
      ])
    }

    setEditingItemId(null)
    setItemFormOpen(false)
  }

  function addCatalogItemToDocument(catalogItem: CatalogItem) {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        type: catalogItem.type,
        code: catalogItem.code || undefined,
        description: catalogItem.description,
        unit: catalogItem.unit,
        quantity: 1,
        unitPrice: catalogItem.salePrice,
        igvRate: DEFAULT_IGV_RATE,
      },
    ])
    setCatalogQuery('')
  }

  function currentContent(): DraftContent {
    return { version: 1, documentType, currency, paymentCondition, issueDate,
      clientId: selectedClientId, address: selectedAddress, purchaseOrder, exchangeRate,
      installments: paymentCondition === 'CREDITO' ? installments : [],
      items: items.map(({ id, type, code, description, unit, quantity, unitPrice, igvRate }) =>
        ({ id, type, code, description, unit, quantity, unitPrice, igvRate })) }
  }

  async function persistDraft() {
    if (documentType === '01' && selectedClient && selectedClient.documentType !== 'RUC') {
      setClientError('Estás generando una factura: usa un cliente con RUC.')
      return
    }
    if (saveLock.current) return
    saveLock.current = true
    setDraftSaving(true)
    setDraftError('')
    setDraftMessage('')
    const content = currentContent()
    try {
      const saved = await saveDraft(draftId, content)
      setSavedContent(draftSnapshot(content))
      setDrafts((current) => [saved, ...current.filter((draft) => draft.id !== saved.id)])
      setDraftMessage(content.paymentCondition === 'CREDITO' && installmentReview.errors.length > 0
        ? 'Borrador guardado. El cronograma de cuotas está incompleto; podrás terminarlo después.'
        : 'Borrador guardado. Puedes recuperarlo desde esta pantalla. No ha sido emitido.')
    } catch {
      setDraftError('No se pudo guardar el borrador. Tus datos siguen en el formulario; vuelve a intentarlo.')
    } finally {
      saveLock.current = false
      setDraftSaving(false)
    }
  }

  function restoreDraft(draft: Draft) {
    if (savedContent !== draftSnapshot(currentContent()) &&
        (items.length > 0 || selectedClientId || purchaseOrder || exchangeRate || paymentCondition === 'CREDITO') &&
        !window.confirm('Hay cambios sin guardar. ¿Deseas reemplazarlos con este borrador?')) return
    const data = draft.contenido
    if (data.version !== 1 || !Array.isArray(data.items)) {
      setDraftError('Este borrador no tiene un formato compatible.')
      return
    }
    setDraftId(draft.id)
    setDocumentType(data.documentType)
    setCurrency(data.currency)
    setPaymentCondition(data.paymentCondition)
    setInstallments(data.installments ?? [])
    setIssueDate(data.issueDate)
    const restoredClient = clients.find((client) => client.id === data.clientId)
    const incompatibleClient = data.documentType === '01' && restoredClient?.documentType === 'DNI'
    setSelectedClientId(incompatibleClient ? null : data.clientId)
    setClientQuery(incompatibleClient ? '' : restoredClient?.documentNumber ?? '')
    setSelectedAddress(incompatibleClient ? '' : data.address)
    setClientError(incompatibleClient ? 'Este borrador de factura tenía un cliente con DNI. Selecciona un cliente con RUC.' : '')
    setPurchaseOrder(data.purchaseOrder)
    setExchangeRate(data.exchangeRate)
    setItems(data.items)
    setSavedContent(draftSnapshot({ ...data, installments: data.installments ?? [] }))
    setDraftMessage('Borrador recuperado. Puedes editarlo y guardar los cambios.')
    setDraftError('')
  }

  const serializedContent = draftSnapshot(currentContent())
  const hasUnsavedChanges = serializedContent !== savedContent &&
    (items.length > 0 || Boolean(selectedClientId || purchaseOrder || exchangeRate) || paymentCondition === 'CREDITO' || Boolean(savedContent))
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedChanges])

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
              onClick={() => { if (!hasUnsavedChanges || window.confirm('Hay cambios sin guardar. ¿Deseas salir?')) navigate(initialDraft ? '/borradores' : '/dashboard') }}
              className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
              aria-label="Volver"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="font-semibold leading-none text-slate-950">{initialDraft ? 'Editar borrador' : 'Nuevo comprobante'}</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">BRISANTEC · Facturación electrónica</p>
            </div>
          </div>

          <button onClick={persistDraft} disabled={draftSaving} className="disabled:opacity-50 hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
            <Save className="size-4" />
            {draftSaving ? 'Guardando…' : 'Guardar borrador'}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1536px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Borradores guardados">
          {!initialDraft && <>
          <label htmlFor="draft-selector" className="text-sm font-semibold text-slate-800">Recuperar borrador</label>
          <select id="draft-selector" value="" disabled={draftSaving || draftLoading || clientsLoading}
            onChange={(event) => { const draft = drafts.find((entry) => entry.id === event.target.value); if (draft) restoreDraft(draft) }}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:opacity-50">
            <option value="">{draftLoading ? 'Cargando borradores…' : drafts.length ? 'Selecciona un borrador guardado' : 'Sin borradores guardados'}</option>
            {drafts.map((draft) => <option key={draft.id} value={draft.id}>
              {draft.contenido.documentType === '01' ? 'Factura' : 'Boleta'} · {draft.contenido.issueDate} · {clients.find((client) => client.id === draft.contenido.clientId)?.name ?? 'Sin cliente'} · {draft.id.slice(0, 8)}
            </option>)}
          </select>
          </>}
          {hasUnsavedChanges && <p className="mt-3 text-sm text-amber-700">Hay cambios sin guardar.</p>}
          {draftMessage && !hasUnsavedChanges && <p role="status" className="mt-3 text-sm text-green-700">{draftMessage}</p>}
          {draftError && <p role="alert" className="mt-3 text-sm text-red-700">{draftError}</p>}
        </section>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Section title="Comprobante" subtitle="Define el tipo de documento, fecha y moneda.">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Tipo de comprobante">
                  <select
                    value={documentType}
                    onChange={(event) => {
                      const nextType = event.target.value as DocumentType
                      setDocumentType(nextType)
                      setClientError('')
                      if (nextType === '01' && selectedClient?.documentType === 'DNI') {
                        setSelectedClientId(null)
                        setSelectedAddress('')
                        setClientQuery('')
                        setClientError('Estás generando una factura: selecciona un cliente con RUC.')
                      }
                    }}
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
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
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
                    placeholder={documentType === '01' ? 'Buscar por RUC o razón social...' : 'Buscar por RUC, DNI o nombre...'}
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
                    value={catalogQuery}
                    onChange={(event) => setCatalogQuery(event.target.value)}
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

              {catalogError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {catalogError}
                </div>
              )}

              {catalogLoading && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Cargando catálogo...
                </div>
              )}

              {!catalogLoading && catalogQuery.trim() && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {filteredCatalogItems.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {filteredCatalogItems.slice(0, 6).map((catalogItem) => (
                        <button
                          key={catalogItem.id}
                          type="button"
                          onClick={() => addCatalogItemToDocument(catalogItem)}
                          className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{catalogItem.description}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {catalogItem.type === 'PRODUCTO' ? 'Producto' : 'Servicio'}
                              {catalogItem.code ? ` · ${catalogItem.code}` : ''}
                              {` · ${currencySymbol} ${catalogItem.salePrice.toFixed(2)}`}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600">Agregar</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-slate-500">
                      No se encontraron coincidencias en el catálogo.
                    </div>
                  )}
                </div>
              )}

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
                    onChange={(event) => {
                      const next = event.target.value as PaymentCondition
                      if (next === 'CONTADO' && installments.length > 0 &&
                          !window.confirm('Al cambiar a contado se eliminarán las cuotas de este borrador. ¿Continuar?')) return
                      setPaymentCondition(next)
                      if (next === 'CONTADO') setInstallments([])
                      else if (installments.length === 0) setInstallments([{ id: crypto.randomUUID(), dueDate: '', amount: totals.total > 0 ? totals.total.toFixed(2) : '' }])
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </Field>

                <Field label="Orden de compra (opcional)">
                  <input
                    value={purchaseOrder}
                    onChange={(event) => setPurchaseOrder(event.target.value)}
                    placeholder="Ej. OC-2026-001"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              {paymentCondition === 'CREDITO' && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Cuotas de la venta a crédito</p>
                      <p className="mt-1 text-xs text-blue-700">Los importes usan la moneda del comprobante. Puedes guardar el borrador y completar las cuotas después.</p>
                    </div>
                    <button type="button" onClick={() => setInstallments((current) => [...current, {
                      id: crypto.randomUUID(), dueDate: '',
                      amount: installmentReview.differenceCents > 0 ? (installmentReview.differenceCents / 100).toFixed(2) : '',
                    }])} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700">
                      <Plus className="size-4" /> Agregar cuota
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {installments.map((installment, index) => (
                      <div key={installment.id} className="grid items-end gap-3 rounded-xl bg-white p-3 sm:grid-cols-[1fr_1fr_auto]">
                        <label className="text-sm text-slate-700">
                          Cuota {index + 1} · Vencimiento
                          <input type="date" min={issueDate} value={installment.dueDate}
                            onChange={(event) => setInstallments((current) => current.map((entry) => entry.id === installment.id ? { ...entry, dueDate: event.target.value } : entry))}
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" />
                        </label>
                        <label className="text-sm text-slate-700">
                          Importe ({currencySymbol})
                          <input inputMode="decimal" placeholder="0.00" value={installment.amount}
                            onChange={(event) => setInstallments((current) => current.map((entry) => entry.id === installment.id ? { ...entry, amount: event.target.value } : entry))}
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" />
                        </label>
                        <button type="button" aria-label={`Eliminar cuota ${index + 1}`}
                          onClick={() => setInstallments((current) => current.filter((entry) => entry.id !== installment.id))}
                          className="grid size-11 place-items-center rounded-xl text-red-600 hover:bg-red-50">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-blue-900" aria-live="polite">
                    <p>Programado: {currencySymbol} {(installmentReview.scheduledCents / 100).toFixed(2)} · Total: {currencySymbol} {totals.total.toFixed(2)}</p>
                    {installmentReview.differenceCents !== 0 && <p>
                      {installmentReview.differenceCents > 0 ? 'Falta distribuir' : 'Exceso programado'}: {currencySymbol} {(Math.abs(installmentReview.differenceCents) / 100).toFixed(2)}
                    </p>}
                    {installmentReview.errors.length > 0 ? (
                      <ul className="list-inside list-disc text-amber-800">
                        {installmentReview.errors.map((error) => <li key={error}>{error}</li>)}
                      </ul>
                    ) : <p className="font-semibold text-green-700">Cronograma completo: las cuotas coinciden con el total.</p>}
                  </div>
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
                    value={exchangeRate}
                    onChange={(event) => setExchangeRate(event.target.value)}
                    placeholder="Ej. 3.45"
                    className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    El sistema sugerirá un valor, pero el usuario podrá fijar el tipo de cambio utilizado.
                  </p>
                </div>
              )}

              <button type="button" onClick={() => setPreviewOpen(true)} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                <Eye className="size-4" /> Vista previa / PDF
              </button>

              <button disabled title="La emisión electrónica aún no está disponible" className="disabled:cursor-not-allowed disabled:opacity-50 mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                Emisión electrónica pendiente
              </button>

              <button onClick={persistDraft} disabled={draftSaving} className="disabled:opacity-50 mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:hidden">
                <Save className="size-4" />
                {draftSaving ? 'Guardando…' : 'Guardar borrador'}
              </button>
            </div>
          </aside>
        </div>
      </main>

      {previewOpen && <DocumentPreview draft={currentContent()} client={selectedClient} totals={totals} onClose={() => setPreviewOpen(false)} />}

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
              {documentType === '01' && (
                <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  Estás generando una factura: usa RUC y razón social. El tipo de documento está fijado en RUC.
                </p>
              )}
              {clientError && <p role="alert" className="text-sm text-red-700">{clientError}</p>}

              <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <Field label="Tipo de documento">
                  <select
                    value={clientDraft.documentType}
                    disabled={documentType === '01'}
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
                    {documentType !== '01' && <option value="DNI">DNI</option>}
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                <Field label={`Precio unitario (${currencySymbol})`}>
                  <input
                    inputMode="decimal"
                    value={itemDraft.unitPrice}
                    onChange={(event) => setItemDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </Field>
              </div>

              {editingItemId === null ? (
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
              ) : (
                <p className="text-sm text-slate-500">
                  Los cambios se aplican únicamente a este comprobante. Para modificar el catálogo, ingresa a Catálogo.
                </p>
              )}

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <ClipboardList className="size-4" />
                  Vista previa del cálculo
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-blue-600">Valor venta</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {(((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitPrice) || 0)) / (1 + DEFAULT_IGV_RATE)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">IGV</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {(((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitPrice) || 0)) - (((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitPrice) || 0)) / (1 + DEFAULT_IGV_RATE))).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">Total</p>
                    <p className="mt-1 font-semibold text-blue-950">
                      {currencySymbol} {((Number(itemDraft.quantity) || 0) * (Number(itemDraft.unitPrice) || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-blue-700">
                  Ingresa el precio final de venta. BRISANTEC separa automáticamente el IGV del 18%.
                </p>
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
                disabled={catalogSaving || !itemDraft.description.trim() || Number(itemDraft.quantity) <= 0 || Number(itemDraft.unitPrice) < 0 || itemDraft.unitPrice === ''}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {catalogSaving
                  ? 'Guardando...'
                  : editingItemId !== null
                    ? 'Guardar cambios'
                    : `Agregar ${itemDraft.type === 'PRODUCTO' ? 'producto' : 'servicio'}`}
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
            const lineTotal = item.quantity * item.unitPrice
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
                    <p className="text-xs text-slate-400">Precio unit.</p>
                    <p className="mt-1 font-medium text-slate-800">{currencySymbol} {item.unitPrice.toFixed(2)}</p>
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
