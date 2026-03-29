import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Shield, PawPrint, Search, Heart, ChevronDown, ChevronUp,
  ChevronsUpDown, Loader2, PartyPopper, X, ExternalLink, Package,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Animal, Alert } from '@/types/database'
import { STATUS_ORDER } from '@/types/database'
import { SpecialNeedsBadge } from './dashboard/SpecialNeedsBadge'
import { AdocaoForm } from '@/components/forms/AdocaoForm'
import { LarTemporarioForm } from '@/components/forms/LarTemporarioForm'
import { VoluntarioForm } from '@/components/forms/VoluntarioForm'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLIC_STATUSES = ['pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado']

type StatusKey = 'pendente_resgate' | 'resgatado' | 'lar_temporario' | 'disponivel' | 'adotado'

const STATUS_CONFIG: Record<StatusKey, { label: string; shortLabel: string; color: string; bg: string; border: string; activeRing: string }> = {
  pendente_resgate: { label: 'Aguardando resgate', shortLabel: 'Aguardando resgate', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    activeRing: 'ring-red-400' },
  resgatado:        { label: 'Recém resgatado',    shortLabel: 'Recém resgatados',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', activeRing: 'ring-orange-400' },
  lar_temporario:   { label: 'Lar temporário',     shortLabel: 'Em lar temporário',  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   activeRing: 'ring-blue-400' },
  disponivel:       { label: 'Disponível',         shortLabel: 'Disponíveis',        color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', activeRing: 'ring-yellow-400' },
  adotado:          { label: 'Adotado! 🎉',        shortLabel: 'Adotados',           color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-300',  activeRing: 'ring-brand-400' },
}

const SEX_LABELS:     Record<string, string> = { macho: 'Macho', femea: 'Fêmea', indefinido: 'Indefinido' }
const SPECIES_LABELS: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }

type SortKey = 'status' | 'name' | 'species'
type SortDir = 'asc' | 'desc'

// ─── Alert modal ──────────────────────────────────────────────────────────────

function UrgentAlertModal({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  return (
    <Dialog open onOpenChange={open => !open && onDismiss()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <span className="text-lg">🚨</span>{alert.title}
          </DialogTitle>
        </DialogHeader>
        {alert.image_url && (
          <img src={alert.image_url} alt="" className="w-full max-h-60 object-cover rounded-lg" />
        )}
        <p className="text-stone-700 leading-relaxed whitespace-pre-line">{alert.body}</p>
        {alert.link_url && (
          <a href={alert.link_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-700 font-medium hover:underline text-sm">
            {alert.link_label ?? alert.link_url}
            <ExternalLink size={13} />
          </a>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onDismiss}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Interest type selector ───────────────────────────────────────────────────

type InterestType = 'adocao' | 'lar_temporario' | 'voluntario' | 'contribuicao'

function InterestTypeSelector({ open, onClose, animal, onSelect }: {
  open: boolean; onClose: () => void; animal: Animal | null; onSelect: (t: InterestType) => void
}) {
  const options: { type: InterestType; emoji: string; title: string; desc: string }[] = [
    { type: 'adocao',        emoji: '🏠', title: 'Quero adotar',           desc: 'Dar um lar definitivo a um animal' },
    { type: 'lar_temporario', emoji: '🛏️', title: 'Lar temporário',         desc: 'Acolher temporariamente até adoção' },
    { type: 'voluntario',    emoji: '🤝', title: 'Quero ser voluntário',   desc: 'Ajudar com resgates, transporte e mais' },
    { type: 'contribuicao',  emoji: '💰', title: 'Contribuir com despesas', desc: 'Ajudar com custos de tratamento' },
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart size={16} className="text-red-400" />
            {animal ? `Ajudar: ${animal.name}` : 'Como quer ajudar?'}
          </DialogTitle>
        </DialogHeader>
        {animal && (
          <div className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2 text-sm text-stone-600 mb-2">
            <span className="font-medium">{animal.name}</span> — {SPECIES_LABELS[animal.species]}, {SEX_LABELS[animal.sex]}
          </div>
        )}
        <div className="space-y-2">
          {options.map(o => (
            <button key={o.type} onClick={() => onSelect(o.type)}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 hover:border-brand-300 hover:bg-brand-50 transition-colors">
              <span className="text-2xl">{o.emoji}</span>
              <div>
                <p className="font-medium text-stone-800 text-sm">{o.title}</p>
                <p className="text-stone-400 text-xs">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Contribuição form (simple) ───────────────────────────────────────────────

const contribuicaoSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().min(8, 'Telefone obrigatório'),
  email:     z.string().email('Email inválido').optional().or(z.literal('')),
  message:   z.string().optional(),
})
type ContribuicaoValues = z.infer<typeof contribuicaoSchema>

function ContribuicaoModal({ open, onClose, animal }: {
  open: boolean; onClose: () => void; animal: Animal | null
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContribuicaoValues>({
    resolver: zodResolver(contribuicaoSchema),
  })

  async function onSubmit(values: ContribuicaoValues) {
    const { error } = await supabase.from('interests').insert({
      animal_id:     animal?.id ?? null,
      full_name:     values.full_name,
      phone:         values.phone,
      email:         values.email || null,
      interest_type: 'contribuicao',
      message:       values.message || null,
    })
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return }
    toast.success('Interesse registrado! Entraremos em contato em breve. 🐾')
    reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && (reset(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contribuir com despesas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input {...register('full_name')} />
            {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input placeholder="(67) 99999-0000" {...register('phone')} />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea rows={3} placeholder="Como gostaria de contribuir?" {...register('message')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Animal card ──────────────────────────────────────────────────────────────

function AnimalCard({ animal, photoUrl, onHelp }: { animal: Animal; photoUrl: string | null; onHelp: (a: Animal) => void }) {
  const cfg = STATUS_CONFIG[animal.status as StatusKey]
  const isAdopted = animal.status === 'adotado'

  return (
    <div className={`rounded-xl border overflow-hidden transition-all hover:shadow-md flex flex-col relative ${
      isAdopted
        ? 'border-brand-300 bg-gradient-to-b from-brand-50 to-white ring-1 ring-brand-200'
        : 'border-stone-200 bg-white'
    }`}>
      {animal.is_special_needs && (
        <SpecialNeedsBadge variant="ribbon" description={animal.special_needs_description} />
      )}
      <div className={`h-44 overflow-hidden ${isAdopted ? 'bg-brand-100/60' : 'bg-stone-100'}`}>
        {photoUrl ? (
          <img
            src={cloudinaryUrl(photoUrl, 'w_400,h_176,c_fill,q_auto,f_auto')}
            alt={animal.name}
            className="w-full h-full object-cover"
          />
        ) : isAdopted ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl">🎉</span>
            <span className="text-xs font-medium text-brand-700">Encontrou um lar!</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PawPrint size={40} className="text-stone-300" />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className={`font-semibold ${isAdopted ? 'text-brand-800' : 'text-stone-800'}`}>
            {animal.name}{isAdopted ? ' 🐾' : ''}
          </h3>
          {cfg && (
            <Badge variant="outline" className={`text-xs ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </Badge>
          )}
        </div>
        <p className="text-stone-400 text-xs mb-3">
          {SEX_LABELS[animal.sex]} · {SPECIES_LABELS[animal.species]}
          {animal.breed ? ` · ${animal.breed}` : ''}
        </p>
        {animal.notes && (
          <p className="text-stone-500 text-xs mb-3 line-clamp-2">{animal.notes}</p>
        )}
        <div className="mt-auto">
          {!isAdopted && (
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-brand-700 border-brand-200 hover:bg-brand-50"
              onClick={() => onHelp(animal)}>
              <Heart size={12} />Quero ajudar
            </Button>
          )}
          {isAdopted && (
            <div className="text-center text-xs text-brand-600 font-medium py-1">
              ✨ Este animal já tem um lar feliz ✨
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortButton({ label, field, current, dir, onSort }: {
  label: string; field: SortKey; current: SortKey; dir: SortDir; onSort: (f: SortKey) => void
}) {
  const active = current === field
  return (
    <button onClick={() => onSort(field)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
        active ? 'bg-white border-stone-300 text-stone-800 font-medium shadow-sm' : 'border-transparent text-stone-500 hover:text-stone-700'
      }`}>
      {label}
      {active ? (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-30" />}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [animals,       setAnimals]       = useState<Animal[]>([])
  const [photoMap,      setPhotoMap]      = useState<Record<string, string>>({})
  const [counts,        setCounts]        = useState<Partial<Record<StatusKey, number>>>({})
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [sortKey,       setSortKey]       = useState<SortKey>('status')
  const [sortDir,       setSortDir]       = useState<SortDir>('asc')
  const [statusFilter,  setStatusFilter]  = useState<StatusKey | null>(null)
  const [showAdopted,   setShowAdopted]   = useState(false)
  const [typeSelector, setTypeSelector]   = useState(false)
  const [activeForm, setActiveForm]       = useState<InterestType | null>(null)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [activeAlert,   setActiveAlert]   = useState<Alert | null>(null)
  const [wishList,      setWishList]      = useState<string[]>([])

  useEffect(() => {
    async function loadAll() {
      const [
        { data: animalData },
        { data: photoData },
        { data: alertData },
        { data: configData },
      ] = await Promise.all([
        supabase.from('animals').select('*').is('deleted_at', null).in('status', PUBLIC_STATUSES),
        supabase.from('animal_photos').select('animal_id, storage_path').eq('is_cover', true),
        supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1),
        supabase.from('site_config').select('value').eq('key', 'wish_list').single(),
      ])

      const animals = (animalData ?? []) as Animal[]
      setAnimals(animals)

      const map: Record<string, string> = {}
      ;(photoData ?? []).forEach((p: { animal_id: string; storage_path: string }) => { map[p.animal_id] = p.storage_path })
      setPhotoMap(map)

      const c: Partial<Record<StatusKey, number>> = {}
      animals.forEach(a => {
        if (a.status in STATUS_CONFIG) {
          c[a.status as StatusKey] = (c[a.status as StatusKey] ?? 0) + 1
        }
      })
      setCounts(c)

      if (alertData && alertData.length > 0) {
        const alert = alertData[0] as Alert
        const key = `alert_dismissed_${alert.id}`
        if (!sessionStorage.getItem(key)) {
          setActiveAlert(alert)
        }
      }

      if (configData?.value) {
        setWishList(configData.value as string[])
      }

      setLoading(false)
    }
    loadAll()
  }, [])

  function dismissAlert() {
    if (activeAlert) sessionStorage.setItem(`alert_dismissed_${activeAlert.id}`, '1')
    setActiveAlert(null)
  }

  function handleSort(field: SortKey) {
    if (field === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(field); setSortDir('asc') }
  }

  function handleCounterClick(key: StatusKey) {
    setStatusFilter(prev => prev === key ? null : key)
    if (key === 'adotado') setShowAdopted(true)
    document.getElementById('animais')?.scrollIntoView({ behavior: 'smooth' })
  }

  function openInterest(animal: Animal | null) {
    setSelectedAnimal(animal); setTypeSelector(true)
  }

  function handleTypeSelected(type: InterestType) {
    setTypeSelector(false)
    setActiveForm(type)
  }

  function closeForm() { setActiveForm(null); setSelectedAnimal(null) }

  const displayed = useMemo(() => {
    const q = search.toLowerCase()
    return animals
      .filter(a => {
        if (statusFilter) return a.status === statusFilter
        return showAdopted ? true : a.status !== 'adotado'
      })
      .filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.breed ?? '').toLowerCase().includes(q) ||
        SPECIES_LABELS[a.species]?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'status')  cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (sortKey === 'name')    cmp = a.name.localeCompare(b.name, 'pt-BR')
        if (sortKey === 'species') cmp = a.species.localeCompare(b.species)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [animals, search, sortKey, sortDir, statusFilter, showAdopted])

  const adoptedCount = animals.filter(a => a.status === 'adotado').length

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Urgent alert modal */}
      {activeAlert && <UrgentAlertModal alert={activeAlert} onDismiss={dismissAlert} />}

      {/* Nav */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* <img
            src="/logo.svg"
            alt="Protetoras TL"
            className="h-8 w-8 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline' }}
          /> */}
          <PawPrint className="text-brand-600" size={22} />
            <span className="hidden sm:inline font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5" onClick={() => openInterest(null)}>
            <Heart size={13} />Quero ajudar
          </Button>
          <Button asChild size="sm" variant="outline"><Link to="/login">Área restrita</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-10 sm:py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-brand-700 text-sm font-medium mb-6">
          <PawPrint size={14} />Três Lagoas, MS
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 mb-5 leading-tight">
          Animais que precisam<br className="hidden sm:block" /> de um lar cheio de amor
        </h1>
        <p className="text-stone-500 text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
          Acompanhe os animais resgatados pelas Protetoras de Três Lagoas — do resgate ao lar definitivo.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button size="lg" className="bg-brand-600 hover:bg-brand-700" onClick={() => {
            document.getElementById('animais')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            Ver animais disponíveis
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/contribuir"><Heart size={16} className="mr-1.5" />Fazer doação</Link>
          </Button>
          <Button variant="ghost" size="lg" className="text-stone-500" onClick={() => {
            document.getElementById('doacoes')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            <Package size={16} className="mr-1.5" />Itens aceitos
          </Button>
        </div>
      </section>

      {/* Status counters — clickable filters */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-center text-stone-400 text-xs uppercase tracking-widest mb-6 font-medium">
            Situação atual — clique para filtrar
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, s]) => {
              const isActive = statusFilter === key
              return (
                <button key={key}
                  onClick={() => handleCounterClick(key)}
                  className={`rounded-xl border ${s.border} ${s.bg} p-5 text-center transition-all hover:shadow-md ${
                    isActive ? `ring-2 ${s.activeRing} ring-offset-1 shadow-md` : 'hover:scale-[1.02]'
                  }`}>
                  <div className={`text-4xl font-bold ${s.color} mb-1`}>
                    {counts[key] ?? 0}
                  </div>
                  <div className="text-stone-500 text-xs leading-tight">{s.shortLabel}</div>
                  {isActive && (
                    <div className={`text-[10px] font-medium mt-1.5 ${s.color}`}>filtro ativo</div>
                  )}
                </button>
              )
            })}
          </div>
          {statusFilter && (
            <div className="text-center mt-4">
              <button onClick={() => setStatusFilter(null)}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 underline">
                <X size={11} />Limpar filtro
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Wish list */}
      {/* Animal list */}
      <section id="animais" className="border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-stone-800">
                {statusFilter ? STATUS_CONFIG[statusFilter].shortLabel : 'Animais'}
              </h2>
              <p className="text-stone-500 text-sm mt-1">Conheça os animais resgatados que precisam de atenção, lar ou adoção.</p>
            </div>
            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5" onClick={() => openInterest(null)}>
              <Heart size={13} />Quero ajudar
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, raça, espécie..." className="pl-9 bg-white" />
            </div>
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <SortButton label="Status"  field="status"  current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortButton label="Nome"    field="name"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortButton label="Espécie" field="species" current={sortKey} dir={sortDir} onSort={handleSort} />
            </div>
            {!statusFilter && (
              <button
                onClick={() => setShowAdopted(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  showAdopted
                    ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                }`}>
                <PartyPopper size={14} className={showAdopted ? 'text-brand-500' : 'text-stone-400'} />
                {showAdopted ? `Mostrando adotados (${adoptedCount}) 🎉` : 'Mostrar adotados'}
              </button>
            )}
            <p className="text-xs text-stone-400 ml-auto shrink-0">{displayed.length} {displayed.length !== 1 ? 'animais' : 'animal'}</p>
          </div>

          {showAdopted && !statusFilter && adoptedCount > 0 && (
            <div className="mb-6 bg-brand-50 border border-brand-200 rounded-xl px-6 py-4 flex items-center gap-3">
              <span className="text-3xl">🎊</span>
              <div>
                <p className="font-semibold text-brand-800">
                  {adoptedCount} animal{adoptedCount !== 1 ? 'is' : ''} {adoptedCount !== 1 ? 'encontraram' : 'encontrou'} um lar!
                </p>
                <p className="text-brand-700 text-sm">Cada adoção é uma história de amor. Obrigada a todos que abriram seus corações. 💚</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
              <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-20 text-center text-stone-400">
              <PawPrint size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? 'Nenhum animal encontrado.' : 'Nenhum animal disponível no momento.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayed.map(a => (
                <AnimalCard key={a.id} animal={a} photoUrl={photoMap[a.id] ?? null} onHelp={openInterest} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Donation items wishlist */}
      {wishList.length > 0 && (
        <section id="doacoes" className="border-t border-stone-200 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-brand-600" />
                <h2 className="text-base font-semibold text-stone-700">Itens sempre bem-vindos</h2>
              </div>
              <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5 self-start sm:self-auto">
                <Link to="/contribuir"><Heart size={13} />Doar via Pix</Link>
              </Button>
            </div>
            <p className="text-sm text-stone-500 mb-4">Doações desses itens ajudam diretamente no cuidado dos animais.</p>
            <div className="flex flex-wrap gap-2">
              {wishList.map(item => (
                <span key={item} className="px-3 py-1.5 bg-white border border-stone-200 rounded-full text-sm text-stone-700 font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      <section id="sobre" className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="flex items-start gap-3 mb-6">
            <Shield className="text-brand-600 mt-1" size={20} />
            <h2 className="text-2xl font-bold text-stone-800">Sobre o projeto</h2>
          </div>
          <p className="text-stone-500 leading-relaxed">
            As Protetoras de Três Lagoas trabalham voluntariamente no resgate, cuidado e encaminhamento de animais abandonados ou em situação de vulnerabilidade.
            Este sistema foi desenvolvido para organizar o trabalho de gestão dos animais, facilitando o acompanhamento do histórico médico, das custódias e do processo de adoção.
          </p>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white px-6 py-6 text-center text-stone-400 text-sm">
        © {new Date().getFullYear()} Protetoras Três Lagoas
        {' · '}
        <Link to="/transparencia" className="hover:text-stone-600 underline">Transparência</Link>
      </footer>

      <InterestTypeSelector
        open={typeSelector}
        onClose={() => setTypeSelector(false)}
        animal={selectedAnimal}
        onSelect={handleTypeSelected}
      />
      <AdocaoForm
        open={activeForm === 'adocao'}
        onClose={closeForm}
        animal={selectedAnimal}
      />
      <LarTemporarioForm
        open={activeForm === 'lar_temporario'}
        onClose={closeForm}
        animal={selectedAnimal}
      />
      <VoluntarioForm
        open={activeForm === 'voluntario'}
        onClose={closeForm}
      />
      <ContribuicaoModal
        open={activeForm === 'contribuicao'}
        onClose={closeForm}
        animal={selectedAnimal}
      />
    </div>
  )
}
