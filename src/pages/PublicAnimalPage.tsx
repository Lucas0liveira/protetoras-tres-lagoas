import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PawPrint, ChevronLeft, ChevronRight, Heart, ArrowLeft } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Animal, AnimalPhoto, SanitaryProcedure } from '@/types/database'
import { AdocaoForm } from '@/components/forms/AdocaoForm'
import { LarTemporarioForm } from '@/components/forms/LarTemporarioForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIES_LABELS: Record<string, string> = { canino: 'Cachorro', felino: 'Gato', outro: 'Animal' }
const SEX_LABELS:     Record<string, string> = { macho: 'Macho', femea: 'Fêmea', indefinido: 'Indefinido' }
const PORTE_LABELS:   Record<string, string> = { mini: 'Mini', pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande', gigante: 'Gigante' }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pendente_resgate: { label: 'Pendente resgate', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  resgatado:        { label: 'Em resgate',        color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  lar_temporario:   { label: 'Lar temporário',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  disponivel:       { label: 'Disponível',         color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  adotado:          { label: 'Adotado',            color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-200' },
}

const HEALTH_BADGES = [
  { label: 'Vacinado',    keys: ['vacina_v8', 'vacina_v10', 'vacina_antirabica'], cls: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Castrado',    keys: ['castracao'],                                    cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Vermifugado', keys: ['vermifugacao'],                                 cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Microchip',   keys: ['microchipagem'],                                cls: 'bg-stone-50 text-stone-600 border-stone-300' },
]

// ─── Carousel ─────────────────────────────────────────────────────────────────

function PhotoCarousel({ photos, name }: { photos: AnimalPhoto[]; name: string }) {
  const [idx, setIdx] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-100 rounded-2xl flex items-center justify-center">
        <PawPrint size={56} className="text-stone-300" />
      </div>
    )
  }

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)

  return (
    <div className="relative w-full aspect-[4/3] bg-stone-900 rounded-2xl overflow-hidden select-none">
      <img
        key={photos[idx].id}
        src={cloudinaryUrl(photos[idx].storage_path, 'w_800,h_600,c_fit,q_auto,f_auto')}
        alt={`${name} — foto ${idx + 1}`}
        className="w-full h-full object-contain"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveForm = 'adocao' | 'lar_temporario' | null

export default function PublicAnimalPage() {
  const { id } = useParams<{ id: string }>()

  const [animal,     setAnimal]     = useState<Animal | null>(null)
  const [photos,     setPhotos]     = useState<AnimalPhoto[]>([])
  const [procedures, setProcedures] = useState<Set<string>>(new Set())
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [
        { data: animalData, error },
        { data: photoData },
        { data: sanitaryData },
      ] = await Promise.all([
        supabase.from('animals').select('*').eq('id', id!).eq('deleted_at', null as any).single(),
        supabase.from('animal_photos').select('*').eq('animal_id', id!).eq('is_public', true).order('created_at'),
        supabase.from('sanitary_procedures').select('procedure_type').eq('animal_id', id!),
      ])
      if (error || !animalData) { setNotFound(true); setLoading(false); return }
      setAnimal(animalData as Animal)
      setPhotos((photoData ?? []) as AnimalPhoto[])
      setProcedures(new Set((sanitaryData ?? []).map((s: any) => s.procedure_type)))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <PawPrint size={32} className="text-brand-400 animate-pulse" />
      </div>
    )
  }

  if (notFound || !animal) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <PawPrint size={48} className="text-stone-300" />
        <h1 className="text-xl font-semibold text-stone-600">Animal não encontrado</h1>
        <Button asChild variant="outline"><Link to="/">← Voltar ao início</Link></Button>
      </div>
    )
  }

  const cfg        = STATUS_CONFIG[animal.status]
  const isAdopted  = animal.status === 'adotado'
  const canHelp    = !isAdopted && animal.status !== 'obito' && animal.status !== 'dono_identificado'
  const healthBadges = HEALTH_BADGES.filter(b => b.keys.some(k => procedures.has(k)))

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Protetoras TL" className="h-8 w-8 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline' }} />
          <PawPrint className="text-brand-600 hidden" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <Button asChild size="sm" variant="ghost" className="text-stone-500 gap-1.5">
          <Link to="/"><ArrowLeft size={14} />Todos os animais</Link>
        </Button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Carousel */}
        <PhotoCarousel photos={photos} name={animal.name} />

        {/* Info */}
        <div className="mt-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{animal.name}</h1>
              <p className="text-stone-500 text-sm mt-1">
                {SPECIES_LABELS[animal.species]}
                {animal.sex !== 'indefinido' ? ` · ${SEX_LABELS[animal.sex]}` : ''}
                {animal.breed ? ` · ${animal.breed}` : ''}
                {animal.porte ? ` · Porte ${PORTE_LABELS[animal.porte]}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {cfg && (
                <Badge variant="outline" className={`${cfg.color} ${cfg.bg} ${cfg.border}`}>
                  {cfg.label}
                </Badge>
              )}
              {animal.is_special_needs && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Necessidades especiais
                </Badge>
              )}
            </div>
          </div>

          {/* Health badges */}
          {healthBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {healthBadges.map(b => (
                <span key={b.label} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${b.cls}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Public description */}
          {animal.public_description && (
            <p className="text-stone-600 leading-relaxed text-sm sm:text-base mb-6">
              {animal.public_description}
            </p>
          )}

          {/* CTAs */}
          {isAdopted ? (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-6 py-5 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-semibold text-brand-800">Este animal já encontrou um lar feliz!</p>
              <p className="text-sm text-brand-600 mt-1">
                Mas há outros animais esperando por você.{' '}
                <Link to="/" className="underline font-medium">Ver todos</Link>
              </p>
            </div>
          ) : canHelp ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-600">Quer ajudar {animal.name}?</p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-brand-600 hover:bg-brand-700 gap-2 flex-1 sm:flex-none"
                  onClick={() => setActiveForm('adocao')}>
                  <Heart size={15} />Quero adotar
                </Button>
                <Button variant="outline" className="gap-2 flex-1 sm:flex-none text-blue-700 border-blue-200 hover:bg-blue-50"
                  onClick={() => setActiveForm('lar_temporario')}>
                  Oferecer lar temporário
                </Button>
                <Button asChild variant="ghost" className="text-stone-500 flex-1 sm:flex-none">
                  <Link to="/contribuir">Fazer doação</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white px-6 py-4 text-center text-stone-400 text-xs">
        © {new Date().getFullYear()} Protetoras Três Lagoas
        {' · '}
        <Link to="/transparencia" className="hover:text-stone-600 underline">Transparência</Link>
      </footer>

      <AdocaoForm open={activeForm === 'adocao'} onClose={() => setActiveForm(null)} animal={animal} />
      <LarTemporarioForm open={activeForm === 'lar_temporario'} onClose={() => setActiveForm(null)} animal={animal} />
    </div>
  )
}
