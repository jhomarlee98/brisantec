import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDraft, type Draft } from '../utils/borradores'
import { listClients, type Client } from '../utils/clientes'
import NewDocumentPage from './NewDocumentPage'

export default function DraftEditorPage() {
  const { draftId } = useParams()
  const [loaded, setLoaded] = useState<{ draft: Draft; clients: Client[] } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    if (!draftId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId)) {
      return () => { active = false }
    }
    Promise.all([getDraft(draftId), listClients()]).then(([draft, clients]) => {
      if (!active) return
      if (!draft) setError('El borrador no existe o no tienes acceso.')
      else if (draft.contenido.version !== 1 || !Array.isArray(draft.contenido.items)) setError('El borrador no tiene un formato compatible.')
      else setLoaded({ draft, clients })
    }).catch(() => { if (active) setError('No se pudo cargar el borrador. Revisa tu conexión e intenta nuevamente.') })
    return () => { active = false }
  }, [draftId, attempt])

  if (loaded && loaded.draft.id === draftId) return <NewDocumentPage key={draftId} initialDraft={loaded.draft} initialClients={loaded.clients} />
  const invalidId = !draftId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId)
  return <main className="mx-auto max-w-lg space-y-4 px-5 py-12 text-slate-700">
    <p role={error || invalidId ? 'alert' : 'status'}>{invalidId ? 'El enlace del borrador no es válido.' : error || 'Cargando borrador…'}</p>
    {error && <button onClick={() => { setError(''); setAttempt((value) => value + 1) }} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Reintentar</button>}
    <Link to="/borradores" className="block text-blue-700">Volver a borradores</Link>
  </main>
}
