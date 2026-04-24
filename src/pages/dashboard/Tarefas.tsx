import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  Plus, Loader2, X, Send,
  Settings2, Trash2, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Tarefa, TarefaStatus, TarefaAtividade, TarefaUpdate, Colaboradora } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  if (days === 1) return '1 dia atrás'
  if (days < 7) return `${days} dias atrás`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const PRIORITY = {
  alta:  { label: 'Alta',  bg: '#312E81' },
  media: { label: 'Média', bg: '#7C3AED' },
  baixa: { label: 'Baixa', bg: '#3B82F6' },
} as const

const PRESET_COLORS = [
  '#94A3B8', '#F97316', '#EF4444', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
  '#0EA5E9', '#374151',
]

const FIELD_LOG_LABEL: Record<string, string> = {
  title: 'título', status_id: 'status', responsible_id: 'responsável',
  deadline: 'prazo', priority: 'prioridade', is_done: 'conclusão',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold shrink-0 ${cls}`}>
      {initials(name)}
    </span>
  )
}

// ─── Portal cell dropdown ─────────────────────────────────────────────────────

function CellMenu({ anchor, onClose, children }: {
  anchor: DOMRect | null
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!anchor) return null
  const top = anchor.bottom + 4
  const left = Math.min(anchor.left, window.innerWidth - 200)

  return createPortal(
    <div ref={ref}
      className="fixed z-[9999] bg-white border border-stone-200 rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{ top, left }}>
      {children}
    </div>,
    document.body
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

type UpdateFn = (
  patch: Record<string, unknown>,
  field: string,
  oldLabel: string | null,
  newLabel: string | null,
) => Promise<void>

function TaskRow({ task, statuses, colaboradoras, profileMap, onUpdate, onDelete, onOpenPanel }: {
  task: Tarefa
  statuses: TarefaStatus[]
  colaboradoras: Colaboradora[]
  profileMap: Record<string, string>
  onUpdate: UpdateFn
  onDelete: () => Promise<void>
  onOpenPanel: () => void
}) {
  const [openMenu, setOpenMenu] = useState<'status' | 'priority' | 'responsible' | 'deadline' | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null)

  function openAt(e: React.MouseEvent, menu: typeof openMenu) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget.getBoundingClientRect())
    setOpenMenu(menu)
  }
  const closeMenu = useCallback(() => { setOpenMenu(null); setMenuAnchor(null) }, [])

  const updaterName = task.updated_by ? profileMap[task.updated_by] : null

  return (
    <tr className={`border-b border-stone-100 group transition-colors ${task.is_done ? 'bg-stone-50/60 opacity-70' : 'hover:bg-stone-50/40'}`}>

      {/* Title — click opens panel */}
      <td className="p-0 min-w-[220px]">
        <button onClick={onOpenPanel}
          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:text-brand-700 ${
            task.is_done ? 'line-through text-stone-400' : 'text-stone-800 font-medium'
          }`}>
          {task.title}
        </button>
      </td>

      {/* Responsible — full-cell button */}
      <td className="p-0 w-44">
        <button onClick={e => openAt(e, 'responsible')}
          className="w-full min-h-[43px] px-3 py-2.5 flex items-center gap-2 text-xs hover:bg-stone-100 transition-colors">
          {task.responsible ? (
            <>
              <Avatar name={task.responsible.name} />
              <span className="truncate text-stone-600">{task.responsible.name}</span>
            </>
          ) : (
            <span className="text-stone-300 group-hover:text-stone-400 transition-colors">+ Responsável</span>
          )}
        </button>
        {openMenu === 'responsible' && (
          <CellMenu anchor={menuAnchor} onClose={closeMenu}>
            <button className="w-full px-3 py-2 hover:bg-stone-50 text-sm text-stone-400 text-left"
              onClick={async () => {
                await onUpdate({ responsible_id: null }, 'responsible_id', task.responsible?.name ?? null, null)
                closeMenu()
              }}>
              Sem responsável
            </button>
            {colaboradoras.map(c => (
              <button key={c.id} className="w-full px-3 py-2 hover:bg-stone-50 text-sm text-left flex items-center gap-2"
                onClick={async () => {
                  await onUpdate({ responsible_id: c.id }, 'responsible_id', task.responsible?.name ?? null, c.name)
                  closeMenu()
                }}>
                <Avatar name={c.name} />{c.name}
              </button>
            ))}
          </CellMenu>
        )}
      </td>

      {/* Status — colored pill button */}
      <td className="px-2 py-2 w-36">
        <button onClick={e => openAt(e, 'status')}
          className="text-xs font-semibold px-3 py-1.5 rounded-md w-full text-center truncate transition-opacity hover:opacity-80"
          style={{
            backgroundColor: task.status?.color ?? '#E5E7EB',
            color: task.status ? 'white' : '#6B7280',
          }}>
          {task.status?.name ?? 'Sem status'}
        </button>
        {openMenu === 'status' && (
          <CellMenu anchor={menuAnchor} onClose={closeMenu}>
            {statuses.map(s => (
              <button key={s.id} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-stone-50 text-sm"
                onClick={async () => {
                  await onUpdate(
                    { status_id: s.id, is_done: s.marks_done },
                    'status_id', task.status?.name ?? null, s.name,
                  )
                  closeMenu()
                }}>
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1">{s.name}</span>
                {s.marks_done && <span className="text-[10px] text-stone-400 ml-1">conclui</span>}
              </button>
            ))}
            <div className="border-t border-stone-100 mt-1 pt-1">
              <button className="w-full px-3 py-1.5 hover:bg-stone-50 text-sm text-stone-400 text-left"
                onClick={async () => {
                  await onUpdate({ status_id: null, is_done: false }, 'status_id', task.status?.name ?? null, null)
                  closeMenu()
                }}>
                Sem status
              </button>
            </div>
          </CellMenu>
        )}
      </td>

      {/* Deadline — full-cell button */}
      <td className="p-0 w-34">
        <button onClick={e => openAt(e, 'deadline')}
          className="w-full min-h-[43px] px-3 py-2.5 flex items-center gap-1.5 text-xs hover:bg-stone-100 transition-colors">
          {task.deadline ? (
            <>
              <Calendar size={11} className="text-stone-400 shrink-0" />
              <span className="text-stone-600">{new Date(task.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </>
          ) : (
            <span className="text-stone-300 group-hover:text-stone-400 transition-colors">+ Prazo</span>
          )}
        </button>
        {openMenu === 'deadline' && (
          <CellMenu anchor={menuAnchor} onClose={closeMenu}>
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-xs text-stone-500 font-medium">Prazo</p>
              <input type="date" autoFocus
                defaultValue={task.deadline ?? ''}
                className="text-sm border border-stone-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 w-full"
                onChange={async e => {
                  const val = e.target.value || null
                  const label = val ? new Date(val + 'T12:00:00').toLocaleDateString('pt-BR') : null
                  await onUpdate({ deadline: val }, 'deadline', task.deadline, label)
                  closeMenu()
                }} />
              {task.deadline && (
                <button className="text-xs text-stone-400 hover:text-red-500 transition-colors w-full text-left"
                  onClick={async () => {
                    await onUpdate({ deadline: null }, 'deadline', task.deadline, null)
                    closeMenu()
                  }}>
                  Remover prazo
                </button>
              )}
            </div>
          </CellMenu>
        )}
      </td>

      {/* Priority — colored pill button */}
      <td className="px-2 py-2 w-28">
        <button onClick={e => openAt(e, 'priority')}
          className="text-xs font-semibold px-3 py-1.5 rounded-md w-full text-center transition-opacity hover:opacity-80"
          style={{
            backgroundColor: task.priority ? PRIORITY[task.priority].bg : '#E5E7EB',
            color: task.priority ? 'white' : '#6B7280',
          }}>
          {task.priority ? PRIORITY[task.priority].label : 'Prioridade'}
        </button>
        {openMenu === 'priority' && (
          <CellMenu anchor={menuAnchor} onClose={closeMenu}>
            {(Object.entries(PRIORITY) as [keyof typeof PRIORITY, typeof PRIORITY[keyof typeof PRIORITY]][]).map(([key, cfg]) => (
              <button key={key} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-stone-50 text-sm"
                onClick={async () => {
                  await onUpdate({ priority: key }, 'priority',
                    task.priority ? PRIORITY[task.priority].label : null, cfg.label)
                  closeMenu()
                }}>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: cfg.bg, color: 'white' }}>
                  {cfg.label}
                </span>
              </button>
            ))}
            <div className="border-t border-stone-100 mt-1 pt-1">
              <button className="w-full px-3 py-1.5 hover:bg-stone-50 text-sm text-stone-400 text-left"
                onClick={async () => {
                  await onUpdate({ priority: null }, 'priority',
                    task.priority ? PRIORITY[task.priority].label : null, null)
                  closeMenu()
                }}>
                Sem prioridade
              </button>
            </div>
          </CellMenu>
        )}
      </td>

      {/* Last updated */}
      <td className="px-3 py-3 w-36">
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          {updaterName && <Avatar name={updaterName} />}
          <span>{timeAgo(task.updated_at)}</span>
        </div>
      </td>

      {/* Delete — appears on row hover */}
      <td className="pr-3 py-2 w-10">
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 text-stone-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Excluir tarefa">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ─── Task panel (right drawer) ────────────────────────────────────────────────

