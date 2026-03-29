import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Megaphone, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { Alert } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

const alertSchema = z.object({
  title:       z.string().min(1, 'Título obrigatório'),
  body:        z.string().min(1, 'Mensagem obrigatória'),
  link_url:    z.string().url('URL inválida').optional().or(z.literal('')),
  link_label:  z.string().optional(),
  image_url:   z.string().url('URL inválida').optional().or(z.literal('')),
})
type AlertValues = z.infer<typeof alertSchema>

function AlertModal({
  open, onClose, alert, onSaved,
}: {
  open: boolean
  onClose: () => void
  alert: Alert | null
  onSaved: (a: Alert) => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AlertValues>({
    resolver: zodResolver(alertSchema),
  })

  useEffect(() => {
    if (open) {
      reset({
        title:      alert?.title ?? '',
        body:       alert?.body ?? '',
        link_url:   alert?.link_url ?? '',
        link_label: alert?.link_label ?? '',
        image_url:  alert?.image_url ?? '',
      })
    }
  }, [open, alert, reset])

  async function onSubmit(values: AlertValues) {
    const payload = {
      title:      values.title,
      body:       values.body,
      link_url:   values.link_url || null,
      link_label: values.link_label || null,
      image_url:  values.image_url || null,
    }
    if (alert) {
      const { data, error } = await supabase.from('alerts').update(payload).eq('id', alert.id).select().single()
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Alerta atualizado')
      onSaved(data as Alert)
    } else {
      const { data, error } = await supabase.from('alerts').insert({ ...payload, is_active: false }).select().single()
      if (error) { toast.error('Erro ao salvar'); return }
      toast.success('Alerta criado')
      onSaved(data as Alert)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{alert ? 'Editar alerta' : 'Novo alerta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input {...register('title')} placeholder="Ex: Urgente — cirurgia necessária" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Mensagem *</Label>
            <Textarea {...register('body')} placeholder="Descreva a situação urgente…" rows={4} />
            {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>URL da imagem</Label>
            <Input {...register('image_url')} placeholder="https://…" />
            {errors.image_url && <p className="text-xs text-red-500">{errors.image_url.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Texto do link</Label>
              <Input {...register('link_label')} placeholder="Ex: Doe agora" />
            </div>
            <div className="space-y-1">
              <Label>URL do link</Label>
              <Input {...register('link_url')} placeholder="https://…" />
              {errors.link_url && <p className="text-xs text-red-500">{errors.link_url.message}</p>}
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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAlert, setModalAlert] = useState<Alert | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })
    setAlerts((data ?? []) as Alert[])
    setLoading(false)
  }

  async function toggleActive(alert: Alert) {
    const newVal = !alert.is_active
    const { error } = await supabase.from('alerts').update({ is_active: newVal }).eq('id', alert.id)
    if (error) { toast.error('Erro ao atualizar'); return }
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: newVal } : a))
    toast.success(newVal ? 'Alerta ativado — visível no site' : 'Alerta desativado')
  }

  async function handleDelete(alert: Alert) {
    if (!confirm(`Excluir alerta "${alert.title}"?`)) return
    await supabase.from('alerts').delete().eq('id', alert.id)
    setAlerts(prev => prev.filter(a => a.id !== alert.id))
    toast.success('Alerta excluído')
  }

  function handleSaved(saved: Alert) {
    setAlerts(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Alertas Urgentes</h1>
          <p className="text-sm text-stone-500 mt-1">Alertas ativos aparecem como modal na página inicial do site</p>
        </div>
        <Button onClick={() => { setModalAlert(null); setModalOpen(true) }} className="gap-2">
          <Plus size={16} />Novo alerta
        </Button>
      </div>

      <div className="mb-5 bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
        <p><span className="font-medium">Como funciona:</span> Ative um alerta para que ele apareça automaticamente como um modal para visitantes na página inicial. Apenas o alerta mais recente ativado é exibido por vez.</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400">Carregando…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum alerta cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl border border-stone-200 p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-stone-800">{alert.title}</h3>
                  <Badge variant="outline" className={alert.is_active
                    ? 'bg-brand-50 text-brand-700 border-brand-200'
                    : 'bg-stone-50 text-stone-500 border-stone-200'}>
                    {alert.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-stone-600 line-clamp-2">{alert.body}</p>
                {(alert.link_url || alert.image_url) && (
                  <p className="text-xs text-stone-400 mt-1">
                    {alert.link_url && <span>Link: {alert.link_url}</span>}
                    {alert.image_url && <span className="ml-3">Imagem: configurada</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className={`h-8 w-8 ${alert.is_active ? 'text-brand-600' : 'text-stone-400'}`}
                  title={alert.is_active ? 'Desativar' : 'Ativar'}
                  onClick={() => toggleActive(alert)}>
                  {alert.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700"
                  onClick={() => { setModalAlert(alert); setModalOpen(true) }}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-600"
                  onClick={() => handleDelete(alert)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alert={modalAlert}
        onSaved={handleSaved}
      />
    </div>
  )
}
