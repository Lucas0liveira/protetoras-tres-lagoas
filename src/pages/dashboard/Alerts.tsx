import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, Clock, ExternalLink, Pill } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

interface PharmacyAlert {
  id: string
  name: string
  expiration_date: string
  quantity: number
  unit: string
  daysUntil: number
}

interface FollowUpAlert {
  id: string
  animal_id: string
  animal_name: string
  visit_date: string
  visit_type: string
  follow_up_date: string
  follow_up_notes: string | null
  daysUntil: number
}

const VISIT_TYPE_LABELS: Record<string, string> = {
  rotina: 'Rotina', emergencia: 'Emergência',
  retorno: 'Retorno', cirurgia: 'Cirurgia', outro: 'Outro',
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function absDays(n: number) {
  const abs = Math.abs(n)
  return abs === 0 ? 'hoje' : abs === 1 ? '1 dia' : `${abs} dias`
}

export async function loadAlertCount(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 30)
  const soonStr = soon.toISOString().split('T')[0]

  const [{ count: pharma }, { count: followUps }] = await Promise.all([
    supabase
      .from('pharmacy_items')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', soonStr),
    supabase
      .from('medical_records')
      .select('id', { count: 'exact', head: true })
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', soonStr),
  ])
  return (pharma ?? 0) + (followUps ?? 0)
}

export default function AlertsPage() {
  const [pharmacyAlerts,  setPharmacyAlerts]  = useState<PharmacyAlert[]>([])
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUpAlert[]>([])
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUpAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const soon = new Date(today)
    soon.setDate(soon.getDate() + 30)
    const soonStr = soon.toISOString().split('T')[0]

    const [{ data: pharmaData }, { data: followUpData }] = await Promise.all([
      supabase
        .from('pharmacy_items')
        .select('id, name, expiration_date, quantity, unit')
        .is('deleted_at', null)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', soonStr)
        .order('expiration_date', { ascending: true }),
      supabase
        .from('medical_records')
        .select('id, animal_id, visit_date, visit_type, follow_up_date, follow_up_notes, animal:animals(id, name, deleted_at)')
        .not('follow_up_date', 'is', null)
        .lte('follow_up_date', soonStr)
        .order('follow_up_date', { ascending: true }),
    ])

    const ms = 1000 * 60 * 60 * 24

    const pa: PharmacyAlert[] = (pharmaData ?? []).map((item: any) => ({
      id:              item.id,
      name:            item.name,
      expiration_date: item.expiration_date,
      quantity:        item.quantity,
      unit:            item.unit,
      daysUntil:       Math.round((new Date(item.expiration_date + 'T00:00:00').getTime() - today.getTime()) / ms),
    }))
    setPharmacyAlerts(pa)

    const allFollowUps: FollowUpAlert[] = (followUpData ?? [])
      .filter((r: any) => r.animal && !(r.animal as any).deleted_at)
      .map((r: any) => ({
        id:              r.id,
        animal_id:       r.animal_id,
        animal_name:     (r.animal as any)?.name ?? '—',
        visit_date:      r.visit_date,
        visit_type:      r.visit_type,
        follow_up_date:  r.follow_up_date,
        follow_up_notes: r.follow_up_notes,
        daysUntil:       Math.round((new Date(r.follow_up_date + 'T00:00:00').getTime() - today.getTime()) / ms),
      }))

    setOverdueFollowUps(allFollowUps.filter(f => f.daysUntil < 0).sort((a, b) => a.daysUntil - b.daysUntil))
    setUpcomingFollowUps(allFollowUps.filter(f => f.daysUntil >= 0))
    setLoading(false)
  }

  const total = pharmacyAlerts.length + overdueFollowUps.length + upcomingFollowUps.length

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={20} className="text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Alertas internos</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {loading ? 'Carregando…' : total === 0 ? 'Nenhum alerta no momento.' : `${total} alerta${total > 1 ? 's' : ''} pendente${total > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400">Carregando…</div>
      ) : total === 0 ? (
        <div className="text-center py-16 text-stone-300">
          <Bell size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-stone-400">Tudo em dia. Nenhum alerta no momento.</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Medicamentos ─────────────────────────────────────── */}
          {pharmacyAlerts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pill size={14} className="text-red-500" />
                <h2 className="font-semibold text-stone-700">Medicamentos com validade próxima ou vencida</h2>
                <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">{pharmacyAlerts.length}</Badge>
              </div>
              <div className="space-y-2">
                {pharmacyAlerts.map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800">{a.name}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {a.daysUntil < 0
                          ? `Vencido há ${absDays(a.daysUntil)} · ${fmt(a.expiration_date)}`
                          : a.daysUntil === 0
                            ? `Vence hoje · ${fmt(a.expiration_date)}`
                            : `Vence em ${absDays(a.daysUntil)} · ${fmt(a.expiration_date)}`}
                      </p>
                    </div>
                    <div className="text-xs text-red-500 text-right shrink-0">
                      <p>{a.quantity} {a.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/dashboard/farmacia" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mt-2">
                <ExternalLink size={11} />Ver farmácia
              </Link>
            </section>
          )}

          {/* ── Retornos atrasados ────────────────────────────────── */}
          {overdueFollowUps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-orange-500" />
                <h2 className="font-semibold text-stone-700">Retornos atrasados</h2>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">{overdueFollowUps.length}</Badge>
              </div>
              <div className="space-y-2">
                {overdueFollowUps.map(f => (
                  <Link key={f.id} to={`/dashboard/animais/${f.animal_id}`}
                    className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100 transition-colors">
                    <AlertTriangle size={15} className="text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-orange-800">{f.animal_name}</p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        Retorno era {fmt(f.follow_up_date)} · atrasado há {absDays(f.daysUntil)}
                        {f.follow_up_notes && ` · ${f.follow_up_notes}`}
                      </p>
                      <p className="text-xs text-orange-400 mt-0.5">
                        Atendimento: {fmt(f.visit_date)} · {VISIT_TYPE_LABELS[f.visit_type] ?? f.visit_type}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-orange-400 shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Retornos próximos ─────────────────────────────────── */}
          {upcomingFollowUps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-yellow-500" />
                <h2 className="font-semibold text-stone-700">Retornos próximos</h2>
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">{upcomingFollowUps.length}</Badge>
              </div>
              <div className="space-y-2">
                {upcomingFollowUps.map(f => (
                  <Link key={f.id} to={`/dashboard/animais/${f.animal_id}`}
                    className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 hover:bg-yellow-100 transition-colors">
                    <Clock size={15} className="text-yellow-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-yellow-800">{f.animal_name}</p>
                      <p className="text-xs text-yellow-600 mt-0.5">
                        {f.daysUntil === 0 ? 'Retorno hoje' : `Retorno em ${absDays(f.daysUntil)}`}
                        {' · '}{fmt(f.follow_up_date)}
                        {f.follow_up_notes && ` · ${f.follow_up_notes}`}
                      </p>
                      <p className="text-xs text-yellow-400 mt-0.5">
                        Atendimento: {fmt(f.visit_date)} · {VISIT_TYPE_LABELS[f.visit_type] ?? f.visit_type}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
