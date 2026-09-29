import { ArrowLeft, Package, Pencil, Plus, Search, Trash2, Wrench, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deactivateCatalogItem,
  listCatalogItems,
  saveCatalogItem,
  updateCatalogItem,
  type CatalogItem,
  type CatalogItemType,
} from '../utils/catalogo'

const emptyDraft = {
  type: 'PRODUCTO' as CatalogItemType,
  code: '',
  description: '',
  unit: 'UNIDAD',
  salePrice: '',
}

export default function CatalogPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    let active = true

    listCatalogItems()
      .then((data) => {
        if (active) setItems(data)
      })
      .catch((error) => {
        console.error(error)
        if (active) setErrorMessage('No se pudo cargar el catálogo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) =>
      [item.type, item.code, item.description, item.unit]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [items, search])

  function openNew(type: CatalogItemType = 'PRODUCTO') {
    setEditingId(null)
    setDraft({
      ...emptyDraft,
      type,
      unit: type === 'PRODUCTO' ? 'UNIDAD' : 'SERVICIO',
    })
    setFormOpen(true)
  }

  function openEdit(item: CatalogItem) {
    setEditingId(item.id)
    setDraft({
      type: item.type,
      code: item.code,
      description: item.description,
      unit: item.unit,
      salePrice: String(item.salePrice),
    })
    setFormOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const description = draft.description.trim()
    const salePrice = Number(draft.salePrice)

    if (!description || !Number.isFinite(salePrice) || salePrice < 0) return

    setSaving(true)
    setErrorMessage('')

    try {
      const payload = {
        type: draft.type,
        code: draft.code.trim(),
        description,
        unit: draft.unit,
        salePrice,
      }

      if (editingId === null) {
        const saved = await saveCatalogItem(payload)
        setItems((current) => {
          const exists = current.some((item) => item.id === saved.id)
          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current]
        })
      } else {
        const updated = await updateCatalogItem(editingId, payload)
        setItems((current) =>
          current.map((item) => (item.id === editingId ? updated : item)),
        )
      }

      setFormOpen(false)
    } catch (error) {
      console.error(error)
      setErrorMessage('No se pudo guardar el ítem. Verifica que el código no esté duplicado.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    setErrorMessage('')

    try {
      await deactivateCatalogItem(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      console.error(error)
      setErrorMessage('No se pudo desactivar el ítem.')
    }
  }

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
              <p className="font-semibold leading-none text-slate-950">Productos y servicios</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                Catálogo reutilizable para tus comprobantes
              </p>
            </div>
          </div>

          <button
            onClick={() => openNew()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Nuevo ítem
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1536px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div>
          <p className="text-sm font-semibold text-blue-600">Catálogo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Administra productos y servicios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Guarda el precio final de venta. Al emitir, BRISANTEC calcula internamente el valor sin IGV y el impuesto.
          </p>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código, descripción, tipo o unidad..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openNew('PRODUCTO')}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Package className="size-4" />
                Producto
              </button>
              <button
                onClick={() => openNew('SERVICIO')}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Wrench className="size-4" />
                Servicio
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
              <div>
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="mt-3 text-sm text-slate-500">Cargando catálogo...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-6 py-12 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <Package className="size-7" />
                </div>
                <h2 className="mt-4 font-semibold text-slate-900">
                  {items.length === 0 ? 'Aún no hay productos ni servicios' : 'No se encontraron coincidencias'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {items.length === 0
                    ? 'Registra el primer ítem para reutilizarlo al emitir facturas y boletas.'
                    : 'Prueba con otro código o descripción.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <article key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {item.type === 'PRODUCTO' ? 'Producto' : 'Servicio'}
                        </span>
                        {item.code && (
                          <span className="text-xs font-medium text-slate-400">{item.code}</span>
                        )}
                      </div>

                      <h2 className="mt-2 text-base font-semibold text-slate-950">{item.description}</h2>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <span>Unidad: {item.unit}</span>
                        <span className="font-semibold text-slate-800">
                          Precio: S/ {item.salePrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeactivate(item.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                        Desactivar
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
            onSubmit={handleSubmit}
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {editingId === null ? 'Nuevo ítem' : 'Editar ítem'}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Guarda el precio final que utilizará normalmente el emisor.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Tipo</span>
                  <select
                    value={draft.type}
                    onChange={(event) => {
                      const type = event.target.value as CatalogItemType
                      setDraft((current) => ({
                        ...current,
                        type,
                        unit: type === 'PRODUCTO' ? 'UNIDAD' : 'SERVICIO',
                      }))
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="PRODUCTO">Producto</option>
                    <option value="SERVICIO">Servicio</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Código interno (opcional)</span>
                  <input
                    value={draft.code}
                    onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                    placeholder="Ej. PROD-001"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Descripción</span>
                <input
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Nombre del producto o servicio"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Unidad</span>
                  <select
                    value={draft.unit}
                    onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="UNIDAD">Unidad</option>
                    <option value="SERVICIO">Servicio</option>
                    <option value="HORA">Hora</option>
                    <option value="DIA">Día</option>
                    <option value="METRO">Metro</option>
                    <option value="KILOGRAMO">Kilogramo</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Precio de venta (S/)</span>
                  <input
                    inputMode="decimal"
                    value={draft.salePrice}
                    onChange={(event) => setDraft((current) => ({ ...current, salePrice: event.target.value }))}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
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
                disabled={saving || !draft.description.trim() || draft.salePrice === '' || Number(draft.salePrice) < 0}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId === null ? 'Guardar ítem' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
