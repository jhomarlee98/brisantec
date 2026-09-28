import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <main className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,0.9fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_30%)]" />

        <div className="relative z-10 inline-flex items-center gap-3 text-white">
          <div className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-950/30">
            B
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">BRISANTEC</p>
            <p className="mt-1 text-sm text-slate-400">Facturación electrónica</p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">Gestión simple</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-white xl:text-5xl">
            Factura y controla tus ventas desde un solo lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            Una experiencia clara, rápida y pensada para trabajar cómodamente desde laptop o celular.
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-500">INVERSIONES GENERALES BRISANTEC SRL</p>
      </section>

      <section className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8 sm:px-6 lg:max-w-none lg:px-14 xl:px-20">
        <div className="w-full">
          <div className="mb-10 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-blue-600 font-bold text-white shadow-sm">
                B
              </div>
              <div>
                <p className="font-semibold leading-none text-slate-950">BRISANTEC</p>
                <p className="mt-1 text-xs text-slate-500">Facturación electrónica</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-600">Bienvenido</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Inicia sesión</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Ingresa con tu DNI y contraseña para acceder al sistema.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">DNI</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={8}
                  placeholder="Ingresa tu DNI"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Contraseña</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="mt-2 h-12 w-full rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              Iniciar sesión
            </button>
          </form>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">
            ¿Olvidaste tu contraseña? Contacta al administrador del sistema para solicitar el restablecimiento.
          </div>
        </div>
      </section>
    </main>
  )
}