type PanelUpdate = TarefaUpdate & { author?: { display_name: string } | null }
type PanelAtividade = TarefaAtividade & { user?: { display_name: string } | null }

function formatAtividade(a: PanelAtividade): string {
  const who = a.user?.display_name ?? 'Alguém'
  const fieldLabel = FIELD_LOG_LABEL[a.field] ?? a.field

  if (a.field === 'is_done') {
    return a.new_value === 'true'
      ? `${who} marcou a tarefa como concluída`
      : `${who} reabriu a tarefa`
  }
  if (a.old_value && a.new_value)
    return `${who} alterou ${fieldLabel} de "${a.old_value}" para "${a.new_value}"`
  if (a.new_value)
    return `${who} definiu ${fieldLabel} como "${a.new_value}"`
  return `${who} removeu ${fieldLabel}`
}

function TaskPanel({ task, userId, onUpdate, onDelete, onClose }: {
  task: Tarefa
  userId: string | null
  onUpdate: UpdateFn
  onDelete: () => Promise<void>
  onClose: () => void
}) {
  const [tab, setTab] = useState<'updates' | 'atividade'>('updates')
  const [updates, setUpdates] = useState<PanelUpdate[]>([])
  const [atividades, setAtividades] = useState<PanelAtividade[]>([])
  const [loadingPanel, setLoadingPanel] = useState(true)
  const [newBody, setNewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitleDraft(task.title)
    setEditingTitle(false)
    setNewBody('')
    setTab('updates')
    loadPanel()
  }, [task.id])

  async function loadPanel() {
    setLoadingPanel(true)
    const [{ data: upd }, { data: atv }] = await Promise.all([
      supabase.from('tarefa_updates')
        .select('*, author:profiles!tarefa_updates_author_id_fkey(display_name)')
        .eq('tarefa_id', task.id).is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('tarefa_atividades')
        .select('*, user:profiles!tarefa_atividades_user_id_fkey(display_name)')
        .eq('tarefa_id', task.id)
        .order('created_at', { ascending: false }),
    ])
    setUpdates((upd ?? []) as PanelUpdate[])
    setAtividades((atv ?? []) as PanelAtividade[])
    setLoadingPanel(false)
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === task.title) { setEditingTitle(false); return }
    await onUpdate({ title: trimmed }, 'title', task.title, trimmed)
    setEditingTitle(false)
  }

  async function submitUpdate() {
    if (!newBody.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase.from('tarefa_updates')
      .insert({ tarefa_id: task.id, author_id: userId, body: newBody.trim() })
      .select('*, author:profiles!tarefa_updates_author_id_fkey(display_name)')
      .single()
    setSubmitting(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setUpdates(prev => [data as PanelUpdate, ...prev])
    setNewBody('')
  }

  async function deleteUpdate(id: string) {
    await supabase.from('tarefa_updates').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setUpdates(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-[480px] h-full bg-white border-l border-stone-200 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-stone-100 shrink-0">
          <div className="flex-1 min-w-0 pt-0.5">
            {editingTitle ? (
              <input ref={titleRef} value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false) }
                }}
                className="w-full text-base font-semibold text-stone-800 border-b-2 border-brand-400 focus:outline-none bg-transparent"
                autoFocus />
            ) : (
              <button
                onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 0) }}
                className={`text-left text-base font-semibold hover:text-brand-700 transition-colors w-full ${
                  task.is_done ? 'line-through text-stone-400' : 'text-stone-800'
                }`}>
                {task.title}
              </button>
            )}
            {task.status && (
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: task.status.color, color: 'white' }}>
                {task.status.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onDelete}
              className="p-1.5 text-stone-300 hover:text-red-500 rounded transition-colors"
              title="Excluir tarefa">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0 border-b border-stone-100">
          {([
            { key: 'updates',   label: 'Atualizações' },
            { key: 'atividade', label: 'Atividade' },
          ] as { key: 'updates' | 'atividade'; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingPanel ? (
            <div className="flex items-center justify-center py-16 text-stone-400 gap-2">
              <Loader2 size={16} className="animate-spin" /><span className="text-sm">Carregando...</span>
            </div>
          ) : tab === 'updates' ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {updates.length === 0 && (
                  <p className="text-sm text-stone-400 italic text-center py-8">Nenhuma atualização ainda.</p>
                )}
                {updates.map(u => (
                  <div key={u.id} className="bg-stone-50 rounded-lg p-3 group/upd">
                    <div className="flex items-center gap-2 mb-1.5">
                      {u.author?.display_name && <Avatar name={u.author.display_name} size="md" />}
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          {u.author?.display_name ?? 'Usuário'}
                        </p>
                        <p className="text-xs text-stone-400">{timeAgo(u.created_at)}</p>
                      </div>
                      {u.author_id === userId && (
                        <button onClick={() => deleteUpdate(u.id)}
                          className="ml-auto p-1 text-stone-200 hover:text-red-400 opacity-0 group-hover/upd:opacity-100 transition-all rounded">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{u.body}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-100 p-4 shrink-0">
                <Textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitUpdate() }}
                  placeholder="Escreva uma atualização... (Ctrl+Enter para enviar)"
                  rows={3}
                  className="text-sm resize-none mb-2" />
                <Button size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5 w-full"
                  onClick={submitUpdate} disabled={submitting || !newBody.trim()}>
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar atualização
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {atividades.length === 0 && (
                <p className="text-sm text-stone-400 italic text-center py-8">Nenhuma atividade registrada.</p>
              )}
              {atividades.map(a => (
                <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-stone-50">
                  {a.user?.display_name && <Avatar name={a.user.display_name} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700">{formatAtividade(a)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Manage statuses modal ────────────────────────────────────────────────────

function ManageStatusesModal({ open, onClose, statuses, onSaved }: {
  open: boolean; onClose: () => void
  statuses: TarefaStatus[]
  onSaved: (statuses: TarefaStatus[]) => void
}) {
  const [items, setItems] = useState<TarefaStatus[]>([])
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  useEffect(() => { setItems(statuses) }, [statuses, open])

  async function updateStatus(id: string, patch: Partial<TarefaStatus>) {
    const { error } = await supabase.from('tarefa_statuses').update(patch).eq('id', id)
    if (error) { toast.error('Erro: ' + error.message); return }
    setItems(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function addStatus() {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('tarefa_statuses')
      .insert({ name: newName.trim(), color: newColor, sort_order: items.length })
      .select().single()
    setSaving(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    const updated = [...items, data as TarefaStatus]
    setItems(updated)
    setNewName('')
    onSaved(updated)
    toast.success('Status adicionado.')
  }

  async function deleteStatus(id: string) {
    const { error } = await supabase.from('tarefa_statuses').delete().eq('id', id)
    if (error) { toast.error('Não é possível remover: ' + error.message); return }
    const updated = items.filter(s => s.id !== id)
    setItems(updated)
    onSaved(updated)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerenciar status</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map(s => (
            <div key={s.id} className="flex items-center gap-2 group">
              <div className="relative">
                <button onClick={() => setPickerFor(pickerFor === s.id ? null : s.id)}
                  className="w-5 h-5 rounded-sm border border-stone-200 shrink-0 transition-transform hover:scale-110"
                  style={{ backgroundColor: s.color }} />
                {pickerFor === s.id && (
                  <div className="absolute top-7 left-0 z-10 bg-white border border-stone-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => { updateStatus(s.id, { color: c }); setPickerFor(null) }}
                        className="w-5 h-5 rounded-sm border border-stone-100 hover:scale-125 transition-transform"
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                )}
              </div>
              <input
                defaultValue={s.name}
                onBlur={e => {
                  const val = e.target.value.trim()
                  if (val && val !== s.name) updateStatus(s.id, { name: val })
                }}
                className="flex-1 text-sm border-b border-transparent hover:border-stone-200 focus:border-brand-300 focus:outline-none px-1 py-0.5 bg-transparent" />
              <label className="flex items-center gap-1 text-xs text-stone-400 shrink-0">
                <input type="checkbox" checked={s.marks_done}
                  onChange={e => updateStatus(s.id, { marks_done: e.target.checked })}
                  className="accent-brand-600" />
                conclui
              </label>
              <button onClick={() => deleteStatus(s.id)}
                className="p-1 text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-100 pt-3 space-y-2">
          <Label className="text-xs text-stone-400">Novo status</Label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setPickerFor(pickerFor === 'new' ? null : 'new')}
                className="w-5 h-5 rounded-sm border border-stone-200 shrink-0"
                style={{ backgroundColor: newColor }} />
              {pickerFor === 'new' && (
                <div className="absolute top-7 left-0 z-10 bg-white border border-stone-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => { setNewColor(c); setPickerFor(null) }}
                      className="w-5 h-5 rounded-sm border border-stone-100 hover:scale-125 transition-transform"
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStatus()}
              placeholder="Nome do status..."
              className="flex-1 text-sm border border-stone-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 shrink-0"
              onClick={addStatus} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tarefas() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [statuses, setStatuses] = useState<TarefaStatus[]>([])
  const [colaboradoras, setColaboradoras] = useState<Colaboradora[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addingTitle, setAddingTitle] = useState('')
  const [managingStatuses, setManagingStatuses] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const active = tarefas.filter(t => !t.is_done)
  const done   = tarefas.filter(t => t.is_done)
  const selected = tarefas.find(t => t.id === selectedId) ?? null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: tf }, { data: st }, { data: col }] = await Promise.all([
      supabase.from('tarefas')
        .select('*, responsible:colaboradoras(id, name), status:tarefa_statuses(id, name, color, marks_done)')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase.from('tarefa_statuses').select('*').order('sort_order'),
      supabase.from('colaboradoras').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
    ])
    const tasks = (tf ?? []) as Tarefa[]
    setTarefas(tasks)
    setStatuses((st ?? []) as TarefaStatus[])
    setColaboradoras((col ?? []) as Colaboradora[])

    const ids = [...new Set(tasks.map(t => t.updated_by).filter(Boolean))] as string[]
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids)
      const map: Record<string, string> = {}
      ;(profiles ?? []).forEach((p: any) => { map[p.id] = p.display_name })
      setProfileMap(map)
    }
    setLoading(false)
  }

  const updateTask = useCallback(async (
    id: string,
    patch: Record<string, unknown>,
    field: string,
    oldLabel: string | null,
    newLabel: string | null,
  ) => {
    const { data, error } = await supabase.from('tarefas')
      .update({ ...patch, updated_by: userId })
      .eq('id', id)
      .select('*, responsible:colaboradoras(id, name), status:tarefa_statuses(id, name, color, marks_done)')
      .single()
    if (error) { toast.error('Erro: ' + error.message); return }

    if (oldLabel !== newLabel) {
      await supabase.from('tarefa_atividades').insert({
        tarefa_id: id, user_id: userId, field,
        old_value: oldLabel, new_value: newLabel,
      })
    }

    setTarefas(prev => prev.map(t => t.id === id ? data as Tarefa : t))

    if (userId && !profileMap[userId]) {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
      if (profile) setProfileMap(prev => ({ ...prev, [userId]: (profile as any).display_name }))
    }
  }, [userId, profileMap])

  async function addTask() {
    const title = addingTitle.trim()
    if (!title) { setIsAdding(false); return }
    const { data, error } = await supabase.from('tarefas')
      .insert({ title, created_by: userId, updated_by: userId })
      .select('*, responsible:colaboradoras(id, name), status:tarefa_statuses(id, name, color, marks_done)')
      .single()
    if (error) { toast.error('Erro: ' + error.message); return }
    setTarefas(prev => [...prev, data as Tarefa])
    setAddingTitle('')
    setIsAdding(false)
    toast.success('Tarefa adicionada.')
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tarefas')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Erro: ' + error.message); return }
    setTarefas(prev => prev.filter(t => t.id !== id))
    if (selectedId === id) setSelectedId(null)
    toast.success('Tarefa removida.')
  }

  function makeUpdateFn(id: string): UpdateFn {
    return (patch, field, oldLabel, newLabel) => updateTask(id, patch, field, oldLabel, newLabel)
  }

  const COLS = (
    <colgroup>
      <col />
      <col className="w-44" />
      <col className="w-36" />
      <col className="w-34" />
      <col className="w-28" />
      <col className="w-36" />
      <col className="w-10" />
    </colgroup>
  )

  const THEAD = (
    <thead className="border-b border-stone-200 bg-stone-50">
      <tr>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Tarefa</th>
        <th className="px-3 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Responsável</th>
        <th className="px-2 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Status</th>
        <th className="px-3 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Prazo</th>
        <th className="px-2 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Prioridade</th>
        <th className="px-3 py-2.5 text-left text-xs font-medium text-stone-400 uppercase tracking-wide">Atualização</th>
        <th className="w-10" />
      </tr>
    </thead>
  )

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Tarefas</h1>
          <p className="text-stone-400 text-sm mt-1">Quadro de tarefas da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setManagingStatuses(true)}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            title="Gerenciar status">
            <Settings2 size={16} />
          </button>
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 border border-stone-200 rounded-lg bg-white hover:bg-stone-50 transition-colors">
            {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showDone ? 'Ocultar' : 'Mostrar'} concluídas ({done.length})
          </button>
          <Button size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5"
            onClick={() => { setIsAdding(true); setTimeout(() => addInputRef.current?.focus(), 50) }}>
            <Plus size={14} />Nova tarefa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-400 gap-2">
          <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              {COLS}
              {THEAD}
              <tbody>
                {active.map(t => (
                  <TaskRow key={t.id} task={t} statuses={statuses}
                    colaboradoras={colaboradoras} profileMap={profileMap}
                    onUpdate={makeUpdateFn(t.id)}
                    onDelete={() => deleteTask(t.id)}
                    onOpenPanel={() => setSelectedId(t.id)} />
                ))}

                {isAdding && (
                  <tr className="border-b border-stone-100 bg-brand-50/30">
                    <td className="px-4 py-2" colSpan={7}>
                      <div className="flex items-center gap-2">
                        <input ref={addInputRef}
                          value={addingTitle}
                          onChange={e => setAddingTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addTask()
                            if (e.key === 'Escape') { setIsAdding(false); setAddingTitle('') }
                          }}
                          placeholder="Nome da tarefa... (Enter para salvar, Esc para cancelar)"
                          className="flex-1 text-sm bg-transparent border-b border-brand-300 focus:outline-none px-1 py-0.5 text-stone-800 placeholder:text-stone-300" />
                        <Button size="sm" className="bg-brand-600 hover:bg-brand-700 h-7 text-xs" onClick={addTask}>
                          Adicionar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => { setIsAdding(false); setAddingTitle('') }}>
                          Cancelar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {active.length === 0 && !isAdding && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-stone-400 text-sm italic">
                      Nenhuma tarefa pendente. Clique em "Nova tarefa" para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {showDone && done.length > 0 && (
            <div className="border-t border-stone-200">
              <div className="px-4 py-2 bg-stone-50 text-xs font-medium text-stone-400 uppercase tracking-wide">
                Concluídas ({done.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  {COLS}
                  <tbody>
                    {done.map(t => (
                      <TaskRow key={t.id} task={t} statuses={statuses}
                        colaboradoras={colaboradoras} profileMap={profileMap}
                        onUpdate={makeUpdateFn(t.id)}
                        onDelete={() => deleteTask(t.id)}
                        onOpenPanel={() => setSelectedId(t.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <TaskPanel
          task={selected}
          userId={userId}
          onUpdate={makeUpdateFn(selected.id)}
          onDelete={() => deleteTask(selected.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      <ManageStatusesModal
        open={managingStatuses}
        onClose={() => setManagingStatuses(false)}
        statuses={statuses}
        onSaved={setStatuses}
      />
    </div>
  )
}
