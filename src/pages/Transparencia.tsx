import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FinancialRecord } from '@/types/database'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Transparencia() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('financial_records').select('*').order('reference_date', { ascending: false })
      .then(({ data }) => { setRecords((data ?? []) as FinancialRecord[]); setLoading(false) })
  }, [])

  // Group by period
  const periods = Array.from(new Set(records.map(r => r.period))).sort((a, b) => b.localeCompare(a))

  function byPeriod(period: string) {
    const recs = records.filter(r => r.period === period)
    const receitas = recs.filter(r => r.type === 'receita')
    const despesas = recs.filter(r => r.type === 'despesa')
    const totalReceita = receitas.reduce((s, r) => s + Number(r.amount), 0)
    const totalDespesa = despesas.reduce((s, r) => s + Number(r.amount), 0)
    return { receitas, despesas, totalReceita, totalDespesa, saldo: totalReceita - totalDespesa }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* <img
            src="/logo.svg"
            alt="Protetoras TL"
            className="h-8 w-8 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline' }}
          /> */}
          <PawPrint className="text-brand-600" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <Link to="/" className="text-sm text-stone-500 hover:text-stone-700">← Início</Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Transparência Financeira</h1>
          <p className="text-stone-500 leading-relaxed">
            Prestação de contas pública da ONG Protetoras Três Lagoas. Todos os recursos arrecadados são utilizados exclusivamente no cuidado, resgate e tratamento dos animais.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-stone-400">Carregando…</div>
        ) : periods.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Scale size={32} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum registro financeiro publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {periods.map(period => {
              const { receitas, despesas, totalReceita, totalDespesa, saldo } = byPeriod(period)
              return (
                <div key={period} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {/* Period header */}
                  <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-semibold text-stone-800 text-lg">{period}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-brand-700 font-medium flex items-center gap-1">
                        <TrendingUp size={14} />{fmt(totalReceita)}
                      </span>
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <TrendingDown size={14} />{fmt(totalDespesa)}
                      </span>
                      <span className={`font-semibold flex items-center gap-1 ${saldo >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                        <Scale size={14} />Saldo: {fmt(saldo)}
                      </span>
                    </div>
                  </div>

                  {/* Receitas */}
                  {receitas.length > 0 && (
                    <div className="px-6 pt-4 pb-2">
                      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-3">Entradas</p>
                      <div className="space-y-2">
                        {receitas.map(r => (
                          <div key={r.id} className="flex items-start justify-between gap-4 text-sm py-1.5 border-b border-stone-50">
                            <div className="min-w-0">
                              <p className="text-stone-700">{r.description}</p>
                              {(r.category || r.source) && (
                                <p className="text-xs text-stone-400">{[r.category, r.source].filter(Boolean).join(' · ')}</p>
                              )}
                            </div>
                            <span className="font-medium text-brand-700 shrink-0">{fmt(Number(r.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Despesas */}
                  {despesas.length > 0 && (
                    <div className="px-6 pt-4 pb-5">
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Saídas</p>
                      <div className="space-y-2">
                        {despesas.map(r => (
                          <div key={r.id} className="flex items-start justify-between gap-4 text-sm py-1.5 border-b border-stone-50">
                            <div className="min-w-0">
                              <p className="text-stone-700">{r.description}</p>
                              {(r.category || r.source) && (
                                <p className="text-xs text-stone-400">{[r.category, r.source].filter(Boolean).join(' · ')}</p>
                              )}
                            </div>
                            <span className="font-medium text-red-600 shrink-0">{fmt(Number(r.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white px-6 py-6 text-center text-stone-400 text-sm mt-12">
        © {new Date().getFullYear()} Protetoras Três Lagoas
      </footer>
    </div>
  )
}
