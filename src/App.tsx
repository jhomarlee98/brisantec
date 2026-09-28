import { Navigate, Route, Routes } from 'react-router-dom'
import ClientsPage from './pages/ClientsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import NewDocumentPage from './pages/NewDocumentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/clientes" element={<ClientsPage />} />
      <Route path="/comprobantes/nuevo" element={<NewDocumentPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
