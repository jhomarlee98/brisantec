import { Navigate, Route, Routes } from 'react-router-dom'

function HomePage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-brisantec-600">BRISANTEC</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Facturación electrónica
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          React, TypeScript y Tailwind CSS ya están configurados. Esta será la base del sistema responsive.
        </p>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
