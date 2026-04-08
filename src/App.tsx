import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import DashboardLayout from '@/pages/dashboard/Layout'
import Animals from '@/pages/dashboard/Animals'
import AnimalDetail from '@/pages/dashboard/AnimalDetail'
import Custodians from '@/pages/dashboard/Custodians'
import Clinics from '@/pages/dashboard/Clinics'
import Volunteers from '@/pages/dashboard/Volunteers'
import Settings from '@/pages/dashboard/Settings'
import Pharmacy from '@/pages/dashboard/Pharmacy'
import AlertsPage from '@/pages/dashboard/Alerts'
import Financeiro from '@/pages/dashboard/Financeiro'
import CollectionPoints from '@/pages/dashboard/CollectionPoints'
import Transparencia from '@/pages/Transparencia'
import Contribuir from '@/pages/Contribuir'
import PublicAnimalPage from '@/pages/PublicAnimalPage'

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return null

  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Home />} />
      <Route path="/animais" element={<Navigate to="/" replace />} />
      <Route path="/transparencia" element={<Transparencia />} />
      <Route path="/contribuir" element={<Contribuir />} />
      <Route path="/animais/:id" element={<PublicAnimalPage />} />
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard/animais" />} />

      {/* protected */}
      <Route path="/dashboard" element={session ? <DashboardLayout /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="animais" />} />
        <Route path="animais"         element={<Animals />} />
        <Route path="animais/:id"     element={<AnimalDetail />} />
        <Route path="custodios"       element={<Custodians />} />
        <Route path="clinicas"        element={<Clinics />} />
        <Route path="voluntarios"     element={<Volunteers />} />
        <Route path="farmacia"        element={<Pharmacy />} />
        <Route path="alertas"         element={<AlertsPage />} />
        <Route path="financeiro"      element={<Financeiro />} />
        <Route path="pontos"          element={<CollectionPoints />} />
        <Route path="configuracoes"   element={<Settings />} />
      </Route>
    </Routes>
  )
}