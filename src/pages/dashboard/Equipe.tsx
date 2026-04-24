import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, Plus, Pencil, UserCheck, UserX, Link, LinkOff } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { Colaboradora, Profile } from '@/types/database'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Modal ────────────────────────────────────────────────────────────────────

function ColaboradoraModal({ open, onClose, item, unlinkedProfiles, onSaved }: {
  open: boolean; onClose: () => void
  item: Colaboradora | null
  unlinkedProfiles: Pick<Profile, 'id' | 'display_name'>[]
  onSaved: (c: Colaboradora) => void
}) {
  const [name,   setName]   = useState(item?.name   ?? '')
  const [phone,  setPhone]  = useState(item?.phone  ?? '')
  const [email,  setEmail]  = useState(item?.email  ?? '')
  const [notes,  setNotes]  = useState(item?.notes  ?? '')
  const [userId, setUserId] = useState(item?.user_id ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(item?.name ?? ''); setPhone(item?.phone ?? '')
    setEmail(item?.email ?? ''); setNotes(item?.notes ?? '')
    setUserId(item?.user_id ?? '')
  }, [item, open])

  async function handleSave() {
    if (!name.trim()) { toast.error('Nome obrigatório.'); return }
    setSaving(true)
    const payload = {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      user_id: userId || null,
    }
    const { data, error } = item
      ? await supabase.from('colaboradoras').update(payload).eq('id', item.id).select().single()
      : await supabase.from('colaboradoras').insert(payload).select().single()
    setSaving(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(item ? 'Colaboradora atualizada.' : 'Colaboradora cadastrada.')
    onSaved(data as Colaboradora); onClose()
  }

  // Profiles available for this record: unlinked ones + the one currently linked to this record
  const availableProfiles = useMemo(() => {
    if (!item?.user_id) return unlinkedProfiles
    // Include the currently linked profile even if not in the "unlinked" list
    return unlinkedProfiles.some(p => p.id === item.user_id)
      ? unlinkedProfiles
      : [...unlinkedProfiles, { id: item.user_id, display_name: '(usuária atual)' }]
  }, [unlinkedProfiles, item?.user_id])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar colaboradora' : 'Nova colaboradora'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Nome <span className="text-red-500">*</span></Label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(67) 9 9999-9999"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </div>

          {/* User link */}
          <div className="space-y-1.5 border-t border-stone-100 pt-3">
            <Label className="flex items-center gap-1.5">
              <Link size={12} className="text-stone-400" />
              Usuária do sistema
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Sem conta vinculada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem conta vinculada</SelectItem>
                {availableProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-stone-400">
              Vincule a um usuário do sistema para que ela apareça como responsável em tarefas e tenha acesso ao dashboard.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-brand-600 hover:bg-brand-700" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin mr-1" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Equipe() {
  const [items,   setItems]   = useState<Colaboradora[]>([])
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'display_name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Colaboradora | null>(null)
  const [search,  setSearch]  = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cols }, { data: profs }] = await Promise.all([
      supabase.from('colaboradoras').select('*').is('deleted_at', null).order('name'),
      supabase.from('profiles').select('id, display_name').order('display_name'),
    ])
    setItems((cols ?? []) as Colaboradora[])
    setProfiles((profs ?? []) as Pick<Profile, 'id' | 'display_name'>[])
    setLoading(false)
  }

  async function toggleActive(item: Colaboradora) {
    const { data, error } = await supabase.from('colaboradoras')
      .update({ is_active: !item.is_active }).eq('id', item.id).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    setItems(prev => prev.map(x => x.id === item.id ? data as Colaboradora : x))
  }

  // Profiles not yet linked to any colaboradora (excluding the one being edited)
  const unlinkedProfiles = useMemo(() => {
    const linkedIds = new Set(items.map(c => c.user_id).filter(Boolean))
    // When editing, exclude the current item's user_id from the "taken" set
    if (editing?.user_id) linkedIds.delete(editing.user_id)
    return profiles.filter(p => !linkedIds.has(p.id))
  }, [profiles, items, editing])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  // Build a map of user_id → display_name for the table
  const profileMap = useMemo(() =>
    Object.fromEntries(profiles.map(p => [p.id, p.display_name])),
    [profiles])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Equipe</h1>
        <p className="text-stone-400 text-sm mt-1">Colaboradoras e voluntárias da organização</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou contato..."
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 gap-1.5 ml-auto" size="sm"
          onClick={() => { setEditing(null); setModal(true) }}>
          <Plus size={14} />Nova colaboradora
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400 gap-2">
            <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">
            {search ? 'Nenhuma colaboradora encontrada.' : 'Nenhuma colaboradora cadastrada ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Contato</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Acesso</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className={`border-b border-stone-50 hover:bg-stone-50/50 ${!c.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{c.name}</p>
                      {c.notes && <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-sm">
                      {c.phone && <p>{c.phone}</p>}
                      {c.email && <p className="text-xs text-stone-400">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.user_id ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-brand-50 text-brand-700 border-brand-200">
                          <Link size={10} />
                          {profileMap[c.user_id] ?? 'Vinculada'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-stone-50 text-stone-400 border-stone-200">
                          <LinkOff size={10} />
                          Sem conta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                        c.is_active
                          ? 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'bg-stone-50 text-stone-400 border-stone-200'
                      }`}>
                        {c.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-stone-400 hover:text-brand-600"
                          onClick={() => { setEditing(c); setModal(true) }}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className={`h-7 w-7 p-0 ${c.is_active ? 'text-stone-400 hover:text-red-500' : 'text-stone-400 hover:text-brand-600'}`}
                          title={c.is_active ? 'Desativar' : 'Reativar'}
                          onClick={() => toggleActive(c)}>
                          {c.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ColaboradoraModal
        open={modal}
        onClose={() => setModal(false)}
        item={editing}
        unlinkedProfiles={unlinkedProfiles}
        onSaved={saved => {
          setItems(prev => prev.some(x => x.id === saved.id)
            ? prev.map(x => x.id === saved.id ? saved : x)
            : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
          setModal(false)
        }}
      />
    </div>
  )
}
