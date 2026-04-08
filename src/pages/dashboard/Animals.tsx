import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Search, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, EyeOff, Eye } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Animal, AnimalStatusEnum, PorteEnum } from '@/types/database'
import { STATUS_ORDER } from '@/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<AnimalStatusEnum, string> = {
  pendente_resgate:  'bg-red-50 text-red-600 border-red-200',
  resgatado:         'bg-orange-50 text-orange-700 border-orange-200',
  lar_temporario:    'bg-blue-50 text-blue-700 border-blue-200',
  disponivel:        'bg-yellow-50 text-yellow-700 border-yellow-200',
  adotado:           'bg-brand-50 text-brand-700 border-brand-200',
  obito:             'bg-stone-50 text-stone-500 border-stone-200',
  dono_identificado: 'bg-violet-50 text-violet-700 border-violet-200',
}
export const STATUS_LABELS: Record<AnimalStatusEnum, string> = {
  pendente_resgate: 'Pendente resgate', resgatado: 'Resgatado',
  lar_temporario: 'Lar temporário', disponivel: 'Disponível',
  adotado: 'Adotado', obito: 'Óbito', dono_identificado: 'Dono identificado',
}

const PORTE_LABELS: Record<PorteEnum, string> = {
  mini: 'Mini', pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande', gigante: 'Gigante',
}

// Statuses considered "inactive" — hidden by default
const INACTIVE_STATUSES: AnimalStatusEnum[] = ['adotado', 'obito', 'dono_identificado']

// Sanitary procedure health badges
const HEALTH_BADGES = [
  { key: 'castracao',          label: 'Castrado',        color: 'bg-brand-100 text-brand-700' },
  { key: 'vacina_antirabica',  label: 'Antirrábica',     color: 'bg-blue-100 text-blue-700' },
  { key: 'vacina_v8',          label: 'V8',              color: 'bg-sky-100 text-sky-700' },
  { key: 'vacina_v10',         label: 'V10',             color: 'bg-sky-100 text-sky-700' },
  { key: 'vermifugacao',       label: 'Vermifugado',     color: 'bg-teal-100 text-teal-700' },
  { key: 'bravecto',           label: 'Antiparasitário', color: 'bg-purple-100 text-purple-700' },
  { key: 'coleira_leishmaniose', label: 'Coleira Leish', color: 'bg-amber-100 text-amber-700' },
] as const

type SortField = 'status' | 'name' | 'species' | 'created_at' | 'acompanhante'
type SortDir   = 'asc' | 'desc'

// ─── Sort header button ───────────────────────────────────────────────────────

function SortTh({ label, field, current, dir, onSort }: {
  label: string; field: SortField; current: SortField; dir: SortDir; onSort: (f: SortField) => void
}) {
  const active = current === field
  return (
    <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">
      <button className="flex items-center gap-1 hover:text-stone-700 transition-colors" onClick={() => onSort(field)}>
        {label}
        {active
          ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          : <ChevronsUpDown size={12} className="opacity-30" />}
      </button>
    </th>
  )
}

// ─── Health badge cell ────────────────────────────────────────────────────────

