import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Loader2, ChevronDown, ChevronUp, ChevronsUpDown, Eye } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { Interest, InterestStatusEnum } from '@/types/database'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string>  = {
  adocao: '🏠 Adoção', lar_temporario: '🛏️ Lar temporário',
  contribuicao: '💰 Contribuição', voluntario: '🤝 Voluntário',
}
const TYPE_COLORS: Record<string, string>  = {
  adocao: 'bg-brand-50 text-brand-700 border-brand-200',
  lar_temporario: 'bg-blue-50 text-blue-700 border-blue-200',
  contribuicao: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  voluntario: 'bg-purple-50 text-purple-700 border-purple-200',
}

// Human-readable labels for form_data keys
const FIELD_LABELS: Record<string, string> = {
  idade: 'Idade', documento: 'RG/CPF', rede_social: 'Rede social',
  endereco: 'Endereço', cidade_uf: 'Cidade/UF', profissao: 'Profissão',
  local_horario_trabalho: 'Local/horário de trabalho', transporte: 'Transporte',
  imovel_proprio: 'Imóvel próprio/alugado', proprietario_permite: 'Proprietário permite animais',
  tipo_moradia: 'Tipo de moradia', condominio_animais: 'Condições do condomínio',
  janelas_teladas: 'Janelas/sacadas teladas', tem_quintal: 'Possui quintal',
  local_murado: 'Local murado/telado', acesso_animal: 'Acesso do animal',
  perspectiva_mudanca: 'Perspectiva de mudança', o_que_faria_animal: 'O que faria com o animal',
  autoriza_visitas: 'Autoriza visitas', outro_morador: 'Outro morador (nome/tel)',
  todos_concordam: 'Todos concordam', num_pessoas: 'Número de pessoas na casa',
  adultos_criancas: 'Adultos e crianças', outros_animais: 'Outros animais',
  temperamento_porte: 'Temperamento/porte', antiparasitario_existente: 'Antiparasitário',
  vacinacao_dia: 'Vacinação em dia', castrado_existente: 'Animal castrado',
  acesso_rua: 'Acesso à rua', especie_desejada: 'Espécie desejada',
  cuidados_basicos: 'Cuidados básicos', coleira_leishmaniose: 'Ciente coleira leishmaniose',
  antiparasitarios_ciente: 'Ciente antiparasitários', expectativa_animal: 'Expectativa sobre o animal',
  condicoes_financeiras: 'Condições financeiras', animal_escolhido: 'Animal já escolhido',
  horas_sozinho: 'Horas sozinho/dia', responsavel_viagem: 'Responsável em viagens',
  tratamento_leishmaniose: 'Faria tratamento leishmaniose', seria_presente: 'Seria presente',
  gravidez_animais: 'Gravidez e animais', alergias: 'Alergias', devolveu_antes: 'Devolveu antes',
  perdeu_animal: 'Perdeu animal', ciente_15_anos: 'Ciente 15 anos de vida',
  concorda_nao_repassar: 'Concorda em não repassar', responsabilidade_respostas: 'Confirma respostas',
  // Lar temp
  por_que_lar_temp: 'Por que quer ser lar temporário', tem_animais: 'Tem outros animais',
  quais_animais: 'Quais animais', animais_castrados: 'Animais castrados',
  animais_vacinados: 'Animais vacinados', usa_antiparasitario: 'Usa antiparasitário',
  aceitam_outros: 'Aceitam outros animais', exp_lar_provisorio: 'Experiência lar provisório',
  ja_resgatou: 'Já resgatou', cuidou_doente: 'Cuidou de doente/filhote',
  como_foi_cuidado: 'Como foi o cuidado', tempo_disponivel: 'Tempo disponível',
  segue_orientacoes: 'Segue orientações', leva_clinica: 'Leva à clínica',
  tipo_animal: 'Tipo de animal aceito', condicao_animal: 'Condição do animal aceito',
  preferencia_especie: 'Preferência de espécie', animal_ficaria: 'Animal ficaria',
  ciente_responsabilidade: 'Ciente da responsabilidade', ciente_comunicar: 'Ciente de comunicar',
  criancas: 'Crianças na casa',
  // Voluntário
  documento: 'RG/CPF', endereco_cep: 'Endereço e CEP',
  por_que_voluntario: 'Por que quer ser voluntário', trabalho_voluntario_anterior: 'Trabalho voluntário anterior',
  disponibilidade: 'Disponibilidade semanal', areas_atuacao: 'Áreas de atuação',
  locomocao: 'Meio de locomoção', confortavel_transporte: 'Confortável transportar animais',
  preparado_emocionalmente: 'Preparado emocionalmente', como_lida_dificuldades: 'Como lida com dificuldades',
  assume_responsabilidade: 'Assume responsabilidade', habilidades_adicionais: 'Habilidades adicionais',
  animal_nome: 'Animal de interesse',
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function InterestDetailModal({ interest, onClose }: { interest: (Interest & { animal?: any }) | null; onClose: () => void }) {
  if (!interest) return null
  const form_data = interest.form_data ?? {}

  const entries = Object.entries(form_data).filter(([, v]) => v !== null && v !== '' && v !== undefined)

  return (
    <Dialog open={!!interest} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{TYPE_LABELS[interest.interest_type] ?? interest.interest_type}</span>
            <span className="text-stone-400 font-normal text-sm">— {interest.full_name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Base info */}
        <div className="grid grid-cols-2 gap-2 bg-stone-50 rounded-lg p-3 text-sm mb-4">
          <div><span className="text-stone-400">Telefone</span><p className="font-medium">{interest.phone}</p></div>
          {interest.email && <div><span className="text-stone-400">Email</span><p className="font-medium">{interest.email}</p></div>}
          {interest.animal && <div className="col-span-2"><span className="text-stone-400">Animal</span><p className="font-medium">{interest.animal.name}</p></div>}
          {interest.message && <div className="col-span-2"><span className="text-stone-400">Mensagem</span><p className="italic">{interest.message}</p></div>}
        </div>

        {/* form_data fields */}
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="border-b border-stone-50 pb-2">
                <p className="text-xs text-stone-400">{FIELD_LABELS[key] ?? key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-stone-700">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 italic">Nenhum dado adicional do formulário.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

type SortKey = 'created_at' | 'status' | 'interest_type'
type SortDir = 'asc' | 'desc'
const STATUS_ORDER: Record<InterestStatusEnum, number> = { pendente: 0, contactado: 1, aprovado: 2, recusado: 3 }

function SortTh({ label, field, current, dir, onSort }: {
  label: string; field: SortKey; current: SortKey; dir: SortDir; onSort: (f: SortKey) => void
}) {
  const active = current === field
  return (
    <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">
      <button className="flex items-center gap-1 hover:text-stone-700 transition-colors" onClick={() => onSort(field)}>
        {label}
        {active ? (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="opacity-30" />}
      </button>
    </th>
  )
}

// ─── Inline admin row ─────────────────────────────────────────────────────────

function InterestRow({ interest, onUpdated, onShowDetail }: {
  interest: Interest & { animal?: any }
  onUpdated: (i: Interest) => void
  onShowDetail: (i: Interest & { animal?: any }) => void
}) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(interest.admin_notes ?? '')
  const [saving, setSaving] = useState(false)

  async function updateStatus(status: InterestStatusEnum) {
    const { data, error } = await supabase.from('interests')
      .update({ status }).eq('id', interest.id).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    onUpdated(data as Interest)
  }

  async function saveNotes() {
    setSaving(true)
    const { data, error } = await supabase.from('interests')
      .update({ admin_notes: notes || null }).eq('id', interest.id).select().single()
    setSaving(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    onUpdated(data as Interest)
    setEditingNotes(false)
    toast.success('Notas salvas.')
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  return (
    <tr className="border-b border-stone-50 hover:bg-stone-50/50 align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-stone-800 text-sm">{interest.full_name}</p>
        <p className="text-xs text-stone-400">{interest.phone}</p>
        {interest.email && <p className="text-xs text-stone-400">{interest.email}</p>}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[interest.interest_type]}`}>
          {TYPE_LABELS[interest.interest_type]}
        </Badge>
      </td>
      <td className="hidden md:table-cell px-4 py-3 max-w-xs">
        {interest.animal ? (
          <a href={`/dashboard/animais/${interest.animal.id}`}
            className="text-xs font-medium text-brand-700 hover:underline">
            {interest.animal.name} ({interest.animal.species})
          </a>
        ) : (
          <span className="text-xs text-stone-400 italic">Geral (sem pet específico)</span>
        )}
        {interest.message && (
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 italic">"{interest.message}"</p>
        )}
      </td>
      <td className="px-4 py-3">
        <Select value={interest.status} onValueChange={(v) => updateStatus(v as InterestStatusEnum)}>
          <SelectTrigger className="h-7 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="contactado">Contactado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="hidden lg:table-cell px-4 py-3 max-w-xs">
        {editingNotes ? (
          <div className="space-y-1.5">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs bg-brand-600 hover:bg-brand-700" onClick={saveNotes} disabled={saving}>
                {saving && <Loader2 size={10} className="animate-spin mr-1" />}Salvar
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingNotes(false); setNotes(interest.admin_notes ?? '') }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button className="text-xs text-stone-400 hover:text-stone-700 text-left w-full"
            onClick={() => setEditingNotes(true)}>
            {interest.admin_notes ?? <span className="italic opacity-50">Adicionar nota...</span>}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-stone-400 whitespace-nowrap">{fmt(interest.created_at)}</td>
      <td className="px-4 py-3">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-stone-400 hover:text-brand-600"
          onClick={() => onShowDetail(interest)} title="Ver detalhes">
          <Eye size={14} />
        </Button>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Volunteers() {
  const [interests, setInterests] = useState<(Interest & { animal?: any })[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | InterestStatusEnum>('all')
  const [filterType,   setFilterType]   = useState<'all' | string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [detailInterest, setDetailInterest] = useState<(Interest & { animal?: any }) | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('interests')
      .select('*, animal:animals(id, name, species)')
      .order('created_at', { ascending: false })
    if (error) { toast.error('Erro ao carregar interesses'); setLoading(false); return }
    setInterests((data ?? []) as any[])
    setLoading(false)
  }

  function handleSort(field: SortKey) {
    if (field === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(field); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    return interests
      .filter(i => filterStatus === 'all' || i.status === filterStatus)
      .filter(i => filterType   === 'all' || i.interest_type === filterType)
      .filter(i =>
        i.full_name.toLowerCase().includes(q) ||
        i.phone.includes(q) ||
        (i.email ?? '').toLowerCase().includes(q) ||
        (i.animal?.name ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0
        if (sortKey === 'created_at')   cmp = a.created_at.localeCompare(b.created_at)
        if (sortKey === 'status')        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        if (sortKey === 'interest_type') cmp = a.interest_type.localeCompare(b.interest_type)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [interests, search, filterStatus, filterType, sortKey, sortDir])

  const pendingCount = interests.filter(i => i.status === 'pendente').length

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Voluntários & Interesses</h1>
          <p className="text-stone-400 text-sm mt-1">Formulários de interesse recebidos do site</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-sm px-3 py-1">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, tel, email..." className="pl-9 bg-white text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="contactado">Contactado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="adocao">Adoção</SelectItem>
            <SelectItem value="lar_temporario">Lar temporário</SelectItem>
            <SelectItem value="contribuicao">Contribuição</SelectItem>
            <SelectItem value="voluntario">Voluntário</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-stone-400 ml-auto">{sorted.length} resultado{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400 gap-2">
            <Loader2 size={18} className="animate-spin" /><span className="text-sm">Carregando...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-sm">
            {search || filterStatus !== 'all' || filterType !== 'all' ? 'Nenhum resultado.' : 'Nenhum interesse recebido ainda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Contato</th>
                  <SortTh label="Tipo"      field="interest_type" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="hidden md:table-cell text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Animal / Mensagem</th>
                  <SortTh label="Status"    field="status"        current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">Notas internas</th>
                  <SortTh label="Recebido"  field="created_at"    current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(i => (
                  <InterestRow key={i.id} interest={i}
                    onUpdated={updated => setInterests(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))}
                    onShowDetail={setDetailInterest} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InterestDetailModal interest={detailInterest} onClose={() => setDetailInterest(null)} />
    </div>
  )
}