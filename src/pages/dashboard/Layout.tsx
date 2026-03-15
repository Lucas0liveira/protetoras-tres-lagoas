import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PawPrint, Dog, HandHeart, Building2, Users, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard/animais',       label: 'Animais',        icon: Dog },
  { to: '/dashboard/custodios',     label: 'Adotantes & Lares', icon: HandHeart },
  { to: '/dashboard/clinicas',      label: 'Clínicas',       icon: Building2 },
  { to: '/dashboard/voluntarios',   label: 'Voluntários',    icon: Users },
]

export default function DashboardLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <aside className="w-56 bg-white border-r border-stone-200 flex flex-col shrink-0">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-stone-100 hover:opacity-80 transition-opacity">
          <PawPrint size={20} className="text-emerald-600" />
          <span className="font-semibold text-stone-700 text-sm tracking-tight">Protetoras TL</span>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
              )}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-stone-100 space-y-1">
          <NavLink to="/dashboard/configuracoes"
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full',
              isActive
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
            )}>
            <Settings size={16} />Configurações
          </NavLink>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="w-full justify-start text-stone-400 hover:text-stone-600 gap-2">
            <LogOut size={15} />Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}