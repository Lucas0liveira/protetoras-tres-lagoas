import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PawPrint, Dog, HandHeart, Building2, Users, LogOut, Settings, Pill, AlertTriangle, X, Megaphone, Receipt, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard/animais',       label: 'Animais',           icon: Dog },
  { to: '/dashboard/custodios',     label: 'Adotantes & Lares', icon: HandHeart },
  { to: '/dashboard/clinicas',      label: 'Clínicas',          icon: Building2 },
  { to: '/dashboard/voluntarios',   label: 'Voluntários',       icon: Users },
  { to: '/dashboard/farmacia',      label: 'Farmácia',          icon: Pill },
  { to: '/dashboard/alertas',       label: 'Alertas Urgentes',  icon: Megaphone },
  { to: '/dashboard/financeiro',    label: 'Financeiro',        icon: Receipt },
]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 py-5 border-b border-stone-100">
        <Link to="/" onClick={onClose} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* <img
            src="/logo.svg"
            alt="Protetoras TL"
            className="h-7 w-7 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block' }}
          /> */}
          <PawPrint size={20} className="text-brand-600" />
          <span className="font-semibold text-stone-700 text-sm tracking-tight">Protetoras TL</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
            )}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-stone-100 space-y-1">
        <NavLink to="/dashboard/configuracoes" onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full',
            isActive
              ? 'bg-brand-50 text-brand-700 font-medium'
              : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
          )}>
          <Settings size={16} />Configurações
        </NavLink>
        <Button variant="ghost" size="sm" onClick={handleLogout}
          className="w-full justify-start text-stone-400 hover:text-stone-600 gap-2">
          <LogOut size={15} />Sair
        </Button>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const location = useLocation()
  const [expiringCount, setExpiringCount] = useState(0)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    async function checkExpiring() {
      const soon = new Date()
      soon.setDate(soon.getDate() + 30)
      const { count } = await supabase
        .from('pharmacy_items')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .lte('expiration_date', soon.toISOString().split('T')[0])
      setExpiringCount(count ?? 0)
    }
    checkExpiring()
  }, [])

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 border-r border-stone-200 shrink-0 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 z-50 shadow-xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-200 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-stone-500 hover:text-stone-700">
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
              {/* <img src="/logo.svg" alt="Protetoras TL" className="h-6 w-6 object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block' }} /> */}
            <PawPrint size={18} className="text-brand-600 hidden" />
            <span className="font-semibold text-stone-700 text-sm">Protetoras TL</span>
          </Link>
        </div>

        {expiringCount > 0 && !bannerDismissed && (
          <div className="flex items-center gap-3 bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 shrink-0">
            <AlertTriangle size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 flex-1">
              <span className="font-medium">{expiringCount} medicamento{expiringCount > 1 ? 's' : ''}</span> com validade próxima ou vencida na farmácia.{' '}
              <NavLink to="/dashboard/farmacia" className="underline font-medium">Ver farmácia</NavLink>
            </p>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 shrink-0"
              onClick={() => setBannerDismissed(true)}>
              <X size={14} />
            </Button>
          </div>
        )}
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
