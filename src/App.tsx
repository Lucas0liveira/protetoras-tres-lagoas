import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Home from '@/pages/Home'
import PublicAnimals from '@/pages/PublicAnimals'
import Login from '@/pages/Login'
import DashboardLayout from '@/pages/dashboard/Layout'
import Animals from '@/pages/dashboard/Animals'
import AnimalDetail from '@/pages/dashboard/AnimalDetail'
import Custodians from '@/pages/dashboard/Custodians'
import Clinics from '@/pages/dashboard/Clinics'
import Volunteers from '@/pages/dashboard/Volunteers'
import Settings from '@/pages/dashboard/Settings'

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return null

  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Home />} />
      <Route path="/animais" element={<PublicAnimals />} />
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard/animais" />} />

      {/* protected */}
      <Route path="/dashboard" element={session ? <DashboardLayout /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="animais" />} />
        <Route path="animais"         element={<Animals />} />
        <Route path="animais/:id"     element={<AnimalDetail />} />
        <Route path="custodios"       element={<Custodians />} />
        <Route path="clinicas"        element={<Clinics />} />
        <Route path="voluntarios"     element={<Volunteers />} />
        <Route path="configuracoes"   element={<Settings />} />
      </Route>
    </Routes>
  )
}