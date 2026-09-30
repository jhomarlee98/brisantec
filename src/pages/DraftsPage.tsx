import { ArrowLeft, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteDraft, listDrafts, type Draft } from '../utils/borradores'
import { listClients, type Client } from '../utils/clientes'

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const deleteLock = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([listDrafts(), listClients()]).then(([rows, people]) => {
      if (active) { setDrafts(rows); setClients(people) }
    }).catch(() => { if (active) setError('No se pudieron cargar los borradores. Intenta nuevamente.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  async function remove(draft: Draft) {
    if (deleteLock.current) return
    const client = clients.find((entry) => entry.id === draft.contenido.clientId)
    if (!window.confirm(`¿Eliminar el borrador ${draft.id.slice(0, 8)} de ${client?.name ?? 'cliente sin asignar'}? Esta acción no se puede deshacer.`)) return
    deleteLock.current = true
    setDeleting(draft.id)
    setError('')
    setMessage('')
    try {
      await deleteDraft(draft.id)
      setDrafts((current) => current.filter((entry) => entry.id !== draft.id))
      setMessage('Borrador eliminado.')
    } catch {
      setError('No se pudo eliminar el borrador. Reintenta; si persiste, consulta al administrador.')
    } finally { setDeleting(null); deleteLock.current = false }
  }

  const filtered = drafts.filter((draft) => {
    const client = clients.find((entry) => entry.id === draft.contenido.clientId)
    const text = [draft.id, client?.name, client?.documentNumber, draft.contenido.purchaseOrder, draft.contenido.issueDate].join(' ').toLocaleLowerCase()
    return (!type || draft.contenido.documentType === type) && text.includes(query.trim().toLocaleLowerCase())
  })

  return <div className="min-h-dvh bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" aria-label="Volver al panel" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"><ArrowLeft className="size-5" /></Link>
          <h1 className="text-xl font-semibold text-slate-950">Mis borradores</h1>
        </div>
        <Link to="/comprobantes/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"><Plus className="size-4" /> Nuevo</Link>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="text-sm text-slate-500">Comprobantes en preparación. Puedes continuar editándolos; aún no han sido emitidos.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Buscar borradores</span>
          <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, documento, fecha, orden de compra o ID…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
        </label>
        <select aria-label="Tipo de comprobante" value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">Todos los tipos</option><option value="01">Facturas</option><option value="03">Boletas</option>
        </select>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}
        <button disabled={loading || deleting !== null} onClick={() => { setError(''); setLoading(true); setAttempt((value) => value + 1) }} className="ml-3 font-semibold underline disabled:opacity-50">Actualizar lista</button>
      </div>}
      {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
      {loading ? <p role="status" className="py-12 text-center text-slate-500">Cargando borradores…</p> : <>
        <p className="mt-4 text-xs text-slate-500">{filtered.length} borrador(es)</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {filtered.map((draft) => {
            const content = draft.contenido
            const client = clients.find((entry) => entry.id === content.clientId)
            const total = content.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
            return <article key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="flex items-center gap-2 font-semibold text-slate-900"><FileText className="size-4 text-blue-600" />{content.documentType === '01' ? 'Factura' : 'Boleta'} · {draft.id.slice(0, 8)}</p>
                  <p className="mt-2 break-words text-sm text-slate-800">{client?.name ?? (content.clientId ? 'Cliente no disponible' : 'Sin cliente')}</p>
                  <p className="mt-1 text-xs text-slate-500">{client ? `${client.documentType} ${client.documentNumber}` : 'Cliente pendiente'}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Borrador</span>
              </div>
              <p className="mt-4 text-xl font-semibold text-slate-950">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: content.currency }).format(total)}</p>
              <p className="mt-2 text-xs text-slate-500">Fecha: {content.issueDate || 'Sin definir'} · {content.paymentCondition === 'CREDITO' ? 'Crédito' : 'Contado'} · {content.items.length} ítem(s)</p>
              <p className="mt-1 text-xs text-slate-400">Actualizado: {new Date(draft.updated_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Link to={`/borradores/${draft.id}`} className="text-sm font-semibold text-blue-700">Continuar edición</Link>
                <button disabled={deleting !== null} onClick={() => remove(draft)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" />{deleting === draft.id ? 'Eliminando…' : 'Eliminar'}</button>
              </div>
            </article>
          })}
        </div>
        {filtered.length === 0 && !error && <p className="py-12 text-center text-sm text-slate-500">{drafts.length ? 'No hay borradores que coincidan con la búsqueda.' : 'Aún no tienes borradores. Crea un comprobante y guárdalo para continuar después.'}</p>}
      </>}
    </main>
  </div>
}
