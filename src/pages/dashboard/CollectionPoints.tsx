import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, MapPin, ToggleLeft, ToggleRight, Navigation } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { CollectionPoint } from '@/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ─── Form ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:         z.string().min(1, 'Obrigatório'),
  address:      z.string().min(1, 'Obrigatório'),
  neighborhood: z.string().optional(),
  notes:        z.string().optional(),
  is_active:    z.boolean(),
  lat:          z.string().optional(),
  lng:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function PointModal({ open, onClose, point, onSaved }: {
  open: boolean; onClose: () => void
  point: CollectionPoint | null; onSaved: (p: CollectionPoint) => void
}) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         point?.name ?? '',
      address:      point?.address ?? '',
      neighborhood: point?.neighborhood ?? '',
      notes:        point?.notes ?? '',
      is_active:    point?.is_active ?? true,
      lat:          point?.lat != null ? String(point.lat) : '',
      lng:          point?.lng != null ? String(point.lng) : '',
    },
  })
  const isActive    = watch('is_active')
  const addressVal  = watch('address')
  const latVal      = watch('lat')
  const [geocoding, setGeocoding] = useState(false)

  async function geocode() {
    if (!addressVal) return
    setGeocoding(true)
    try {
      const q = encodeURIComponent(`${addressVal} Três Lagoas MS Brasil`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
      const json = await res.json()
      if (json[0]) {
        setValue('lat', json[0].lat)
        setValue('lng', json[0].lon)
        toast.success('Coordenadas preenchidas!')
      } else {
        toast.error('Endereço não encontrado.')
      }
    } catch {
      toast.error('Erro ao geocodificar.')
    }
    setGeocoding(false)
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      name:         values.name,
      address:      values.address,
      neighborhood: values.neighborhood || null,
      notes:        values.notes || null,
      is_active:    values.is_active,
      lat:          values.lat ? parseFloat(values.lat) : null,
      lng:          values.lng ? parseFloat(values.lng) : null,
    }
    const { data, error } = point
      ? await supabase.from('collection_points').update(payload).eq('id', point.id).select().single()
      : await supabase.from('collection_points').insert(payload).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(point ? 'Ponto atualizado!' : 'Ponto cadastrado!')
    onSaved(data as CollectionPoint); reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{point ? 'Editar ponto de coleta' : 'Novo ponto de coleta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome / identificação *</Label>
            <Input placeholder="Ex: Clínica Vida Animal — Centro" {...register('name')} />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Endereço *</Label>
            <div className="flex gap-2">
              <Input placeholder="Rua, número" {...register('address')} className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5"
                onClick={geocode} disabled={geocoding || !addressVal}>
                {geocoding ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                {latVal ? 'Regeocodificar' : 'Geocodificar'}
              </Button>
            </div>
            {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
            {latVal && (
              <p className="text-xs text-brand-600 flex items-center gap-1">
                <MapPin size={11} />Coordenadas preenchidas — aparecerá no mapa
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input placeholder="Ex: Centro" {...register('neighborhood')} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} placeholder="Horário de funcionamento, contato, etc." {...register('notes')} />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setValue('is_active', !isActive)}>
              {isActive
                ? <ToggleRight size={26} className="text-brand-600" />
                : <ToggleLeft size={26} className="text-stone-400" />}
            </button>
            <span className="text-sm text-stone-600">
              {isActive ? 'Ativo — visível no site público' : 'Inativo — oculto do site público'}
            </span>
          </div>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CollectionPoints() {
  const [points, setPoints]   = useState<CollectionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<CollectionPoint | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('collection_points')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar pontos')
    else setPoints((data ?? []) as CollectionPoint[])
    setLoading(false)
  }

  function handleSaved(p: CollectionPoint) {
    setPoints(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [p, ...prev]
    })
    setModal(false); setEditing(null)
  }

  async function toggleActive(p: CollectionPoint) {
    const { data, error } = await supabase
      .from('collection_points').update({ is_active: !p.is_active })
      .eq('id', p.id).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    setPoints(prev => prev.map(x => x.id === p.id ? data as CollectionPoint : x))
  }

  async function softDelete(p: CollectionPoint) {
    if (!confirm(`Remover "${p.name}"?`)) return
    const { error } = await supabase
      .from('collection_points').update({ deleted_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) { toast.error('Erro: ' + error.message); return }
    setPoints(prev => prev.filter(x => x.id !== p.id))
    toast.success('Ponto removido.')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Pontos de Coleta</h1>
          <p className="text-stone-400 text-sm mt-1">Locais onde o público pode deixar doações</p>
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 gap-2"
          onClick={() => { setEditing(null); setModal(true) }}>
          <Plus size={16} />Novo ponto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
          <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : points.length === 0 ? (
        <div className="py-20 text-center text-stone-400 bg-white rounded-xl border border-stone-200">
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum ponto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {points.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${p.is_active ? 'border-stone-200' : 'border-stone-100 opacity-60'}`}>
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={16} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-stone-800">{p.name}</p>
                  <Badge variant="outline" className={p.is_active
                    ? 'bg-brand-50 text-brand-700 border-brand-200 text-xs'
                    : 'bg-stone-50 text-stone-400 border-stone-200 text-xs'}>
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-stone-600 mt-0.5">{p.address}{p.neighborhood ? ` — ${p.neighborhood}` : ''}</p>
                {p.notes && <p className="text-xs text-stone-400 mt-1">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700"
                  title={p.is_active ? 'Desativar' : 'Ativar'} onClick={() => toggleActive(p)}>
                  {p.is_active ? <ToggleRight size={16} className="text-brand-600" /> : <ToggleLeft size={16} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700"
                  onClick={() => { setEditing(p); setModal(true) }}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500"
                  onClick={() => softDelete(p)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PointModal open={modal} onClose={() => { setModal(false); setEditing(null) }}
        point={editing} onSaved={handleSaved} />
    </div>
  )
}
