import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, PawPrint, Stethoscope, Syringe, Home,
  Plus, Pencil, Loader2, AlertCircle, LogOut, Clock, Trash2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type {
  Animal, AnimalRescue, SanitaryProcedure, MedicalRecord,
  AnimalCustody, Custodian, Clinic,
} from '@/types/database'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  EditAnimalModal, EditRescueModal, AddSanitaryModal, AddMedicalRecordModal,
  AddCustodyModal, EditCustodyModal, DeleteCustodyModal, EndCustodyModal,
  SANITARY_LABELS, VISIT_LABELS, EXAM_RESULT_LABELS,
  CUSTODY_TYPE_LABELS, CUSTODY_END_LABELS,
} from './AnimalDetailModals'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pendente_resgate: 'bg-red-50 text-red-600 border-red-200',
  resgatado:        'bg-orange-50 text-orange-700 border-orange-200',
  lar_temporario:   'bg-blue-50 text-blue-700 border-blue-200',
  disponivel:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  adotado:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  obito:            'bg-stone-50 text-stone-500 border-stone-200',
}
const STATUS_LABELS: Record<string, string> = {
  pendente_resgate: 'Pendente resgate', resgatado: 'Resgatado',
  lar_temporario: 'Lar temporário', disponivel: 'Disponível',
  adotado: 'Adotado', obito: 'Óbito',
}
const SEX_LABELS:     Record<string, string> = { macho: 'Macho', femea: 'Fêmea', indefinido: 'Indefinido' }
const SPECIES_LABELS: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }
const EXAM_RESULT_COLORS: Record<string, string> = {
  aguardando:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  reagente:     'bg-red-50 text-red-600 border-red-200',
  nao_reagente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inconclusivo: 'bg-stone-50 text-stone-500 border-stone-200',
}

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}
function fmtDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Small components ─────────────────────────────────────────────────────────

function Section({ icon: Icon, title, action, children }: {
  icon: React.ElementType; title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-xl border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-emerald-600" />
          <h2 className="font-semibold text-stone-700">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm text-stone-700 font-medium">{value || '—'}</p>
    </div>
  )
}

interface AuditEvent {
  id: string; timestamp: string; actor: string
  description: string; icon: 'paw' | 'rescue' | 'syringe' | 'stethoscope' | 'home'
}

// ─── Custody action menu ──────────────────────────────────────────────────────

type CustodyAction = { type: 'edit' | 'delete' | 'end'; custody: AnimalCustody }

// ─── Main page ────────────────────────────────────────────────────────────────

type MainModal = 'edit_animal' | 'edit_rescue' | 'add_sanitary' | 'add_medical' | 'add_custody' | null

