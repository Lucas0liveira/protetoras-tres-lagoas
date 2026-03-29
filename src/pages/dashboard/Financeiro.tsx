import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Upload, TrendingUp, TrendingDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { FinancialRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const recordSchema = z.object({
  period:         z.string().min(1, 'Período obrigatório'),
  type:           z.enum(['receita', 'despesa']),
  category:       z.string().optional(),
  description:    z.string().min(1, 'Descrição obrigatória'),
  amount:         z.coerce.number().positive('Valor deve ser positivo'),
  reference_date: z.string().optional(),
  source:         z.string().optional(),
})
type RecordValues = z.infer<typeof recordSchema>

// ─── Record modal ─────────────────────────────────────────────────────────────

function RecordModal({
  open, onClose, onSaved,
}: {
  open: boolean; onClose: () => void; onSaved: (r: FinancialRecord) => void
}) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<RecordValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: { type: 'despesa' },
  })

  useEffect(() => { if (open) reset({ type: 'despesa' }) }, [open, reset])

  const type = watch('type')

  async function onSubmit(values: RecordValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      period:         values.period,
      type:           values.type,
      category:       values.category || null,
      description:    values.description,
      amount:         values.amount,
      reference_date: values.reference_date || null,
      source:         values.source || null,
      created_by:     user?.id ?? null,
    }
    const { data, error } = await supabase.from('financial_records').insert(payload).select().single()
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Registro adicionado')
    onSaved(data as FinancialRecord)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo registro financeiro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select onValueChange={v => setValue('type', v as 'receita' | 'despesa')} defaultValue="despesa">
                <SelectTrigger className={type === 'receita' ? 'text-brand-700 border-brand-300' : 'text-red-600 border-red-200'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Entrada (receita)</SelectItem>
                  <SelectItem value="despesa">Saída (despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Período *</Label>
              <Input {...register('period')} placeholder="Ex: Janeiro 2026" />
              {errors.period && <p className="text-xs text-red-500">{errors.period.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição *</Label>
            <Input {...register('description')} placeholder="Descrição do item" />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" {...register('amount')} placeholder="0,00" />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Data de referência</Label>
              <Input type="date" {...register('reference_date')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input {...register('category')} placeholder="Ex: Medicamentos" />
            </div>
            <div className="space-y-1">
              <Label>Origem / Destino</Label>
              <Input {...register('source')} placeholder="Ex: Doação PIX" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CSV import ───────────────────────────────────────────────────────────────
// Expected CSV columns: period,type,category,description,amount,reference_date,source
// type values: receita | despesa

function parseCSV(text: string): RecordValues[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return {
      period:         obj.period ?? '',
      type:           (obj.type === 'receita' ? 'receita' : 'despesa') as 'receita' | 'despesa',
      category:       obj.category || undefined,
      description:    obj.description ?? '',
      amount:         parseFloat(obj.amount ?? '0'),
      reference_date: obj.reference_date || undefined,
      source:         obj.source || undefined,
    }
  }).filter(r => r.period && r.description && r.amount > 0)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Financeiro() {
  const [records, setRecords]     = useState<FinancialRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [csvPreview, setCsvPreview] = useState<RecordValues[] | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('financial_records').select('*').order('reference_date', { ascending: false })
    setRecords((data ?? []) as FinancialRecord[])
    setLoading(false)
  }

  function handleSaved(r: FinancialRecord) {
    setRecords(prev => [r, ...prev])
  }

  async function handleDelete(r: FinancialRecord) {
    if (!confirm(`Excluir "${r.description}"?`)) return
    await supabase.from('financial_records').delete().eq('id', r.id)
    setRecords(prev => prev.filter(x => x.id !== r.id))
    toast.success('Removido')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) { toast.error('CSV inválido ou vazio'); return }
      setCsvPreview(parsed)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!csvPreview) return
    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const rows = csvPreview.map(r => ({
      period:         r.period,
      type:           r.type,
      category:       r.category || null,
      description:    r.description,
      amount:         r.amount,
      reference_date: r.reference_date || null,
      source:         r.source || null,
      created_by:     user?.id ?? null,
    }))
    const { error } = await supabase.from('financial_records').insert(rows)
    setImporting(false)
    if (error) { toast.error('Erro ao importar'); return }
    toast.success(`${rows.length} registros importados`)
    setCsvPreview(null)
    load()
  }

  const periods = Array.from(new Set(records.map(r => r.period))).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Transparência Financeira</h1>
          <p className="text-sm text-stone-500 mt-1">Registros visíveis publicamente em <span className="font-medium">/transparencia</span></p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload size={15} />Importar CSV
          </Button>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus size={16} />Novo registro
          </Button>
        </div>
      </div>

      {/* CSV preview dialog */}
      <Dialog open={!!csvPreview} onOpenChange={v => !v && setCsvPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da importação ({csvPreview?.length ?? 0} registros)</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            {csvPreview?.map((r, i) => (
              <div key={i} className={`flex justify-between items-start px-3 py-2 rounded-lg ${r.type === 'receita' ? 'bg-brand-50' : 'bg-red-50'}`}>
                <div>
                  <span className="font-medium text-stone-700">{r.description}</span>
                  <span className="text-stone-400 ml-2 text-xs">{r.period} · {r.category}</span>
                </div>
                <span className={`font-semibold ${r.type === 'receita' ? 'text-brand-700' : 'text-red-600'}`}>
                  {r.type === 'receita' ? '+' : '-'}{fmt(r.amount)}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvPreview(null)}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? 'Importando…' : 'Confirmar importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="text-center py-16 text-stone-400">Carregando…</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 text-stone-400">Nenhum registro. Adicione manualmente ou importe um CSV.</div>
      ) : (
        <div className="space-y-6">
          {periods.map(period => {
            const recs = records.filter(r => r.period === period)
            const totalReceita = recs.filter(r => r.type === 'receita').reduce((s, r) => s + Number(r.amount), 0)
            const totalDespesa = recs.filter(r => r.type === 'despesa').reduce((s, r) => s + Number(r.amount), 0)
            return (
              <div key={period} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-semibold text-stone-800">{period}</h2>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-brand-600 flex items-center gap-1"><TrendingUp size={13} />{fmt(totalReceita)}</span>
                    <span className="text-red-500 flex items-center gap-1"><TrendingDown size={13} />{fmt(totalDespesa)}</span>
                    <span className={`font-semibold ${totalReceita - totalDespesa >= 0 ? 'text-brand-600' : 'text-red-600'}`}>
                      Saldo: {fmt(totalReceita - totalDespesa)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <tbody className="divide-y divide-stone-50">
                    {recs.map(r => (
                      <tr key={r.id} className="hover:bg-stone-50">
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium mr-2 ${r.type === 'receita' ? 'text-brand-600' : 'text-red-500'}`}>
                            {r.type === 'receita' ? '↑' : '↓'}
                          </span>
                          {r.description}
                          {r.category && <span className="text-stone-400 ml-1 text-xs">· {r.category}</span>}
                        </td>
                        <td className="px-4 py-3 text-stone-400 text-xs hidden md:table-cell">{r.source ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          <span className={r.type === 'receita' ? 'text-brand-700' : 'text-red-600'}>
                            {r.type === 'receita' ? '+' : '-'}{fmt(Number(r.amount))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-300 hover:text-red-500"
                            onClick={() => handleDelete(r)}>
                            <Trash2 size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RecordModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
    </div>
  )
}
