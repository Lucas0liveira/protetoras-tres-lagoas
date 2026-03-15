import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, PawPrint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { AnimalStatusEnum } from '@/types/database'

interface Counts { pendente_resgate: number; resgatado: number; lar_temporario: number; disponivel: number; adotado: number }

const STAT_CONFIG: { key: keyof Counts; label: string; color: string; bg: string; border: string }[] = [
  { key: 'pendente_resgate', label: 'Aguardando resgate', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  { key: 'resgatado',        label: 'Recém resgatados',   color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  { key: 'lar_temporario',   label: 'Em lar temporário',  color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { key: 'disponivel',       label: 'Disponíveis',        color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  { key: 'adotado',          label: 'Adotados',           color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
]

export default function Home() {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    async function loadCounts() {
      const { data } = await supabase
        .from('animals')
        .select('status')
        .is('deleted_at', null)
        .neq('status', 'obito')
      if (!data) return
      const c: Counts = { pendente_resgate: 0, resgatado: 0, lar_temporario: 0, disponivel: 0, adotado: 0 }
      data.forEach(a => { if (a.status in c) c[a.status as keyof Counts]++ })
      setCounts(c)
    }
    loadCounts()
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <PawPrint className="text-emerald-600" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/animais">Ver animais</Link></Button>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Link to="/login">Área restrita</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-emerald-700 text-sm font-medium mb-6">
          <PawPrint size={14} />Três Lagoas, MS
        </div>
        <h1 className="text-5xl font-bold text-stone-900 mb-5 leading-tight">
          Animais que precisam<br />de um lar cheio de amor
        </h1>
        <p className="text-stone-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Acompanhe os animais resgatados pelas Protetoras de Três Lagoas — do resgate ao lar definitivo.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/animais">Ver animais disponíveis</Link>
          </Button>
          <Button asChild variant="outline" size="lg"><a href="#sobre">Saiba mais</a></Button>
        </div>
      </section>

      {/* Live counters */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-8 py-14">
          <p className="text-center text-stone-400 text-xs uppercase tracking-widest mb-8 font-medium">Situação atual</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STAT_CONFIG.map(s => (
              <div key={s.key} className={`rounded-xl border ${s.border} ${s.bg} p-5 text-center`}>
                <div className={`text-4xl font-bold ${s.color} mb-1`}>
                  {counts == null ? '—' : counts[s.key]}
                </div>
                <div className="text-stone-500 text-xs leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="max-w-3xl mx-auto px-8 py-20">
        <div className="flex items-start gap-3 mb-6">
          <Shield className="text-emerald-600 mt-1" size={20} />
          <h2 className="text-2xl font-bold text-stone-800">Sobre o projeto</h2>
        </div>
        <p className="text-stone-500 leading-relaxed">
          As Protetoras de Três Lagoas trabalham voluntariamente no resgate, cuidado e encaminhamento de animais abandonados ou em situação de vulnerabilidade.
          Este sistema foi desenvolvido para organizar o trabalho de gestão dos animais, facilitando o acompanhamento do histórico médico, das custódias e do processo de adoção.
        </p>
      </section>

      <footer className="border-t border-stone-200 bg-white px-8 py-6 text-center text-stone-400 text-sm">
        © {new Date().getFullYear()} Protetoras Três Lagoas
      </footer>
    </div>
  )
}