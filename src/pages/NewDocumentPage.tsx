import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Package,
  Plus,
  Receipt,
  Save,
  Search,
  Wrench,
  X,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type DocumentType = '01' | '03'
type Currency = 'PEN' | 'USD'
type PaymentCondition = 'CONTADO' | 'CREDITO'
type ItemType = 'PRODUCTO' | 'SERVICIO'

type Item = {
  id: number
  type: ItemType
  description: string
  quantity: number
  unitValue: number
  igvRate: number
}

const initialItems: Item[] = [
  {
    id: 1,
    type: 'PRODUCTO',
    description: 'ESPÁRRAGO DE ARO Y CAMBIO CAC-888',
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
  const [itemTypeDialogOpen, setItemTypeDialogOpen] = useState(false)

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

  function addItem(type: ItemType) {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        type,
        description: type === 'PRODUCTO' ? 'Nuevo producto' : 'Nuevo servicio',
        quantity: 1,
        unitValue: 0,
        igvRate: 0.18,
      },
    ])
    setItemTypeDialogOpen(false)
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
              subtitle={documentType === '01' ? 'Para factura, identifica al cliente por RUC.' : 'Para boleta, puedes identificar al cliente por DNI.'}
            >
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <Field label={documentType === '01' ? 'RUC' : 'DNI'}>
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric"
                      placeholder={documentType === '01' ? '20563010208' : '71234567'}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50">
                      <Search className="size-4" />
                    </button>
                  </div>
                </Field>

                <Field label={documentType === '01' ? 'Razón social' : 'Nombres y apellidos'}>
                  <input
                    placeholder="Los datos aparecerán al consultar"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Dirección">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder="Dirección fiscal o dirección seleccionada"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </Field>
              </div>
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
                  onAdd={() => addItem('PRODUCTO')}
                  onRemove={removeItem}
                />
                <ItemGroup
                  title="Servicios"
                  icon={Wrench}
                  items={services}
                  currencySymbol={currencySymbol}
                  emptyText="Aún no has agregado servicios."
                  onAdd={() => addItem('SERVICIO')}
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
                onClick={() => addItem('PRODUCTO')}
                className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Package className="size-5" />
                </div>
                <p className="mt-4 font-semibold text-slate-950">Producto</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">Bien físico, repuesto, material o artículo.</p>
              </button>

              <button
                onClick={() => addItem('SERVICIO')}
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
  onRemove,
}: {
  title: string
  icon: typeof Package
  items: Item[]
  currencySymbol: string
  emptyText: string
  onAdd: () => void
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
                  <p className="text-sm font-semibold leading-5 text-slate-900">{item.description}</p>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Eliminar ${item.type.toLowerCase()}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
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
