import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import CatalogPage from './pages/CatalogPage'
import ClientsPage from './pages/ClientsPage'
import DraftsPage from './pages/DraftsPage'
import DraftEditorPage from './pages/DraftEditorPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import NewDocumentPage from './pages/NewDocumentPage'
import { supabase } from './utils/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={session ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/clientes"
        element={session ? <ClientsPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/catalogo"
        element={session ? <CatalogPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/borradores" element={session ? <DraftsPage /> : <Navigate to="/login" replace />} />
      <Route path="/borradores/:draftId" element={session ? <DraftEditorPage /> : <Navigate to="/login" replace />} />
      <Route
        path="/comprobantes/nuevo"
        element={session ? <NewDocumentPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