export default function AnimalDetail() {
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)
  const [mainModal, setMainModal]     = useState<MainModal>(null)
  const [custodyAction, setCustodyAction] = useState<CustodyAction | null>(null)

  const [animal,     setAnimal]     = useState<Animal | null>(null)
  const [rescue,     setRescue]     = useState<AnimalRescue | null>(null)
  const [sanitary,   setSanitary]   = useState<SanitaryProcedure[]>([])
  const [records,    setRecords]    = useState<MedicalRecord[]>([])
  const [custody,    setCustody]    = useState<AnimalCustody[]>([])
  const [custodians, setCustodians] = useState<Custodian[]>([])
  const [clinics,    setClinics]    = useState<Clinic[]>([])
  const [auditLog,   setAuditLog]   = useState<AuditEvent[]>([])

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const [
      { data: animalData, error: animalErr },
      { data: rescueData },
      { data: sanitaryData },
      { data: recordsData },
      { data: custodyData },
      { data: custodiansData },
      { data: clinicsData },
    ] = await Promise.all([
      supabase.from('animals').select('*').eq('id', id!).single(),
      supabase.from('animal_rescues').select('*').eq('animal_id', id!).maybeSingle(),
      supabase.from('sanitary_procedures').select('*').eq('animal_id', id!).order('performed_date', { ascending: false }),
      supabase.from('medical_records').select('*, clinic:clinics(id,name), exams(*), medications(*)').eq('animal_id', id!).order('visit_date', { ascending: false }),
      supabase.from('animal_custody').select('*, custodian:custodians(id,full_name,phone,email,cpf,address_street,address_neighborhood,address_city,notes)').eq('animal_id', id!).order('started_at', { ascending: false }),
      supabase.from('custodians').select('*').is('deleted_at', null).order('full_name'),
      supabase.from('clinics').select('*').is('deleted_at', null).order('name'),
    ])
    if (animalErr || !animalData) { setNotFound(true); setLoading(false); return }
    const a = animalData as Animal
    const re = rescueData as AnimalRescue | null
    const sa = (sanitaryData ?? []) as SanitaryProcedure[]
    const mr = (recordsData  ?? []) as MedicalRecord[]
    const cu = (custodyData  ?? []) as AnimalCustody[]
    setAnimal(a); setRescue(re); setSanitary(sa); setRecords(mr); setCustody(cu)
    setCustodians((custodiansData ?? []) as Custodian[])
    setClinics((clinicsData ?? []) as Clinic[])
    buildAuditLog(a, re, sa, mr, cu)
    setLoading(false)
  }

  async function buildAuditLog(a: Animal, re: AnimalRescue | null, sa: SanitaryProcedure[], mr: MedicalRecord[], cu: AnimalCustody[]) {
    const uids = new Set<string>()
    ;[a.created_by, a.updated_by, re?.created_by, ...sa.map(s => s.created_by), ...mr.map(m => m.created_by), ...cu.map(c => c.created_by)]
      .filter(Boolean).forEach(u => uids.add(u!))
    let profileMap: Record<string, string> = {}
    if (uids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', [...uids])
      profiles?.forEach(p => { profileMap[p.id] = p.display_name })
    }
    const actor = (uid?: string | null) => uid ? (profileMap[uid] ?? uid.slice(0, 8) + '…') : 'Sistema'
    const events: AuditEvent[] = [
      { id: `a-${a.id}`, timestamp: a.created_at, actor: actor(a.created_by), description: 'cadastrou o animal', icon: 'paw' },
      ...(re ? [{ id: `r-${re.id}`, timestamp: re.created_at, actor: actor(re.created_by), description: `registrou o resgate (${fmt(re.rescue_date)})`, icon: 'rescue' as const }] : []),
      ...sa.map(s => ({ id: `s-${s.id}`, timestamp: s.created_at, actor: actor(s.created_by), description: `procedimento: ${SANITARY_LABELS[s.procedure_type] ?? s.procedure_type}`, icon: 'syringe' as const })),
      ...mr.map(m => ({ id: `m-${m.id}`, timestamp: m.created_at, actor: actor(m.created_by), description: `atendimento médico (${fmt(m.visit_date)})`, icon: 'stethoscope' as const })),
      ...cu.map(c => ({ id: `c-${c.id}`, timestamp: c.created_at, actor: actor(c.created_by), description: `${CUSTODY_TYPE_LABELS[c.custody_type]} — ${(c as any).custodian?.full_name ?? ''}`, icon: 'home' as const })),
    ]
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    setAuditLog(events)
  }

  function pushAuditEvent(event: AuditEvent) {
    setAuditLog(prev => [event, ...prev].sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-stone-400 gap-2 p-20">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
    </div>
  )
  if (notFound || !animal) return (
    <div className="p-8 flex flex-col items-center gap-3 text-stone-400">
      <AlertCircle size={32} /><p className="text-sm">Animal não encontrado.</p>
      <Link to="/dashboard/animais" className="text-emerald-600 text-sm hover:underline">← Voltar</Link>
    </div>
  )

  const activeCustody = custody.find(c => c.is_active) ?? null

  const AuditIcon = ({ type }: { type: AuditEvent['icon'] }) => {
    const cls = 'size-3 text-stone-400'
    if (type === 'paw')         return <PawPrint className={cls} />
    if (type === 'rescue')      return <AlertCircle className={cls} />
    if (type === 'syringe')     return <Syringe className={cls} />
    if (type === 'stethoscope') return <Stethoscope className={cls} />
    return <Home className={cls} />
  }

  return (
    <div className="flex gap-6 p-8 min-h-full">
      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 text-stone-500 -ml-2">
          <Link to="/dashboard/animais"><ArrowLeft size={15} className="mr-1" />Voltar</Link>
        </Button>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800 mb-1">{animal.name}</h1>
            <p className="text-stone-400 text-sm">
              {SPECIES_LABELS[animal.species]} · {SEX_LABELS[animal.sex]}
              {animal.breed ? ` · ${animal.breed}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_COLORS[animal.status]}>{STATUS_LABELS[animal.status]}</Badge>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMainModal('edit_animal')}>
              <Pencil size={13} />Editar
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Identificação */}
          <Section icon={PawPrint} title="Identificação & Resgate"
            action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMainModal('edit_rescue')}>
              <Pencil size={13} />{rescue ? 'Editar' : 'Registrar resgate'}
            </Button>}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <InfoRow label="Pelagem"             value={animal.coat_description} />
              <InfoRow label="Nascimento estimado" value={fmt(animal.birth_estimate)} />
              {rescue ? (
                <>
                  <InfoRow label="Data do resgate"  value={fmt(rescue.rescue_date)} />
                  <InfoRow label="Resgatado por"    value={rescue.rescued_by} />
                  <InfoRow label="Local do resgate" value={rescue.rescue_location} />
                  {rescue.rescue_notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400 mb-0.5">Obs. do resgate</p>
                      <p className="text-sm text-stone-600">{rescue.rescue_notes}</p>
                    </div>
                  )}
                </>
              ) : <div className="col-span-2 text-stone-400 text-sm italic">Resgate ainda não registrado.</div>}
              {animal.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-stone-400 mb-0.5">Observações gerais</p>
                  <p className="text-sm text-stone-600">{animal.notes}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Custódia */}
          <Section icon={Home} title="Custódia & Adoção"
            action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMainModal('add_custody')}>
              <Plus size={13} />Registrar custódia
            </Button>}>
            {custody.length === 0
              ? <p className="text-stone-400 text-sm">Nenhuma custódia registrada.</p>
              : <div className="space-y-3">
                {custody.map(c => {
                  const cust = (c as any).custodian
                  const isAdocao = c.custody_type === 'adocao'
                  return (
                    <div key={c.id} className={`rounded-lg border p-4 ${c.is_active
                      ? isAdocao ? 'border-emerald-200 bg-emerald-50/40' : 'border-blue-200 bg-blue-50/30'
                      : 'border-stone-100 bg-stone-50 opacity-70'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={`text-xs ${isAdocao ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {CUSTODY_TYPE_LABELS[c.custody_type]}
                            </Badge>
                            {c.is_active
                              ? <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Ativo</Badge>
                              : <Badge variant="outline" className="text-xs bg-stone-100 text-stone-400">Encerrado</Badge>}
                          </div>
                          <p className="text-sm font-semibold text-stone-800">{cust?.full_name ?? '—'}</p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                            <InfoRow label="Telefone" value={cust?.phone} />
                            <InfoRow label="Email"    value={cust?.email} />
                            {cust?.cpf && <InfoRow label="CPF" value={cust.cpf} />}
                            {(cust?.address_street || cust?.address_city) && (
                              <InfoRow label="Endereço"
                                value={[cust?.address_street, cust?.address_neighborhood, cust?.address_city].filter(Boolean).join(', ')} />
                            )}
                          </div>
                          {cust?.notes && <p className="text-xs text-stone-400 mt-2">{cust.notes}</p>}
                          <div className="flex gap-6 mt-3 text-xs text-stone-500">
                            <span>Início: <strong>{fmt(c.started_at)}</strong></span>
                            {c.termo_date && <span>Termo: <strong>{fmt(c.termo_date)}</strong></span>}
                            {c.ended_at && <span>Fim: <strong>{fmt(c.ended_at)}</strong></span>}
                          </div>
                          {c.end_reason && (
                            <p className="text-xs text-red-500 mt-1">{CUSTODY_END_LABELS[c.end_reason]}{c.end_notes ? ` — ${c.end_notes}` : ''}</p>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                            onClick={() => setCustodyAction({ type: 'edit', custody: c })}>
                            <Pencil size={11} />Editar
                          </Button>
                          {c.is_active && (
                            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => setCustodyAction({ type: 'end', custody: c })}>
                              <LogOut size={11} />Encerrar
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs text-red-400 border-red-100 hover:bg-red-50"
                            onClick={() => setCustodyAction({ type: 'delete', custody: c })}>
                            <Trash2 size={11} />Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </Section>

          {/* Sanitary */}
          <Section icon={Syringe} title="Procedimentos Sanitários"
            action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMainModal('add_sanitary')}>
              <Plus size={13} />Adicionar
            </Button>}>
            {sanitary.length === 0
              ? <p className="text-stone-400 text-sm">Nenhum procedimento registrado.</p>
              : <div className="overflow-hidden rounded-lg border border-stone-100">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>{['Procedimento', 'Realizado em', 'Próxima aplicação', 'Obs.'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-stone-500 font-medium uppercase tracking-wide">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {sanitary.map(p => (
                      <tr key={p.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50">
                        <td className="px-3 py-2.5 font-medium text-stone-700">{SANITARY_LABELS[p.procedure_type] ?? p.procedure_type}</td>
                        <td className="px-3 py-2.5 text-stone-500">{fmt(p.performed_date)}</td>
                        <td className="px-3 py-2.5 text-stone-500">{fmt(p.next_due_date)}</td>
                        <td className="px-3 py-2.5 text-stone-400 text-xs">{p.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </Section>

          {/* Medical records */}
          <Section icon={Stethoscope} title="Histórico Médico"
            action={<Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMainModal('add_medical')}>
              <Plus size={13} />Novo atendimento
            </Button>}>
            {records.length === 0
              ? <p className="text-stone-400 text-sm">Nenhum atendimento registrado.</p>
              : <div className="space-y-4">
                {records.map(r => {
                  const exams = (r as any).exams ?? []
                  const meds  = (r as any).medications ?? []
                  return (
                    <div key={r.id} className="border border-stone-200 rounded-lg overflow-hidden">
                      <div className="flex items-start justify-between p-4 bg-stone-50 border-b border-stone-100">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-semibold text-stone-800">{fmt(r.visit_date)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{VISIT_LABELS[r.visit_type] ?? r.visit_type}</Badge>
                              {(r as any).clinic && <span className="text-xs text-stone-400">{(r as any).clinic.name}</span>}
                            </div>
                          </div>
                        </div>
                        {r.vet_name && <span className="text-xs text-stone-400">Dr(a). {r.vet_name}</span>}
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-xs text-stone-400 mb-1 font-medium uppercase tracking-wide">Descrição</p>
                          <p className="text-sm text-stone-700">{r.description}</p>
                        </div>
                        {(r.follow_up_date || r.follow_up_notes) && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <Clock size={13} className="text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-amber-700">
                              {r.follow_up_date && <span className="font-medium">Retorno em {fmt(r.follow_up_date)}</span>}
                              {r.follow_up_notes && <span className="ml-1">— {r.follow_up_notes}</span>}
                            </div>
                          </div>
                        )}
                        {exams.length > 0 && (
                          <div>
                            <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">Exames</p>
                            <div className="space-y-1">
                              {exams.map((e: any) => (
                                <div key={e.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-stone-50 border border-stone-100">
                                  <div>
                                    <span className="text-sm font-medium text-stone-700">{e.exam_name}</span>
                                    {e.exam_date && <span className="text-xs text-stone-400 ml-2">{fmt(e.exam_date)}</span>}
                                    {e.result_detail && <span className="text-xs text-stone-500 ml-2">— {e.result_detail}</span>}
                                  </div>
                                  <Badge variant="outline" className={`text-xs ${EXAM_RESULT_COLORS[e.result]}`}>
                                    {EXAM_RESULT_LABELS[e.result]}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {meds.length > 0 && (
                          <div>
                            <p className="text-xs text-stone-400 mb-2 font-medium uppercase tracking-wide">Medicamentos</p>
                            <div className="space-y-1">
                              {meds.map((m: any) => (
                                <div key={m.id} className="flex items-start justify-between py-1.5 px-3 rounded-lg bg-stone-50 border border-stone-100">
                                  <div>
                                    <span className="text-sm font-medium text-stone-700">{m.name}</span>
                                    {m.dosage    && <span className="text-xs text-stone-400 ml-2">{m.dosage}</span>}
                                    {m.frequency && <span className="text-xs text-stone-400 ml-1">· {m.frequency}</span>}
                                  </div>
                                  <div className="text-xs text-stone-400 text-right">
                                    {m.duration_days && <p>{m.duration_days} dias</p>}
                                    {m.start_date    && <p>Início: {fmt(m.start_date)}</p>}
                                    {m.notes         && <p className="italic">{m.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            }
          </Section>
        </div>
      </div>

      {/* ── Audit sidebar ───────────────────────────────────────── */}
      <aside className="w-64 shrink-0">
        <div className="sticky top-8">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-stone-700">Histórico de atividade</h3>
            </div>
            {auditLog.length === 0
              ? <p className="text-xs text-stone-400">Sem atividades registradas.</p>
              : <div className="relative">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-stone-100" />
                <ul className="space-y-4">
                  {auditLog.map(event => (
                    <li key={event.id} className="flex gap-3 relative">
                      <div className="size-4 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 mt-0.5 z-10">
                        <AuditIcon type={event.icon} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-stone-600 leading-snug">
                          <span className="font-medium text-stone-800">{event.actor}</span>{' '}{event.description}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">{fmtDatetime(event.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            }
          </div>
        </div>
      </aside>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <EditAnimalModal open={mainModal === 'edit_animal'} onClose={() => setMainModal(null)} animal={animal}
        onUpdated={(a) => { setAnimal(a); pushAuditEvent({ id: `edit-${Date.now()}`, timestamp: new Date().toISOString(), actor: 'Você', description: 'editou os dados do animal', icon: 'paw' }); setMainModal(null) }} />

      <EditRescueModal open={mainModal === 'edit_rescue'} onClose={() => setMainModal(null)} animalId={animal.id} rescue={rescue}
        onSaved={(r) => { setRescue(r); pushAuditEvent({ id: `rescue-edit-${Date.now()}`, timestamp: new Date().toISOString(), actor: 'Você', description: `${rescue ? 'editou' : 'registrou'} o resgate`, icon: 'rescue' }); setMainModal(null) }} />

      <AddSanitaryModal open={mainModal === 'add_sanitary'} onClose={() => setMainModal(null)} animalId={animal.id}
        onAdded={(p) => { setSanitary(prev => [p, ...prev]); pushAuditEvent({ id: `s-new-${p.id}`, timestamp: p.created_at, actor: 'Você', description: `procedimento: ${SANITARY_LABELS[p.procedure_type]}`, icon: 'syringe' }) }} />

      <AddMedicalRecordModal open={mainModal === 'add_medical'} onClose={() => setMainModal(null)} animalId={animal.id}
        clinics={clinics}
        onAdded={(r) => { setRecords(prev => [r, ...prev]); pushAuditEvent({ id: `m-new-${r.id}`, timestamp: r.created_at, actor: 'Você', description: `atendimento médico (${fmt(r.visit_date)})`, icon: 'stethoscope' }) }}
        onClinicCreated={(c) => setClinics(prev => [...prev, c])} />

      <AddCustodyModal open={mainModal === 'add_custody'} onClose={() => setMainModal(null)}
        animalId={animal.id} activeCustodyId={activeCustody?.id ?? null} custodians={custodians}
        onAdded={(c, newStatus) => {
          setAnimal(prev => prev ? { ...prev, status: newStatus as any } : prev)
          setCustody(prev => prev.map(x => x.is_active && x.id !== c.id ? { ...x, is_active: false, ended_at: c.started_at } : x).concat([c]).sort((a, b) => b.started_at.localeCompare(a.started_at)))
          pushAuditEvent({ id: `c-new-${c.id}`, timestamp: c.created_at, actor: 'Você', description: `${CUSTODY_TYPE_LABELS[c.custody_type]} — ${(c as any).custodian?.full_name ?? ''}`, icon: 'home' })
        }}
        onCustodianCreated={(c) => setCustodians(prev => [...prev, c])} />

      {/* Custody-specific action modals */}
      {custodyAction?.type === 'edit' && (
        <EditCustodyModal open onClose={() => setCustodyAction(null)}
          custody={custodyAction.custody} animalId={animal.id}
          onUpdated={(updated) => {
            setCustody(prev => prev.map(c => c.id === updated.id ? updated : c))
            if (updated.is_active) setAnimal(prev => prev ? { ...prev, status: updated.custody_type === 'adocao' ? 'adotado' : 'lar_temporario' as any } : prev)
            setCustodyAction(null)
          }} />
      )}

      {custodyAction?.type === 'delete' && (
        <DeleteCustodyModal open onClose={() => setCustodyAction(null)}
          custody={custodyAction.custody} animalId={animal.id}
          onDeleted={(deletedId, newStatus) => {
            setCustody(prev => prev.filter(c => c.id !== deletedId))
            setAnimal(prev => prev ? { ...prev, status: newStatus as any } : prev)
            setCustodyAction(null)
          }} />
      )}

      {custodyAction?.type === 'end' && (
        <EndCustodyModal open onClose={() => setCustodyAction(null)}
          custody={custodyAction.custody} animalId={animal.id}
          onEnded={(cid, ended_at, end_reason, end_notes, newStatus) => {
            setCustody(prev => prev.map(c => c.id === cid ? { ...c, is_active: false, ended_at, end_reason: end_reason as any, end_notes } : c))
            setAnimal(prev => prev ? { ...prev, status: newStatus as any } : prev)
            pushAuditEvent({ id: `c-end-${cid}`, timestamp: new Date().toISOString(), actor: 'Você', description: `encerrou custódia (${CUSTODY_END_LABELS[end_reason]})`, icon: 'home' })
            setCustodyAction(null)
          }} />
      )}
    </div>
  )
}