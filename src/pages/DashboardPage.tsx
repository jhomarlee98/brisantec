import {
  FileText,
  HandCoins,
  Home,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const metrics = [
  { label: 'Ventas del mes', value: 'S/ 0.00', detail: 'Septiembre 2026' },
  { label: 'Comprobantes', value: '0', detail: 'Facturas y boletas' },
  { label: 'Por cobrar', value: 'S/ 0.00', detail: '0 comprobantes' },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="font-semibold leading-none text-slate-950">BRISANTEC</p>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">Facturación electrónica</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">Administrador</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              AD
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1536px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100dvh-4rem)] border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
          <nav className="space-y-1">
            <NavItem icon={Home} label="Inicio" active />
            <NavItem icon={FileText} label="Comprobantes" />
            <NavItem icon={Users} label="Clientes" />
            <NavItem icon={HandCoins} label="Pagos" />
            <NavItem icon={Settings} label="Configuración" />
          </nav>

          <button className="mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <LogOut className="size-5" />
            Cerrar sesión
          </button>
        </aside>

        <main className="min-w-0 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">Panel principal</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">
                Buenos días
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Aquí tendrás un resumen rápido de la facturación de BRISANTEC.
              </p>
            </div>

            <button
              onClick={() => navigate('/comprobantes/nuevo')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Nuevo comprobante
            </button>
          </div>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{metric.value}</p>
                <p className="mt-2 text-xs text-slate-400">{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-950">Últimos comprobantes</h2>
                <p className="mt-1 text-sm text-slate-500">Todavía no hay comprobantes registrados.</p>
              </div>
              <button className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">Ver todos</button>
            </div>

            <div className="grid min-h-48 place-items-center px-6 py-10 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <ReceiptText className="size-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-800">Sin comprobantes</p>
                <p className="mt-1 text-sm text-slate-500">La primera factura o boleta aparecerá aquí.</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          <MobileNavItem icon={Home} label="Inicio" active />
          <MobileNavItem icon={Users} label="Clientes" />
          <MobileNavItem icon={Plus} label="Nueva" emphasized onClick={() => navigate('/comprobantes/nuevo')} />
          <MobileNavItem icon={FileText} label="Facturas" />
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
}) {
  return (
    <button
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
        active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon className="size-5" />
      {label}
    </button>
  )
}

function MobileNavItem({
  icon: Icon,
  label,
  active = false,
  emphasized = false,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  emphasized?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium ${
        active ? 'text-blue-600' : 'text-slate-500'
      }`}
    >
      <span className={emphasized ? 'grid size-9 place-items-center rounded-full bg-blue-600 text-white shadow-sm' : ''}>
        <Icon className="size-5" />
      </span>
      {label}
    </button>
  )
}
