import { ArrowLeft, BadgeCheck, Building2, KeyRound, ReceiptText, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentRole, getSunatSettings, type AppRole, type CompanyProfile, type DocumentSeries, type SunatConfig } from '../utils/sunatConfig'

export default function SunatConfigPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<AppRole | null>(null)
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [config, setConfig] = useState<SunatConfig | null>(null)
  const [series, setSeries] = useState<DocumentSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getCurrentRole(), getSunatSettings()])
      .then(([currentRole, settings]) => {
        if (!active) return
        setRole(currentRole)
        if (currentRole !== 'admin' && currentRole !== 'contador') return
        setCompany(settings.company)
        setConfig(settings.config)
        setSeries(settings.series)
      })
      .catch((err) => {
        console.error(err)
        if (active) setError('No se pudo cargar la configuración SUNAT.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="grid min-h-dvh place-items-center bg-slate-50 text-sm text-slate-500">Cargando configuración...</div>

  if (role !== 'admin' && role !== 'contador') {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ShieldCheck className="mx-auto size-10 text-slate-400" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-500">Esta sección solo está disponible para administrador o contador.</p>
          <button onClick={() => navigate('/dashboard')} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Volver al panel</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="size-4" /> Volver
        </button>
        <div className="mt-5">
          <p className="text-sm font-semibold text-blue-600">Configuración</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">SUNAT</h1>
          <p className="mt-2 text-sm text-slate-500">Datos de conexión, certificado y series del emisor.</p>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="mt-7 grid gap-4 md:grid-cols-2">
          <Card icon={Building2} title="Empresa">
            <Field label="Razón social" value={company?.razon_social ?? 'Pendiente de configurar'} />
            <Field label="RUC" value={company?.ruc ?? 'Pendiente'} />
          </Card>
          <Card icon={BadgeCheck} title="Entorno SUNAT">
            <Field label="Entorno" value={config?.environment === 'production' ? 'Producción' : 'Beta'} />
            <Field label="Estado" value={config?.active ? 'Activo' : 'Pendiente de activar'} />
          </Card>
          <Card icon={KeyRound} title="Credenciales y certificado">
            <Field label="Usuario SOL" value={config?.sol_username ?? 'Pendiente'} />
            <Field label="Certificado" value={config?.certificate_path ? 'Configurado' : 'Pendiente'} />
            <Field label="Vencimiento" value={config?.certificate_expires_at ?? 'Pendiente'} />
            <p className="mt-3 text-xs leading-5 text-slate-400">Las contraseñas SOL y del certificado no se muestran ni se almacenan en esta tabla.</p>
          </Card>
          <Card icon={ReceiptText} title="Series">
            {series.length === 0 ? <p className="text-sm text-slate-500">Aún no hay series configuradas.</p> : series.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <span className="text-sm text-slate-600">{item.document_type === '01' ? 'Factura' : item.document_type === '03' ? 'Boleta' : item.document_type === '07' ? 'Nota de crédito' : 'Nota de débito'}</span>
                <span className="text-sm font-semibold text-slate-900">{item.series} · {item.current_number}</span>
              </div>
            ))}
          </Card>
        </section>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Primero configuraremos y probaremos SUNAT Beta. El cambio a producción se hará después de validar XML, firma y CDR.
        </div>
      </div>
    </main>
  )
}

function Card({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon className="size-5" /></div><h2 className="font-semibold text-slate-950">{title}</h2></div>{children}</article>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"><span className="text-sm text-slate-500">{label}</span><span className="text-right text-sm font-medium text-slate-900">{value}</span></div>
}
