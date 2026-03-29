import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PawPrint, Search, ArrowLeft, Heart, ChevronDown, ChevronUp,
  ChevronsUpDown, Loader2, PartyPopper,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Animal } from '@/types/database'
import { STATUS_ORDER } from '@/types/database'
import { SpecialNeedsBadge } from './dashboard/SpecialNeedsBadge'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLIC_STATUSES = ['pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pendente_resgate: { label: 'Aguardando resgate', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  resgatado:        { label: 'Recém resgatado',    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  lar_temporario:   { label: 'Lar temporário',     color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  disponivel:       { label: 'Disponível',         color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  adotado:          { label: 'Adotado! 🎉',        color: 'text-brand-700', bg: 'bg-brand-50', border: 'border-brand-300' },
}

const SEX_LABELS:     Record<string, string> = { macho: 'Macho', femea: 'Fêmea', indefinido: 'Indefinido' }
const SPECIES_LABELS: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }

type SortKey = 'status' | 'name' | 'species'
type SortDir = 'asc' | 'desc'

// ─── Interest form ────────────────────────────────────────────────────────────

const interestSchema = z.object({
  full_name:     z.string().min(2, 'Nome obrigatório'),
  phone:         z.string().min(8, 'Telefone obrigatório'),
  email:         z.string().email('Email inválido').optional().or(z.literal('')),
  interest_type: z.enum(['adocao', 'lar_temporario', 'contribuicao']),
  message:       z.string().optional(),
})
type InterestValues = z.infer<typeof interestSchema>

function InterestModal({ open, onClose, animal }: {
  open: boolean; onClose: () => void; animal: Animal | null
}) {
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<InterestValues>({
    resolver: zodResolver(interestSchema),
  })

  async function onSubmit(values: InterestValues) {
    const { error } = await supabase.from('interests').insert({
      animal_id:     animal?.id ?? null,
      full_name:     values.full_name,
      phone:         values.phone,
      email:         values.email || null,
      interest_type: values.interest_type,
      message:       values.message || null,
    })
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return }
    toast.success('Interesse registrado! Entraremos em contato em breve. 🐾')
    reset(); onClose()
  }

  function handleClose() { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart size={16} className="text-red-400" />
            {animal ? `Quero ajudar: ${animal.name}` : 'Quero ajudar'}
          </DialogTitle>
        </DialogHeader>
        {animal && (
          <div className="bg-stone-50 border border-stone-100 rounded-lg px-4 py-3 text-sm text-stone-600">
            <span className="font-medium">{animal.name}</span> — {SPECIES_LABELS[animal.species]}, {SEX_LABELS[animal.sex]}
            {animal.breed ? `, ${animal.breed}` : ''}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Como quer ajudar? *</Label>
              <Select onValueChange={(v) => setValue('interest_type', v as any)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adocao">🏠 Quero adotar</SelectItem>
                  <SelectItem value="lar_temporario">🛏️ Quero ser lar temporário</SelectItem>
                  <SelectItem value="contribuicao">💰 Quero contribuir com despesas</SelectItem>
                </SelectContent>
              </Select>
              {errors.interest_type && <p className="text-red-500 text-xs">{errors.interest_type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input {...register('full_name')} />
              {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input placeholder="(67) 99999-0000" {...register('phone')} />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea rows={3} placeholder="Conte um pouco sobre você, sua moradia, rotina..." {...register('message')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
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
  const cfg = STATUS_CONFIG[animal.status]
  const isAdopted = animal.status === 'adotado'

  return (
    <div className={`rounded-xl border overflow-hidden transition-all hover:shadow-md flex flex-col relative ${
      isAdopted
        ? 'border-brand-300 bg-gradient-to-b from-brand-50 to-white ring-1 ring-brand-200'
        : 'border-stone-200 bg-white'
    }`}>
      {/* Special needs ribbon */}
      {animal.is_special_needs && (
        <SpecialNeedsBadge variant="ribbon" description={animal.special_needs_description} />
      )}

      {/* Photo */}
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
          <Badge variant="outline" className={`text-xs ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {cfg.label}
          </Badge>
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

// ─── Sort header ──────────────────────────────────────────────────────────────

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

export default function PublicAnimals() {
  const [animals,      setAnimals]      = useState<Animal[]>([])
  const [photoMap,     setPhotoMap]     = useState<Record<string, string>>({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('status')
  const [sortDir,      setSortDir]      = useState<SortDir>('asc')
  const [showAdopted,  setShowAdopted]  = useState(false)
  const [interestModal, setInterestModal] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: animalData }, { data: photoData }] = await Promise.all([
        supabase.from('animals').select('*').is('deleted_at', null).in('status', PUBLIC_STATUSES),
        supabase.from('animal_photos').select('animal_id, storage_path').eq('is_cover', true),
      ])
      setAnimals((animalData ?? []) as Animal[])
      const map: Record<string, string> = {}
      ;(photoData ?? []).forEach((p: any) => { map[p.animal_id] = p.storage_path })
      setPhotoMap(map)
      setLoading(false)
    }
    load()
  }, [])

  function handleSort(field: SortKey) {
    if (field === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(field); setSortDir('asc') }
  }

  function openInterest(animal: Animal | null) {
    setSelectedAnimal(animal); setInterestModal(true)
  }

  const displayed = useMemo(() => {
    const q = search.toLowerCase()
    return animals
      .filter(a => showAdopted ? true : a.status !== 'adotado')
      .filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.breed ?? '').toLowerCase().includes(q) ||
        SPECIES_LABELS[a.species]?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'status')   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (sortKey === 'name')     cmp = a.name.localeCompare(b.name, 'pt-BR')
        if (sortKey === 'species')  cmp = a.species.localeCompare(b.species)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [animals, search, sortKey, sortDir, showAdopted])

  const adoptedCount = animals.filter(a => a.status === 'adotado').length

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <PawPrint className="text-brand-600" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button size="sm" className="bg-brand-600 hover:bg-brand-700 gap-1.5"
            onClick={() => openInterest(null)}>
            <Heart size={13} />Quero ajudar
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft size={15} className="mr-1" />Início</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-2">Animais</h1>
          <p className="text-stone-500">Conheça os animais resgatados que precisam de atenção, lar temporário ou adoção.</p>
        </div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, raça, espécie..." className="pl-9 bg-white" />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
            <SortButton label="Status"  field="status"  current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortButton label="Nome"    field="name"    current={sortKey} dir={sortDir} onSort={handleSort} />
            <SortButton label="Espécie" field="species" current={sortKey} dir={sortDir} onSort={handleSort} />
          </div>

          {/* Adopted toggle */}
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

          <p className="text-xs text-stone-400 ml-auto shrink-0">{displayed.length} animal{displayed.length !== 1 ? 'is' : ''}</p>
        </div>

        {/* Adopted celebration banner */}
        {showAdopted && adoptedCount > 0 && (
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

        {/* Grid */}
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
      </main>

      <InterestModal open={interestModal} onClose={() => setInterestModal(false)} animal={selectedAnimal} />
    </div>
  )
}