function HealthCell({ procedures }: { procedures: Set<string> }) {
  const present = HEALTH_BADGES.filter(b => procedures.has(b.key))
  if (present.length === 0) return <span className="text-stone-300 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {present.map(b => (
        <span key={b.key} title={b.label}
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${b.color}`}>
          {b.label}
        </span>
      ))}
    </div>
  )
}

// ─── Register form schema ─────────────────────────────────────────────────────

const animalSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  species: z.enum(['canino', 'felino', 'outro']),
  sex: z.enum(['macho', 'femea', 'indefinido']),
  breed: z.string().optional(),
  coat_description: z.string().optional(),
  color: z.string().optional(),
  porte: z.enum(['mini', 'pequeno', 'medio', 'grande', 'gigante']).optional(),
  birth_estimate: z.string().optional(),
  notes: z.string().optional(),
  public_description: z.string().optional(),
  palavra_chave: z.string().optional(),
  acompanhante: z.string().optional(),
  google_drive_url: z.url({ error: 'URL inválida' }).or(z.literal('')).optional(),
  status: z.enum(['pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado', 'obito', 'dono_identificado']),
  rescue_date: z.string().optional(),
  rescue_location: z.string().optional(),
  rescue_notes: z.string().optional(),
  rescued_by: z.string().optional(),
  foster_name: z.string().optional(),
  foster_phone: z.string().optional(),
  foster_since: z.string().optional(),
  is_special_needs: z.boolean(),
  special_needs_description: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.status !== 'pendente_resgate' && !d.rescue_date)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data do resgate obrigatória', path: ['rescue_date'] })
  if (d.status === 'lar_temporario') {
    if (!d.foster_name)  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório', path: ['foster_name'] })
    if (!d.foster_phone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório', path: ['foster_phone'] })
    if (!d.foster_since) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obrigatório', path: ['foster_since'] })
  }
})
type AnimalFormValues = z.infer<typeof animalSchema>

function RegisterAnimalDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (a: Animal) => void
}) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<AnimalFormValues>({
    resolver: zodResolver(animalSchema),
    defaultValues: { species: 'canino', sex: 'indefinido', status: 'resgatado', is_special_needs: false },
  })
  const status    = watch('status')
  const isSpecial = watch('is_special_needs')

  async function onSubmit(values: AnimalFormValues) {
    const { data: animal, error } = await supabase.from('animals').insert({
      name: values.name, species: values.species, sex: values.sex,
      breed: values.breed || null,
      coat_description: values.coat_description || null,
      color: values.color || null,
      porte: values.porte || null,
      birth_estimate: values.birth_estimate || null,
      notes: values.notes || null,
      public_description: values.public_description || null,
      status: values.status,
      palavra_chave: values.palavra_chave || null,
      acompanhante: values.acompanhante || null,
      google_drive_url: values.google_drive_url || null,
      is_special_needs: values.is_special_needs,
      special_needs_description: values.is_special_needs ? (values.special_needs_description || null) : null,
    }).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }

    if (values.status !== 'pendente_resgate' && values.rescue_date) {
      await supabase.from('animal_rescues').insert({
        animal_id: animal.id, rescue_date: values.rescue_date,
        rescue_location: values.rescue_location || null,
        rescue_notes: values.rescue_notes || null,
        rescued_by: values.rescued_by || null,
      })
    }
    if (values.status === 'lar_temporario' && values.foster_name && values.foster_phone && values.foster_since) {
      const { data: cust } = await supabase.from('custodians').insert({
        full_name: values.foster_name, phone: values.foster_phone,
      }).select().single()
      if (cust) await supabase.from('animal_custody').insert({
        animal_id: animal.id, custodian_id: cust.id,
        custody_type: 'lar_temporario', started_at: values.foster_since,
      })
    }
    toast.success(`${animal.name} cadastrado!`)
    onCreated(animal as Animal); reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (reset(), onClose())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar novo animal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Nome *</Label><Input {...register('name')} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Palavra-chave / apelido</Label>
              <Input placeholder="Ex: caramelo da feira" {...register('palavra_chave')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Espécie *</Label>
              <Select defaultValue="canino" onValueChange={(v) => setValue('species', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="canino">Canino</SelectItem>
                  <SelectItem value="felino">Felino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Sexo</Label>
              <Select defaultValue="indefinido" onValueChange={(v) => setValue('sex', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Macho</SelectItem>
                  <SelectItem value="femea">Fêmea</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Porte</Label>
              <Select onValueChange={(v) => setValue('porte', v as PorteEnum)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mini">Mini</SelectItem>
                  <SelectItem value="pequeno">Pequeno</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="grande">Grande</SelectItem>
                  <SelectItem value="gigante">Gigante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Raça</Label><Input placeholder="SRD" {...register('breed')} /></div>
            <div className="space-y-1.5"><Label>Cor</Label><Input placeholder="Ex: caramelo" {...register('color')} /></div>
            <div className="space-y-1.5"><Label>Pelagem</Label><Input {...register('coat_description')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Nascimento estimado</Label><Input type="date" {...register('birth_estimate')} /></div>
            <div className="space-y-1.5"><Label>Acompanhante</Label><Input placeholder="Quem acompanha este caso" {...register('acompanhante')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Link Google Drive (fotos/vídeos)</Label>
            <Input type="url" placeholder="https://drive.google.com/..." {...register('google_drive_url')} />
            {errors.google_drive_url && <p className="text-red-500 text-xs">{errors.google_drive_url.message}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1.5"><Label>Status</Label>
            <Select defaultValue="resgatado" onValueChange={(v) => setValue('status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente_resgate">Pendente resgate</SelectItem>
                <SelectItem value="resgatado">Resgatado</SelectItem>
                <SelectItem value="lar_temporario">Lar temporário</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="adotado">Adotado</SelectItem>
                <SelectItem value="dono_identificado">Dono identificado</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status !== 'pendente_resgate' && (
            <div className="border border-stone-200 rounded-lg p-4 space-y-4 bg-stone-50/60">
              <p className="text-sm font-medium text-stone-700">Informações do resgate</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Data *</Label><Input type="date" {...register('rescue_date')} />
                  {errors.rescue_date && <p className="text-red-500 text-xs">{errors.rescue_date.message}</p>}
                </div>
                <div className="space-y-1.5"><Label>Resgatado por</Label><Input {...register('rescued_by')} /></div>
              </div>
              <div className="space-y-1.5"><Label>Local</Label><Input {...register('rescue_location')} /></div>
              <div className="space-y-1.5"><Label>Obs.</Label><Textarea rows={2} {...register('rescue_notes')} /></div>
            </div>
          )}
          {status === 'lar_temporario' && (
            <div className="border border-blue-200 rounded-lg p-4 space-y-4 bg-blue-50/40">
              <p className="text-sm font-medium text-stone-700">Lar temporário</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Nome do responsável *</Label><Input {...register('foster_name')} />
                  {errors.foster_name && <p className="text-red-500 text-xs">{errors.foster_name.message}</p>}
                </div>
                <div className="space-y-1.5"><Label>Telefone *</Label><Input {...register('foster_phone')} />
                  {errors.foster_phone && <p className="text-red-500 text-xs">{errors.foster_phone.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5"><Label>Data de entrada *</Label><Input type="date" {...register('foster_since')} />
                {errors.foster_since && <p className="text-red-500 text-xs">{errors.foster_since.message}</p>}
              </div>
            </div>
          )}
          <div className="space-y-1.5"><Label>Observações internas</Label><Textarea rows={2} {...register('notes')} /></div>
          <div className="space-y-1.5 border border-brand-100 rounded-lg p-3 bg-brand-50/40">
            <Label className="text-brand-800">Descrição pública</Label>
            <p className="text-xs text-stone-400 mb-1">Texto cativante para a página pública. As fotos públicas podem ser adicionadas após o cadastro.</p>
            <Textarea rows={2} placeholder="Ex: O Bolinha é um cachorrinho alegre que adora brincar..." {...register('public_description')} />
          </div>

          {/* Special needs */}
          <div className="border border-purple-100 rounded-lg p-4 space-y-3 bg-purple-50/40">
            <div className="flex items-center gap-3">
              <Checkbox id="reg_is_special_needs" checked={isSpecial}
                onCheckedChange={(v) => setValue('is_special_needs', !!v)} />
              <Label htmlFor="reg_is_special_needs" className="cursor-pointer font-medium text-purple-800">
                Animal com necessidades especiais
              </Label>
            </div>
            {isSpecial && (
              <div className="space-y-1.5">
                <Label className="text-xs text-purple-700">Descreva as necessidades</Label>
                <Input placeholder="Ex: cego do olho direito, usa cadeirinha, medicação contínua..."
                  className="text-sm" {...register('special_needs_description')} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Animals() {
  const [animals, setAnimals]         = useState<Animal[]>([])
  const [photoMap, setPhotoMap]       = useState<Record<string, string>>({})
  const [sanitaryMap, setSanitaryMap] = useState<Record<string, Set<string>>>({})
  const [custodyMap, setCustodyMap]   = useState<Record<string, { name: string; type: string }>>({})
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [hideInactive, setHideInactive] = useState(true)
  const [dialogOpen, setDialog]       = useState(false)
  const [sortField, setSortField]     = useState<SortField>('status')
  const [sortDir,   setSortDir]       = useState<SortDir>('asc')
  const navigate = useNavigate()

  useEffect(() => { fetchAnimals() }, [])

  async function fetchAnimals() {
    setLoading(true)
    const [
      { data, error },
      { data: photoData },
      { data: sanitaryData },
      { data: custodyData },
    ] = await Promise.all([
      supabase.from('animals').select('*').is('deleted_at', null),
      supabase.from('animal_photos').select('animal_id, storage_path').eq('is_cover', true),
      supabase.from('sanitary_procedures').select('animal_id, procedure_type'),
      supabase.from('animal_custody').select('animal_id, custody_type, custodian:custodians(full_name)').eq('is_active', true),
    ])
    if (error) { toast.error('Erro ao carregar animais'); setLoading(false); return }

    setAnimals(data as Animal[])

    const pMap: Record<string, string> = {}
    ;(photoData ?? []).forEach((p: any) => { pMap[p.animal_id] = p.storage_path })
    setPhotoMap(pMap)

    const sMap: Record<string, Set<string>> = {}
    ;(sanitaryData ?? []).forEach((s: any) => {
      if (!sMap[s.animal_id]) sMap[s.animal_id] = new Set()
      sMap[s.animal_id].add(s.procedure_type)
    })
    setSanitaryMap(sMap)

    const cMap: Record<string, { name: string; type: string }> = {}
    ;(custodyData ?? []).forEach((c: any) => {
      cMap[c.animal_id] = { name: c.custodian?.full_name ?? '—', type: c.custody_type }
    })
    setCustodyMap(cMap)

    setLoading(false)
  }

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const { sorted, hiddenCount } = useMemo(() => {
    const q = search.toLowerCase()
    const all = animals.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.palavra_chave ?? '').toLowerCase().includes(q) ||
      (a.breed ?? '').toLowerCase().includes(q) ||
      (a.acompanhante ?? '').toLowerCase().includes(q)
    )
    const hidden = hideInactive ? all.filter(a => INACTIVE_STATUSES.includes(a.status)) : []
    const visible = hideInactive ? all.filter(a => !INACTIVE_STATUSES.includes(a.status)) : all
    const sorted = [...visible].sort((a, b) => {
      let cmp = 0
      if (sortField === 'status')      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      else if (sortField === 'name')   cmp = a.name.localeCompare(b.name, 'pt-BR')
      else if (sortField === 'species') cmp = a.species.localeCompare(b.species)
      else if (sortField === 'created_at')   cmp = a.created_at.localeCompare(b.created_at)
      else if (sortField === 'acompanhante') cmp = (a.acompanhante ?? '').localeCompare(b.acompanhante ?? '', 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return { sorted, hiddenCount: hidden.length }
  }, [animals, search, sortField, sortDir, hideInactive])

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Animais</h1>
          <p className="text-stone-400 text-sm mt-1">Todos os animais resgatados</p>
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 gap-2" onClick={() => setDialog(true)}>
          <Plus size={16} /><span className="hidden sm:inline">Novo animal</span><span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Buscar por nome, palavra-chave, acompanhante..." className="pl-9 bg-white"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setHideInactive(v => !v)}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg px-3 py-2 bg-white transition-colors"
        >
          {hideInactive ? <Eye size={13} /> : <EyeOff size={13} />}
          {hideInactive
            ? `Mostrar inativos${hiddenCount > 0 ? ` (+${hiddenCount})` : ''}`
            : 'Ocultar inativos'}
        </button>
        <p className="text-xs text-stone-400 shrink-0">{sorted.length} animal{sorted.length !== 1 ? 'is' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
            <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-sm">
            {search ? 'Nenhum animal encontrado.' : 'Nenhum animal cadastrado ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  <th className="w-12 px-4 py-3" />
                  <SortTh label="Nome"       field="name"       current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Espécie"    field="species"    current={sortField} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Status"     field="status"     current={sortField} dir={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Saúde</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Custódia atual</th>
                  <th className="hidden xl:table-cell"><SortTh label="Acompanhante" field="acompanhante" current={sortField} dir={sortDir} onSort={handleSort} /></th>
                  <SortTh label="Cadastrado" field="created_at" current={sortField} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(animal => {
                  const thumb = photoMap[animal.id]
                    ? cloudinaryUrl(photoMap[animal.id], 'w_80,h_80,c_fill,q_auto,f_auto')
                    : null
                  const procedures = sanitaryMap[animal.id] ?? new Set<string>()
                  const custody = custodyMap[animal.id]
                  return (
                    <tr key={animal.id}
                      className="border-b border-stone-50 hover:bg-stone-50 transition-colors cursor-pointer align-top"
                      onClick={() => navigate(`/dashboard/animais/${animal.id}`)}>
                      <td className="px-4 py-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                          {thumb
                            ? <img src={thumb} alt={animal.name} className="w-full h-full object-cover" />
                            : <span className="text-stone-300 text-base">🐾</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-stone-800 flex items-center gap-1.5 flex-wrap">
                          {animal.name}
                          {animal.is_special_needs && (
                            <span title={animal.special_needs_description ?? 'Animal especial'}
                              className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-normal shrink-0">
                              especial
                            </span>
                          )}
                        </p>
                        {animal.palavra_chave && (
                          <p className="text-xs text-stone-400 mt-0.5">{animal.palavra_chave}</p>
                        )}
                        {animal.porte && (
                          <p className="text-xs text-stone-400">{PORTE_LABELS[animal.porte]} · {animal.color ?? animal.breed ?? 'SRD'}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-stone-500 capitalize">{animal.species}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={STATUS_COLORS[animal.status]}>
                          {STATUS_LABELS[animal.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <HealthCell procedures={procedures} />
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2.5 text-stone-500 text-xs">
                        {custody
                          ? <span>{custody.name}<span className="ml-1 text-stone-300">({custody.type === 'lar_temporario' ? 'temp.' : 'adot.'})</span></span>
                          : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-2.5 text-stone-500 text-xs">
                        {animal.acompanhante ?? <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap text-xs">
                        {new Date(animal.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegisterAnimalDialog open={dialogOpen} onClose={() => setDialog(false)}
        onCreated={a => setAnimals(prev => [a, ...prev])} />
    </div>
  )
}
