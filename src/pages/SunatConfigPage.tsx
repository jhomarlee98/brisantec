import { ArrowLeft, BadgeCheck, Building2, KeyRound, ReceiptText, Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentRole,
  getSunatSettings,
  saveCompanyProfile,
  saveDocumentSeries,
  saveSunatEnvironment,
  type AppRole,
  type CompanyProfile,
  type DocumentSeries,
  type SunatConfig,
} from '../utils/sunatConfig'

export default function SunatConfigPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<AppRole | null>(null)
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [config, setConfig] = useState<SunatConfig | null>(null)
  const [series, setSeries] = useState<DocumentSeries[]>([])
  const [ruc, setRuc] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [invoiceSeries, setInvoiceSeries] = useState('F001')
  const [receiptSeries, setReceiptSeries] = useState('B001')
  const [invoiceNumber, setInvoiceNumber] = useState('0')
  const [receiptNumber, setReceiptNumber] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
        setRuc(settings.company?.ruc ?? '')
        setBusinessName(settings.company?.razon_social ?? '')
        setTradeName(settings.company?.nombre_comercial ?? '')

        const invoice = settings.series.find((item) => item.document_type === '01')
        const receipt = settings.series.find((item) => item.document_type === '03')
        setInvoiceSeries(invoice?.series ?? 'F001')
        setReceiptSeries(receipt?.series ?? 'B001')
        setInvoiceNumber(String(invoice?.current_number ?? 0))
        setReceiptNumber(String(receipt?.current_number ?? 0))
      })
      .catch((err) => {
        console.error(err)
        if (active) setError('No se pudo cargar la configuración SUNAT.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  async function handleSave() {
    setError('')
    setMessage('')

    if (!/^\d{11}$/.test(ruc)) {
      setError('El RUC debe contener exactamente 11 dígitos.')
      return
    }
    if (!businessName.trim()) {
      setError('Ingresa la razón social.')
      return
    }
    if (!/^F[A-Z0-9]{3}$/.test(invoiceSeries.trim().toUpperCase())) {
      setError('La serie de factura debe tener formato F001.')
      return
    }
    if (!/^B[A-Z0-9]{3}$/.test(receiptSeries.trim().toUpperCase())) {
      setError('La serie de boleta debe tener formato B001.')
      return
    }

    const invoiceCurrent = Number(invoiceNumber)
    const receiptCurrent = Number(receiptNumber)
    if (!Number.isSafeInteger(invoiceCurrent) || invoiceCurrent < 0 || !Number.isSafeInteger(receiptCurrent) || receiptCurrent < 0) {
      setError('Los correlativos deben ser números enteros iguales o mayores a 0.')
      return
    }

    setSaving(true)
    try {
      const savedCompany = await saveCompanyProfile({ ruc, razonSocial: businessName, nombreComercial: tradeName })
      const savedConfig = await saveSunatEnvironment(savedCompany.id, 'beta')
      const [savedInvoice, savedReceipt] = await Promise.all([
        saveDocumentSeries(savedCompany.id, { documentType: '01', series: invoiceSeries, currentNumber: invoiceCurrent }),
        saveDocumentSeries(savedCompany.id, { documentType: '03', series: receiptSeries, currentNumber: receiptCurrent }),
      ])

      setCompany(savedCompany)
      setConfig(savedConfig)
      setSeries([savedInvoice, savedReceipt])
      setInvoiceSeries(savedInvoice.series)
      setReceiptSeries(savedReceipt.series)
      setMessage('Configuración base guardada correctamente. El entorno permanece en SUNAT Beta.')
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar la configuración. Verifica los datos y los permisos RLS.')
    } finally {
      setSaving(false)
    }
  }

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

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Configuración</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">SUNAT</h1>
            <p className="mt-2 text-sm text-slate-500">Configura el emisor y las series antes de iniciar las pruebas electrónicas.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}

        <section className="mt-7 grid gap-4 md:grid-cols-2">
          <Card icon={Building2} title="Empresa">
            <Input label="RUC" value={ruc} onChange={(value) => setRuc(value.replace(/\D/g, '').slice(0, 11))} placeholder="20123456789" inputMode="numeric" />
            <Input label="Razón social" value={businessName} onChange={setBusinessName} placeholder="Razón social registrada" />
            <Input label="Nombre comercial" value={tradeName} onChange={setTradeName} placeholder="Opcional" />
          </Card>

          <Card icon={BadgeCheck} title="Entorno SUNAT">
            <Field label="Entorno" value="Beta" />
            <Field label="Estado" value={config?.active ? 'Activo' : 'Configuración inicial'} />
            <p className="mt-3 text-xs leading-5 text-slate-400">Durante esta etapa el sistema permanece bloqueado en Beta. Producción se habilitará después de validar el flujo completo.</p>
          </Card>

          <Card icon={ReceiptText} title="Series y correlativos">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Serie factura" value={invoiceSeries} onChange={(value) => setInvoiceSeries(value.toUpperCase().slice(0, 4))} placeholder="F001" />
              <Input label="Último correlativo" value={invoiceNumber} onChange={(value) => setInvoiceNumber(value.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" />
              <Input label="Serie boleta" value={receiptSeries} onChange={(value) => setReceiptSeries(value.toUpperCase().slice(0, 4))} placeholder="B001" />
              <Input label="Último correlativo" value={receiptNumber} onChange={(value) => setReceiptNumber(value.replace(/\D/g, ''))} placeholder="0" inputMode="numeric" />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">El valor corresponde al último número utilizado; el emisor deberá reservar el siguiente correlativo de forma atómica.</p>
          </Card>

          <Card icon={KeyRound} title="Credenciales y certificado">
            <Field label="Usuario SOL" value={config?.sol_username ?? 'Pendiente'} />
            <Field label="Certificado" value={config?.certificate_path ? 'Configurado' : 'Pendiente'} />
            <Field label="Vencimiento" value={config?.certificate_expires_at ?? 'Pendiente'} />
            <p className="mt-3 text-xs leading-5 text-slate-400">Las contraseñas SOL y del certificado no se capturarán desde este formulario. Se configurarán como secretos del backend.</p>
          </Card>
        </section>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Antes de guardar, confirma que los correlativos coincidan con la numeración real que continuará usando Brisantec. No deben reiniciarse si esas series ya tienen comprobantes emitidos.
        </div>

        {company && series.length > 0 && (
          <p className="mt-4 text-xs text-slate-400">Configuración vinculada a {company.razon_social} · {series.length} series registradas.</p>
        )}
      </div>
    </main>
  )
}

function Card({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon className="size-5" /></div><h2 className="font-semibold text-slate-950">{title}</h2></div>{children}</article>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"><span className="text-sm text-slate-500">{label}</span><span className="text-right text-sm font-medium text-slate-900">{value}</span></div>
}

function Input({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: 'numeric' }) {
  return <label className="block py-1"><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
}
