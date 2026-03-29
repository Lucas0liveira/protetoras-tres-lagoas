import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Pill, AlertTriangle, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { PharmacyItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expirationStatus(date: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!date) return 'none'
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 'expired'
  if (days <= 30) return 'soon'
  return 'ok'
}

const STATUS_STYLES = {
  expired: 'bg-red-50 text-red-700 border-red-200',
  soon:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  ok:      'bg-brand-50 text-brand-700 border-brand-200',
  none:    'bg-stone-50 text-stone-500 border-stone-200',
}
const STATUS_LABELS = {
  expired: 'Vencido',
  soon:    'Vence em breve',
  ok:      'Válido',
  none:    'Sem validade',
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name:            z.string().min(1, 'Nome obrigatório'),
  description:     z.string().optional(),
  quantity:        z.coerce.number().int().min(0, 'Quantidade inválida'),
  unit:            z.string().optional(),
  expiration_date: z.string().optional(),
  batch_number:    z.string().optional(),
})
type ItemValues = z.infer<typeof itemSchema>

// ─── Item modal ───────────────────────────────────────────────────────────────

function ItemModal({
  open, onClose, item, onSaved,
}: {
  open: boolean
  onClose: () => void
  item: PharmacyItem | null
  onSaved: (saved: PharmacyItem) => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemValues>({
    resolver: zodResolver(itemSchema) as any,
  })

  useEffect(() => {
    if (open) {
      reset({
        name:            item?.name ?? '',
        description:     item?.description ?? '',
        quantity:        item?.quantity ?? 0,
        unit:            item?.unit ?? '',
        expiration_date: item?.expiration_date ?? '',
        batch_number:    item?.batch_number ?? '',
      })
    }
  }, [open, item, reset])

  async function onSubmit(values: ItemValues) {
    const payload = {
      name:            values.name,
      description:     values.description || null,
      quantity:        values.quantity,
      unit:            values.unit || null,
      expiration_date: values.expiration_date || null,
      batch_number:    values.batch_number || null,
    }

    if (item) {
      const { data, error } = await supabase
        .from('pharmacy_items').update(payload).eq('id', item.id).select().single()
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Medicamento atualizado')
      onSaved(data as PharmacyItem)
    } else {
      const { data, error } = await supabase
        .from('pharmacy_items').insert(payload).select().single()
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Medicamento adicionado')
      onSaved(data as PharmacyItem)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar medicamento' : 'Novo medicamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input {...register('name')} placeholder="Ex: Bravecto" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea {...register('description')} placeholder="Observações sobre o medicamento" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quantidade *</Label>
              <Input type="number" min={0} {...register('quantity')} />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input {...register('unit')} placeholder="comprimidos, frascos…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Validade</Label>
              <Input type="date" {...register('expiration_date')} />
            </div>
            <div className="space-y-1">
              <Label>Lote</Label>
              <Input {...register('batch_number')} placeholder="Nº do lote" />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Pharmacy() {
  const [items, setItems] = useState<PharmacyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState<PharmacyItem | null | 'new'>('new' as const)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('pharmacy_items')
      .select('*')
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true, nullsFirst: false })
    setItems((data ?? []) as PharmacyItem[])
    setLoading(false)
  }

  function openNew() { setModalItem(null); setModalOpen(true) }
  function openEdit(item: PharmacyItem) { setModalItem(item); setModalOpen(true) }

  async function handleDelete(item: PharmacyItem) {
    if (!confirm(`Remover "${item.name}"?`)) return
    await supabase.from('pharmacy_items').update({ deleted_at: new Date().toISOString() }).eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    toast.success('Removido')
  }

  function handleSaved(saved: PharmacyItem) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const expiringSoon = items.filter(i => {
    const s = expirationStatus(i.expiration_date)
    return s === 'expired' || s === 'soon'
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Farmácia</h1>
          <p className="text-sm text-stone-500 mt-1">Controle de medicamentos e insumos em estoque</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} />Novo item
        </Button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              {expiringSoon.length} medicamento{expiringSoon.length > 1 ? 's' : ''} com validade próxima ou vencida
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              {expiringSoon.map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="mb-5">
        <Input
          placeholder="Buscar por nome ou descrição…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Pill size={32} className="mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhum item encontrado.' : 'Nenhum medicamento cadastrado.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Qtd</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Validade</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Lote</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map(item => {
                const status = expirationStatus(item.expiration_date)
                return (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-stone-800">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-stone-700 font-medium">
                      {item.quantity}{item.unit ? <span className="text-stone-400 font-normal ml-1">{item.unit}</span> : null}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        {item.expiration_date && <Calendar size={13} className="text-stone-400" />}
                        {fmt(item.expiration_date)}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-stone-500">{item.batch_number ?? '—'}</td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <Badge variant="outline" className={STATUS_STYLES[status]}>
                        {STATUS_LABELS[status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700"
                          onClick={() => openEdit(item)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-600"
                          onClick={() => handleDelete(item)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={modalItem === 'new' ? null : modalItem}
        onSaved={handleSaved}
      />
    </div>
  )
}
