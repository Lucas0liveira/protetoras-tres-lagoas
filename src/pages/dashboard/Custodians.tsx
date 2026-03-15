import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, ChevronDown, ChevronUp, ChevronsUpDown, PawPrint, Home, HandHeart } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustodyRow {
  id: string
  custody_type: 'lar_temporario' | 'adocao'
  started_at: string
  ended_at: string | null
  is_active: boolean
  term_date: string | null
  animal: { id: string; name: string; species: string; breed: string | null }
}

interface CustodianWithHistory {
  id: string
  full_name: string
  phone: string
  email: string | null
  cpf: string | null
  address_street: string | null
  address_neighborhood: string | null
  address_city: string | null
  notes: string | null
  custodies: CustodyRow[]
}

type Tab = 'todos' | 'lar_temporario' | 'adocao'

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const SPECIES_LABELS: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }

// ─── Custodian card ───────────────────────────────────────────────────────────

function CustodianCard({ custodian }: { custodian: CustodianWithHistory }) {
  const [expanded, setExpanded] = useState(false)

  const activeCustodies  = custodian.custodies.filter(c => c.is_active)
  const adoptions        = custodian.custodies.filter(c => c.custody_type === 'adocao')
  const fosters          = custodian.custodies.filter(c => c.custody_type === 'lar_temporario')

  const hasActive = activeCustodies.length > 0

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${hasActive ? 'border-stone-200' : 'border-stone-100'}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-stone-800">{custodian.full_name}</p>
            {adoptions.some(c => c.is_active) && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Adoção ativa</Badge>
            )}
            {fosters.some(c => c.is_active) && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Lar temporário ativo</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-400">
            {custodian.phone && <span>{custodian.phone}</span>}
            {custodian.email && <span>{custodian.email}</span>}
            {custodian.cpf   && <span>CPF: {custodian.cpf}</span>}
            {custodian.address_city && (
              <span>{[custodian.address_neighborhood, custodian.address_city].filter(Boolean).join(', ')}</span>
            )}
          </div>
          {/* Quick stats */}
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-stone-800">{custodian.custodies.length}</p>
              <p className="text-xs text-stone-400">Total custódias</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{adoptions.length}</p>
              <p className="text-xs text-stone-400">Adoções</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{fosters.length}</p>
              <p className="text-xs text-stone-400">Lares temp.</p>
            </div>
            {activeCustodies.length > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{activeCustodies.length}</p>
                <p className="text-xs text-stone-400">Ativo agora</p>
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-stone-400 gap-1" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {expanded ? 'Menos' : 'Histórico'}
        </Button>
      </div>

      {/* Active pets */}
      {activeCustodies.length > 0 && (
        <div className="border-t border-stone-100 px-5 py-3 bg-stone-50/50">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Pets atuais</p>
          <div className="flex flex-wrap gap-2">
            {activeCustodies.map(c => (
              <a key={c.id} href={`/dashboard/animais/${c.animal.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                  hover:bg-white hover:border-stone-300
                  bg-white border-stone-200 text-stone-700">
                <PawPrint size={12} className="text-emerald-500" />
                {c.animal.name}
                <span className="text-xs text-stone-400">
                  ({SPECIES_LABELS[c.animal.species] ?? c.animal.species})
                </span>
                <Badge variant="outline" className={`text-xs ml-1 ${c.custody_type === 'adocao'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {c.custody_type === 'adocao' ? 'Adoção' : 'Lar temp.'}
                </Badge>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Full history (expanded) */}
      {expanded && custodian.custodies.length > 0 && (
        <div className="border-t border-stone-100 px-5 py-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Histórico completo</p>
          <div className="space-y-2">
            {custodian.custodies.map(c => (
              <div key={c.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border text-sm ${c.is_active
                ? 'border-stone-200 bg-white' : 'border-stone-100 bg-stone-50 opacity-75'}`}>
                <div className="flex items-center gap-2">
                  <a href={`/dashboard/animais/${c.animal.id}`}
                    className="font-medium text-stone-700 hover:text-emerald-600 hover:underline">
                    {c.animal.name}
                  </a>
                  <span className="text-xs text-stone-400">{SPECIES_LABELS[c.animal.species]}</span>
                  <Badge variant="outline" className={`text-xs ${c.custody_type === 'adocao'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {c.custody_type === 'adocao' ? 'Adoção' : 'Lar temporário'}
                  </Badge>
                  {c.is_active && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Ativo</Badge>}
                </div>
                <div className="text-xs text-stone-400 text-right">
                  <p>{fmt(c.started_at)}{c.ended_at ? ` → ${fmt(c.ended_at)}` : ' → hoje'}</p>
                  {c.ended_at && (
                    <p className="text-stone-300">
                      {Math.round((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 86400000)} dias
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {custodian.notes && (
            <p className="text-xs text-stone-400 mt-3 italic">{custodian.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Custodians() {
  const [custodians, setCustodians] = useState<CustodianWithHistory[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState<Tab>('todos')
  const [sortKey, setSortKey]       = useState<'full_name' | 'custodies'>('full_name')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('custodians')
      .select(`
        id, full_name, phone, email, cpf,
        address_street, address_neighborhood, address_city, notes,
        animal_custody (
          id, custody_type, started_at, ended_at, is_active, termo_date,
          animal:animals ( id, name, species, breed )
        )
      `)
      .is('deleted_at', null)
      .order('full_name')

    if (error) { toast.error('Erro ao carregar custódias'); setLoading(false); return }

    const result = (data ?? []).map((c: any) => ({
      ...c,
      custodies: (c.animal_custody ?? []).sort((a: any, b: any) => b.started_at.localeCompare(a.started_at)),
    })) as CustodianWithHistory[]

    setCustodians(result)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return custodians
      .filter(c => {
        if (tab === 'lar_temporario') return c.custodies.some(cu => cu.custody_type === 'lar_temporario')
        if (tab === 'adocao')         return c.custodies.some(cu => cu.custody_type === 'adocao')
        return true
      })
      .filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.cpf ?? '').includes(q)
      )
      .sort((a, b) => {
        let cmp = sortKey === 'full_name'
          ? a.full_name.localeCompare(b.full_name, 'pt-BR')
          : a.custodies.length - b.custodies.length
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [custodians, search, tab, sortKey, sortDir])

  const totalAdotantes     = custodians.filter(c => c.custodies.some(cu => cu.custody_type === 'adocao' && cu.is_active)).length
  const totalLares         = custodians.filter(c => c.custodies.some(cu => cu.custody_type === 'lar_temporario' && cu.is_active)).length
  const totalCustodias     = custodians.reduce((sum, c) => sum + c.custodies.length, 0)

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'todos',          label: 'Todos',            icon: HandHeart },
    { key: 'adocao',         label: 'Adoções',          icon: Home },
    { key: 'lar_temporario', label: 'Lares temporários', icon: PawPrint },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Adotantes & Lares</h1>
        <p className="text-stone-400 text-sm mt-1">Todas as pessoas com custódia de animais registrada</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Adoções ativas',       value: totalAdotantes,  color: 'text-emerald-600' },
          { label: 'Lares temporários ativos', value: totalLares,  color: 'text-blue-600' },
          { label: 'Total de custódias',   value: totalCustodias,  color: 'text-stone-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-stone-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'}`}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Buscar por nome, telefone, CPF..." className="pl-9 bg-white"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
          {([
            { key: 'full_name', label: 'Nome' },
            { key: 'custodies', label: 'Custódias' },
          ] as const).map(s => (
            <button key={s.key}
              onClick={() => { if (sortKey === s.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(s.key); setSortDir('asc') } }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortKey === s.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {s.label}
              {sortKey === s.key ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-30" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400 shrink-0">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
          <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-stone-400 text-sm bg-white rounded-xl border border-stone-200">
          {search ? 'Nenhum resultado encontrado.' : 'Nenhum responsável cadastrado ainda.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => <CustodianCard key={c.id} custodian={c} />)}
        </div>
      )}
    </div>
  )
}