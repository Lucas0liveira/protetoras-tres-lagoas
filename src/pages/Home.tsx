import { lazy, Suspense, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Shield, PawPrint, Search, Heart, ChevronDown, ChevronUp,
  ChevronsUpDown, Loader2, PartyPopper, X, ExternalLink, Package,
  Menu, MapPin,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Animal, Alert, CollectionPoint } from '@/types/database'
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

const AnimalMap = lazy(() => import('@/components/AnimalMap'))

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLIC_STATUSES = ['pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado']

type StatusKey = 'pendente_resgate' | 'resgatado' | 'lar_temporario' | 'disponivel' | 'adotado'

const STATUS_CONFIG: Record<StatusKey, { label: string; shortLabel: string; color: string; bg: string; border: string; activeTab: string }> = {
  pendente_resgate: { label: 'Aguardando resgate', shortLabel: 'Aguardando resgate', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    activeTab: 'border-red-500 text-red-600' },
  resgatado:        { label: 'Recém resgatado',    shortLabel: 'Recém resgatados',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', activeTab: 'border-orange-500 text-orange-600' },
  lar_temporario:   { label: 'Lar temporário',     shortLabel: 'Em lar temporário',  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   activeTab: 'border-blue-500 text-blue-600' },
  disponivel:       { label: 'Disponível',         shortLabel: 'Disponíveis',        color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', activeTab: 'border-yellow-500 text-yellow-600' },
  adotado:          { label: 'Adotado! 🎉',        shortLabel: 'Adotados',           color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-300',  activeTab: 'border-brand-600 text-brand-700' },
}

const SEX_LABELS:     Record<string, string> = { macho: 'Macho', femea: 'Fêmea', indefinido: 'Indefinido' }
const SPECIES_LABELS: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }

type SortKey = 'status' | 'name' | 'species'
type SortDir = 'asc' | 'desc'

const CARD_HEALTH_BADGES = [
  { keys: ['castracao'],                                  label: 'Castrado',      cls: 'bg-green-50 text-green-700 border-green-200' },
  { keys: ['vacina_v8', 'vacina_v10', 'vacina_antirabica'], label: 'Vacinado',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { keys: ['vermifugacao'],                               label: 'Vermifugado',   cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  { keys: ['bravecto'],                                   label: 'Antiparasit.',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { keys: ['coleira_leishmaniose'],                       label: 'Coleira Leish', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
]

const NAV_LINKS = [
  { href: 'animais',  label: 'Animais' },
  { href: 'doacoes',  label: 'Doações' },
  // { href: 'mapa',     label: 'Mapa' },
  { href: 'pontos',   label: 'Pontos de Coleta' },
  { href: 'sobre',    label: 'Sobre' },
]

interface AnimalPin {
  id: string; name: string; species: string
  rescue_lat: number; rescue_lng: number; coverUrl?: string
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

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
    { type: 'adocao',        emoji: '🏠', title: 'Quero adotar',            desc: 'Dar um lar definitivo a um animal' },
    { type: 'lar_temporario', emoji: '🛏️', title: 'Lar temporário',          desc: 'Acolher temporariamente até adoção' },
    { type: 'voluntario',    emoji: '🤝', title: 'Quero ser voluntário',    desc: 'Ajudar com resgates, transporte e mais' },
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

// ─── Contribuição form ────────────────────────────────────────────────────────

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

function AnimalCard({ animal, photoUrl, procedures, onHelp }: {
  animal: Animal; photoUrl: string | null; procedures?: Set<string>; onHelp: (a: Animal) => void
}) {
  const cfg = STATUS_CONFIG[animal.status as StatusKey]
  const isAdopted = animal.status === 'adotado'

  const visibleBadges = procedures
    ? CARD_HEALTH_BADGES.filter(b => b.keys.some(k => procedures.has(k)))
    : []

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
            className="w-full h-full object-contain"
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
        <div className="flex items-start justify-between mb-1.5">
          <h3 className={`font-semibold ${isAdopted ? 'text-brand-800' : 'text-stone-800'}`}>
            {animal.name}{isAdopted ? ' 🐾' : ''}
          </h3>
          {cfg && (
            <Badge variant="outline" className={`text-xs shrink-0 ml-1 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </Badge>
          )}
        </div>
        <p className="text-stone-400 text-xs mb-2">
          {SEX_LABELS[animal.sex]} · {SPECIES_LABELS[animal.species]}
          {animal.breed ? ` · ${animal.breed}` : ''}
        </p>
        {visibleBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {visibleBadges.map(b => (
              <span key={b.label} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}
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
  const [animals,          setAnimals]          = useState<Animal[]>([])
  const [photoMap,         setPhotoMap]         = useState<Record<string, string>>({})
  const [sanitaryMap,      setSanitaryMap]      = useState<Record<string, Set<string>>>({})
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([])
  const [rescuePins,       setRescuePins]       = useState<AnimalPin[]>([])
  const [counts,           setCounts]           = useState<Partial<Record<StatusKey, number>>>({})
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [sortKey,          setSortKey]          = useState<SortKey>('status')
  const [sortDir,          setSortDir]          = useState<SortDir>('asc')
  const [statusFilter,     setStatusFilter]     = useState<StatusKey | null>(null)
  const [showAdopted,      setShowAdopted]      = useState(false)
  const [typeSelector,     setTypeSelector]     = useState(false)
  const [activeForm,       setActiveForm]       = useState<InterestType | null>(null)
  const [selectedAnimal,   setSelectedAnimal]   = useState<Animal | null>(null)
  const [activeAlert,      setActiveAlert]      = useState<Alert | null>(null)
  const [wishList,         setWishList]         = useState<string[]>([])
  const [scrolled,         setScrolled]         = useState(false)
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    async function loadAll() {
      const [
        { data: animalData },
        { data: photoData },
        { data: alertData },
        { data: configData },
        { data: sanitaryData },
        { data: pointsData },
        { data: rescueData },
      ] = await Promise.all([
        supabase.from('animals').select('*').is('deleted_at', null).in('status', PUBLIC_STATUSES),
        supabase.from('animal_photos').select('animal_id, storage_path').eq('is_cover', true),
        supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1),
        supabase.from('site_config').select('value').eq('key', 'wish_list').single(),
        supabase.from('sanitary_procedures').select('animal_id, procedure_type'),
        supabase.from('collection_points').select('*').eq('is_active', true).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('animal_rescues').select('animal_id, rescue_lat, rescue_lng').not('rescue_lat', 'is', null),
      ])

      const loadedAnimals = (animalData ?? []) as Animal[]
      setAnimals(loadedAnimals)

      const pMap: Record<string, string> = {}
      ;(photoData ?? []).forEach((p: { animal_id: string; storage_path: string }) => { pMap[p.animal_id] = p.storage_path })
      setPhotoMap(pMap)

      const c: Partial<Record<StatusKey, number>> = {}
      loadedAnimals.forEach(a => {
        if (a.status in STATUS_CONFIG) c[a.status as StatusKey] = (c[a.status as StatusKey] ?? 0) + 1
      })
      setCounts(c)

      const sMap: Record<string, Set<string>> = {}
      ;(sanitaryData ?? []).forEach((s: { animal_id: string; procedure_type: string }) => {
        if (!sMap[s.animal_id]) sMap[s.animal_id] = new Set()
        sMap[s.animal_id].add(s.procedure_type)
      })
      setSanitaryMap(sMap)

      setCollectionPoints((pointsData ?? []) as CollectionPoint[])

      const rMap: Record<string, { lat: number; lng: number }> = {}
      ;(rescueData ?? []).forEach((r: { animal_id: string; rescue_lat: number; rescue_lng: number }) => {
        if (!rMap[r.animal_id]) rMap[r.animal_id] = { lat: r.rescue_lat, lng: r.rescue_lng }
      })
      const pins: AnimalPin[] = loadedAnimals
        .filter(a => a.status === 'pendente_resgate' && rMap[a.id])
        .map(a => ({
          id: a.id,
          name: a.name,
          species: a.species,
          rescue_lat: rMap[a.id].lat,
          rescue_lng: rMap[a.id].lng,
          coverUrl: pMap[a.id] ? cloudinaryUrl(pMap[a.id], 'w_200,h_150,c_fill,q_auto,f_auto') : undefined,
        }))
      setRescuePins(pins)

      if (alertData && alertData.length > 0) {
        const alert = alertData[0] as Alert
        if (!sessionStorage.getItem(`alert_dismissed_${alert.id}`)) setActiveAlert(alert)
      }

      if (configData?.value) setWishList(configData.value as string[])

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

  function handleTabClick(key: StatusKey) {
    setStatusFilter(prev => prev === key ? null : key)
    if (key === 'adotado') setShowAdopted(true)
    scrollTo('animais')
  }

  function openInterest(animal: Animal | null) {
    setSelectedAnimal(animal); setTypeSelector(true)
  }

  function handleTypeSelected(type: InterestType) {
    setTypeSelector(false); setActiveForm(type)
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
      {activeAlert && <UrgentAlertModal alert={activeAlert} onDismiss={dismissAlert} />}

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-20 bg-white/95 border-b border-stone-200 transition-shadow ${scrolled ? 'shadow-sm backdrop-blur-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <PawPrint className="text-brand-600" size={20} />
            <span className="font-semibold text-stone-700 text-sm">Protetoras Três Lagoas</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <button key={href} onClick={() => scrollTo(href)}
                className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors">
                {label}
              </button>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" className="hidden sm:inline-flex bg-brand-600 hover:bg-brand-700 gap-1.5" onClick={() => openInterest(null)}>
              <Heart size={13} />Quero ajudar
            </Button>
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/login">Área restrita</Link>
            </Button>
            {/* Mobile hamburger */}
            <button className="md:hidden p-2 text-stone-500 hover:text-stone-700" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <button key={href} onClick={() => { scrollTo(href); setMobileMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-lg">
                {label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 bg-brand-600 hover:bg-brand-700 gap-1.5" onClick={() => { openInterest(null); setMobileMenuOpen(false) }}>
                <Heart size={13} />Quero ajudar
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Área restrita</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-brand-700 text-sm font-medium mb-6">
            <PawPrint size={14} />Três Lagoas, MS
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 mb-5 leading-tight">
            Animais que precisam<br className="hidden sm:block" /> de um lar cheio de amor
          </h1>
          <p className="text-stone-500 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Acompanhe os animais resgatados pelas Protetoras de Três Lagoas — do resgate ao lar definitivo.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button size="lg" className="bg-brand-600 hover:bg-brand-700" onClick={() => scrollTo('animais')}>
              Ver animais disponíveis
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contribuir"><Heart size={16} className="mr-1.5" />Fazer doação</Link>
            </Button>
            <Button variant="ghost" size="lg" className="text-stone-500" onClick={() => scrollTo('doacoes')}>
              <Package size={16} className="mr-1.5" />Itens aceitos
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Animals ─────────────────────────────────────────────────────────── */}
      <section id="animais" className="border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
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

          {/* Status tabs */}
          <div className="flex overflow-x-auto gap-0 mb-5 border-b border-stone-200 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => { setStatusFilter(null); setShowAdopted(false) }}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                statusFilter === null
                  ? 'border-stone-800 text-stone-800'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}>
              Todos ({animals.filter(a => a.status !== 'adotado').length})
            </button>
            {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, cfg]) => (
              <button key={key}
                onClick={() => handleTabClick(key)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                  statusFilter === key
                    ? cfg.activeTab
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}>
                {cfg.shortLabel} ({counts[key] ?? 0})
              </button>
            ))}
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
                <AnimalCard
                  key={a.id}
                  animal={a}
                  photoUrl={photoMap[a.id] ?? null}
                  procedures={sanitaryMap[a.id]}
                  onHelp={openInterest}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Donation items ───────────────────────────────────────────────────── */}
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

      {/* ─── Map ─────────────────────────────────────────────────────────────── */}
      <section id="mapa" className="border-t border-stone-200 bg-white hidden">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-brand-600" />
            <h2 className="text-xl font-bold text-stone-800">Animais aguardando resgate</h2>
          </div>
          <p className="text-stone-500 text-sm mb-6">
            Localizações dos animais resgatados que ainda aguardam cuidados ou lar temporário.
          </p>
          <Suspense fallback={<div className="h-[360px] rounded-2xl bg-stone-100 animate-pulse" />}>
            <AnimalMap pins={rescuePins} />
          </Suspense>
        </div>
      </section>

      {/* ─── Collection points ───────────────────────────────────────────────── */}
      {collectionPoints.length > 0 && (
        <section id="pontos" className="border-t border-stone-200 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-brand-600" />
              <h2 className="text-xl font-bold text-stone-800">Pontos de coleta de doações</h2>
            </div>
            <p className="text-stone-500 text-sm mb-6">Deixe doações de itens nesses locais parceiros.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionPoints.map(pt => (
                <div key={pt.id} className="bg-white rounded-xl border border-stone-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={14} className="text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 text-sm">{pt.name}</p>
                      <p className="text-stone-500 text-xs mt-0.5">
                        {pt.address}{pt.neighborhood ? ` — ${pt.neighborhood}` : ''}
                      </p>
                      {pt.notes && <p className="text-stone-400 text-xs mt-1 leading-relaxed">{pt.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── About ───────────────────────────────────────────────────────────── */}
      <section id="sobre" className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="flex items-start gap-3 mb-5">
            <Shield className="text-brand-600 mt-1 shrink-0" size={20} />
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
      <AdocaoForm open={activeForm === 'adocao'} onClose={closeForm} animal={selectedAnimal} />
      <LarTemporarioForm open={activeForm === 'lar_temporario'} onClose={closeForm} animal={selectedAnimal} />
      <VoluntarioForm open={activeForm === 'voluntario'} onClose={closeForm} />
      <ContribuicaoModal open={activeForm === 'contribuicao'} onClose={closeForm} animal={selectedAnimal} />
    </div>
  )
}
