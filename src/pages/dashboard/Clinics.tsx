import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2, Pencil, Trash2, ChevronDown, ChevronUp, Building2, DollarSign } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { Clinic, ClinicProcedureCost } from '@/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicWithCosts extends Clinic { costs: ClinicProcedureCost[] }

// ─── Clinic form ──────────────────────────────────────────────────────────────

const clinicSchema = z.object({
  name: z.string().min(1, 'Obrigatório'), phone: z.string().optional(),
  address: z.string().optional(), contact_vet: z.string().optional(), notes: z.string().optional(),
})
type ClinicValues = z.infer<typeof clinicSchema>

function ClinicModal({ open, onClose, clinic, onSaved }: {
  open: boolean; onClose: () => void; clinic: ClinicWithCosts | null; onSaved: (c: Clinic) => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ClinicValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: clinic?.name ?? '', phone: clinic?.phone ?? '', address: clinic?.address ?? '',
      contact_vet: clinic?.contact_vet ?? '', notes: clinic?.notes ?? '',
    },
  })

  async function onSubmit(values: ClinicValues) {
    const payload = { name: values.name, phone: values.phone || null, address: values.address || null,
      contact_vet: values.contact_vet || null, notes: values.notes || null }
    const { data, error } = clinic
      ? await supabase.from('clinics').update(payload).eq('id', clinic.id).select().single()
      : await supabase.from('clinics').insert(payload).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(clinic ? 'Clínica atualizada!' : 'Clínica cadastrada!')
    onSaved(data as Clinic); reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{clinic ? 'Editar clínica' : 'Nova clínica'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nome *</Label><Input {...register('name')} />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Telefone</Label><Input {...register('phone')} /></div>
            <div className="space-y-1.5"><Label>Veterinário responsável</Label><Input {...register('contact_vet')} /></div>
          </div>
          <div className="space-y-1.5"><Label>Endereço</Label><Input {...register('address')} /></div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('notes')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cost form ────────────────────────────────────────────────────────────────

const costSchema = z.object({
  procedure_name: z.string().min(1, 'Obrigatório'),
  cost: z.string().optional(),
  notes: z.string().optional(),
})
type CostValues = z.infer<typeof costSchema>

function CostModal({ open, onClose, clinicId, cost, onSaved }: {
  open: boolean; onClose: () => void; clinicId: string
  cost: ClinicProcedureCost | null; onSaved: (c: ClinicProcedureCost) => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CostValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      procedure_name: cost?.procedure_name ?? '',
      cost: cost?.cost?.toString() ?? '',
      notes: cost?.notes ?? '',
    },
  })

  async function onSubmit(values: CostValues) {
    const payload = {
      clinic_id: clinicId, procedure_name: values.procedure_name,
      cost: values.cost ? parseFloat(values.cost) : null, notes: values.notes || null,
    }
    const { data, error } = cost
      ? await supabase.from('clinic_procedure_costs').update(payload).eq('id', cost.id).select().single()
      : await supabase.from('clinic_procedure_costs').insert(payload).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Procedimento salvo!')
    onSaved(data as ClinicProcedureCost); reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{cost ? 'Editar procedimento' : 'Adicionar procedimento'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nome do procedimento *</Label><Input {...register('procedure_name')} />
            {errors.procedure_name && <p className="text-red-500 text-xs">{errors.procedure_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Custo (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
              <Input type="number" step="0.01" className="pl-9" placeholder="0,00" {...register('cost')} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('notes')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Clinic card ──────────────────────────────────────────────────────────────

function ClinicCard({ clinic, onEdit, onCostAdded, onCostUpdated, onCostDeleted }: {
  clinic: ClinicWithCosts
  onEdit: () => void
  onCostAdded: (c: ClinicProcedureCost) => void
  onCostUpdated: (c: ClinicProcedureCost) => void
  onCostDeleted: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [costModal, setCostModal] = useState(false)
  const [editCost, setEditCost] = useState<ClinicProcedureCost | null>(null)

  async function deleteCost(id: string) {
    if (!confirm('Remover este procedimento?')) return
    const { error } = await supabase.from('clinic_procedure_costs').delete().eq('id', id)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Procedimento removido.')
    onCostDeleted(id)
  }

  const fmt = (v: number | null) => v != null
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—'

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="flex items-start justify-between p-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={15} className="text-brand-600" />
            <h3 className="font-semibold text-stone-800">{clinic.name}</h3>
          </div>
          <div className="flex flex-wrap gap-x-4 text-xs text-stone-400 mt-1">
            {clinic.phone       && <span>{clinic.phone}</span>}
            {clinic.contact_vet && <span>Dr(a). {clinic.contact_vet}</span>}
            {clinic.address     && <span>{clinic.address}</span>}
          </div>
          {clinic.notes && <p className="text-xs text-stone-400 mt-1 italic">{clinic.notes}</p>}
          {clinic.costs.length > 0 && (
            <p className="text-xs text-stone-500 mt-2">
              <span className="font-medium">{clinic.costs.length}</span> procedimento{clinic.costs.length !== 1 ? 's' : ''} cadastrado{clinic.costs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onEdit}>
            <Pencil size={11} />Editar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-400" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-brand-600" />
              <p className="text-sm font-semibold text-stone-700">Tabela de procedimentos</p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
              onClick={() => { setEditCost(null); setCostModal(true) }}>
              <Plus size={11} />Adicionar
            </Button>
          </div>
          {clinic.costs.length === 0 ? (
            <p className="text-xs text-stone-400 italic">Nenhum procedimento cadastrado ainda.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-stone-100">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-stone-500 font-medium uppercase tracking-wide">Procedimento</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-500 font-medium uppercase tracking-wide">Custo</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-500 font-medium uppercase tracking-wide">Obs.</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {clinic.costs.map(c => (
                    <tr key={c.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50">
                      <td className="px-3 py-2.5 font-medium text-stone-700">{c.procedure_name}</td>
                      <td className="px-3 py-2.5 text-brand-700 font-medium">{fmt(c.cost)}</td>
                      <td className="px-3 py-2.5 text-stone-400 text-xs">{c.notes ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-stone-700"
                            onClick={() => { setEditCost(c); setCostModal(true) }}><Pencil size={11} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600"
                            onClick={() => deleteCost(c.id)}><Trash2 size={11} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CostModal open={costModal} onClose={() => { setCostModal(false); setEditCost(null) }}
        clinicId={clinic.id} cost={editCost}
        onSaved={(c) => {
          if (editCost) onCostUpdated(c); else onCostAdded(c)
          setCostModal(false); setEditCost(null)
        }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Clinics() {
  const [clinics, setClinics] = useState<ClinicWithCosts[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<ClinicWithCosts | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clinics')
      .select('*, costs:clinic_procedure_costs(*)')
      .is('deleted_at', null)
      .order('name')
    if (error) { toast.error('Erro ao carregar clínicas'); setLoading(false); return }
    setClinics((data ?? []).map((c: any) => ({ ...c, costs: c.costs ?? [] })))
    setLoading(false)
  }

  function handleSaved(saved: Clinic) {
    setClinics(prev => {
      const exists = prev.find(c => c.id === saved.id)
      if (exists) return prev.map(c => c.id === saved.id ? { ...c, ...saved } : c)
      return [...prev, { ...saved, costs: [] }].sort((a, b) => a.name.localeCompare(b.name))
    })
    setModal(false); setEditing(null)
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Clínicas</h1>
          <p className="text-stone-400 text-sm mt-1">Clínicas parceiras e tabela de procedimentos</p>
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 gap-2" onClick={() => { setEditing(null); setModal(true) }}>
          <Plus size={16} />Nova clínica
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
          <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : clinics.length === 0 ? (
        <div className="py-20 text-center text-stone-400 text-sm bg-white rounded-xl border border-stone-200">
          Nenhuma clínica cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {clinics.map(c => (
            <ClinicCard key={c.id} clinic={c}
              onEdit={() => { setEditing(c); setModal(true) }}
              onCostAdded={(cost) => setClinics(prev => prev.map(cl => cl.id === c.id ? { ...cl, costs: [...cl.costs, cost] } : cl))}
              onCostUpdated={(cost) => setClinics(prev => prev.map(cl => cl.id === c.id ? { ...cl, costs: cl.costs.map(x => x.id === cost.id ? cost : x) } : cl))}
              onCostDeleted={(id) => setClinics(prev => prev.map(cl => cl.id === c.id ? { ...cl, costs: cl.costs.filter(x => x.id !== id) } : cl))}
            />
          ))}
        </div>
      )}

      <ClinicModal open={modal} onClose={() => { setModal(false); setEditing(null) }}
        clinic={editing} onSaved={handleSaved} />
    </div>
  )
}