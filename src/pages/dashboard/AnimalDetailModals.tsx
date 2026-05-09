import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, AlertTriangle, MapPin } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type {
  Animal, AnimalRescue, SanitaryProcedure, MedicalRecord,
  AnimalCustody, Custodian, Clinic, PorteEnum,
} from '@/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Shared label maps ────────────────────────────────────────────────────────

export const SANITARY_LABELS: Record<string, string> = {
  castracao:             'Castração',
  vacina_v8:             'Vacina V8',
  vacina_v10:            'Vacina V10',
  vacina_antirabica:     'Vacina Antirrábica',
  vermifugacao:          'Vermifugação',
  bravecto:              'Bravecto',
  coleira_leishmaniose:  'Coleira Leishmaniose',
  transfusao_sanguinea:  'Transfusão Sanguínea',
  microchipagem:         'Microchipagem',
  outro:                 'Outro',
}

export const VISIT_LABELS: Record<string, string> = {
  rotina: 'Rotina', emergencia: 'Emergência',
  retorno: 'Retorno', cirurgia: 'Cirurgia', outro: 'Outro',
}

export const EXAM_RESULT_LABELS: Record<string, string> = {
  aguardando: 'Aguardando', reagente: 'Reagente',
  nao_reagente: 'Não reagente', inconclusivo: 'Inconclusivo',
}

export const CUSTODY_TYPE_LABELS: Record<string, string> = {
  lar_temporario: 'Lar temporário', adocao: 'Adoção',
}

export const CUSTODY_END_LABELS: Record<string, string> = {
  devolucao_incompatibilidade: 'Devolução – Incompatibilidade',
  devolucao_mudanca:           'Devolução – Mudança',
  devolucao_alergia:           'Devolução – Alergia',
  falecimento_responsavel:     'Falecimento do responsável',
  transferencia:               'Transferência',
  obito_animal:                'Óbito do animal',
  outro:                       'Outro',
}

// ─── EditAnimalModal ──────────────────────────────────────────────────────────

const editAnimalSchema = z.object({
  name:                      z.string().min(1, 'Obrigatório'),
  species:                   z.enum(['canino', 'felino', 'outro']),
  sex:                       z.enum(['macho', 'femea', 'indefinido']),
  breed:                     z.string().optional(),
  coat_description:          z.string().optional(),
  color:                     z.string().optional(),
  porte:                     z.enum(['mini', 'pequeno', 'medio', 'grande', 'gigante']).optional(),
  birth_estimate:            z.string().optional(),
  notes:                     z.string().optional(),
  public_description:        z.string().optional(),
  palavra_chave:             z.string().optional(),
  acompanhante:              z.string().optional(),
  google_drive_url:          z.url({ error: 'URL inválida' }).or(z.literal('')).optional(),
  status:                    z.enum(['pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado', 'obito', 'dono_identificado']),
  is_special_needs:          z.boolean(),
  special_needs_description: z.string().optional(),
  aceita_lar_temporario:     z.boolean(),
  condicoes_lar:             z.string().optional(),
})
type EditAnimalValues = z.infer<typeof editAnimalSchema>

export function EditAnimalModal({
  open, onClose, animal, onUpdated,
}: { open: boolean; onClose: () => void; animal: Animal; onUpdated: (a: Animal) => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<EditAnimalValues>({
    resolver: zodResolver(editAnimalSchema),
    defaultValues: {
      name: animal.name, species: animal.species, sex: animal.sex,
      breed: animal.breed ?? '', coat_description: animal.coat_description ?? '',
      color: animal.color ?? '', porte: animal.porte ?? undefined,
      birth_estimate: animal.birth_estimate ?? '', notes: animal.notes ?? '',
      public_description: animal.public_description ?? '',
      palavra_chave: animal.palavra_chave ?? '', acompanhante: animal.acompanhante ?? '',
      google_drive_url: animal.google_drive_url ?? '',
      status: animal.status,
      is_special_needs: animal.is_special_needs,
      special_needs_description: animal.special_needs_description ?? '',
      aceita_lar_temporario: animal.aceita_lar_temporario,
      condicoes_lar: animal.condicoes_lar ?? '',
    },
  })

  const isSpecial       = watch('is_special_needs')
  const aceitaLarTemp   = watch('aceita_lar_temporario')

  async function onSubmit(values: EditAnimalValues) {
    const { data, error } = await supabase.from('animals')
      .update({
        ...values,
        breed: values.breed || null, coat_description: values.coat_description || null,
        color: values.color || null, porte: values.porte || null,
        birth_estimate: values.birth_estimate || null, notes: values.notes || null,
        public_description: values.public_description || null,
        palavra_chave: values.palavra_chave || null, acompanhante: values.acompanhante || null,
        google_drive_url: values.google_drive_url || null,
        special_needs_description: values.is_special_needs ? (values.special_needs_description || null) : null,
        condicoes_lar: values.aceita_lar_temporario ? (values.condicoes_lar || null) : null,
      })
      .eq('id', animal.id).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Animal atualizado!')
    onUpdated(data as Animal); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar animal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label><Input {...register('name')} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Palavra-chave / apelido</Label><Input {...register('palavra_chave')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Espécie *</Label>
              <Select defaultValue={animal.species} onValueChange={(v) => setValue('species', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="canino">Canino</SelectItem>
                  <SelectItem value="felino">Felino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select defaultValue={animal.sex} onValueChange={(v) => setValue('sex', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Macho</SelectItem>
                  <SelectItem value="femea">Fêmea</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Porte</Label>
              <Select defaultValue={animal.porte ?? ''} onValueChange={(v) => setValue('porte', v as PorteEnum)}>
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
            <div className="space-y-1.5"><Label>Acompanhante</Label><Input {...register('acompanhante')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Link Google Drive (fotos/vídeos)</Label>
            <Input type="url" placeholder="https://drive.google.com/..." {...register('google_drive_url')} />
            {errors.google_drive_url && <p className="text-red-500 text-xs">{errors.google_drive_url.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select defaultValue={animal.status} onValueChange={(v) => setValue('status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente_resgate">Pendente resgate</SelectItem>
                <SelectItem value="resgatado">Resgatado</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="dono_identificado">Dono identificado</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Observações internas</Label><Textarea rows={3} {...register('notes')} /></div>
          <div className="space-y-3 border border-brand-100 rounded-lg p-3 bg-brand-50/40">
            <div className="space-y-1.5">
              <Label className="text-brand-800">Descrição pública</Label>
              <p className="text-xs text-stone-400 mb-1">Texto que aparece na página pública do animal. Use uma descrição cativante.</p>
              <Textarea rows={3} placeholder="Ex: O Bolinha é um cachorrinho alegre e cheio de energia que adora brincar..." {...register('public_description')} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                id="aceita_lar_temporario"
                checked={aceitaLarTemp}
                onCheckedChange={(v) => setValue('aceita_lar_temporario', !!v)}
              />
              <Label htmlFor="aceita_lar_temporario" className="cursor-pointer text-sm text-stone-700">
                Aceitar interessados em lar temporário
              </Label>
            </div>
            {aceitaLarTemp && (
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-500">Condições para o lar (opcional)</Label>
                <Input placeholder="Ex: sem outros animais, sem crianças, quintal fechado..."
                  {...register('condicoes_lar')} />
              </div>
            )}
          </div>

          {/* Special needs */}
          <div className="border border-purple-100 rounded-lg p-4 space-y-3 bg-purple-50/40">
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_special_needs"
                checked={isSpecial}
                onCheckedChange={(v) => setValue('is_special_needs', !!v)}
              />
              <Label htmlFor="is_special_needs" className="cursor-pointer font-medium text-purple-800">
                Animal com necessidades especiais
              </Label>
            </div>
            {isSpecial && (
              <div className="space-y-1.5">
                <Label className="text-xs text-purple-700">Descreva as necessidades</Label>
                <Input
                  placeholder="Ex: cego do olho direito, usa cadeirinha, medicação contínua..."
                  className="text-sm"
                  {...register('special_needs_description')}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditRescueModal ──────────────────────────────────────────────────────────

const rescueSchema = z.object({
  rescue_date:     z.string().optional(),
  rescue_location: z.string().optional(),
  rescued_by:      z.string().optional(),
  rescue_notes:    z.string().optional(),
  rescue_lat:      z.string().optional(),
  rescue_lng:      z.string().optional(),
})
type RescueValues = z.infer<typeof rescueSchema>

export function EditRescueModal({
  open, onClose, animalId, rescue, onSaved,
}: { open: boolean; onClose: () => void; animalId: string; rescue: AnimalRescue | null; onSaved: (r: AnimalRescue) => void }) {
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<RescueValues>({
    resolver: zodResolver(rescueSchema),
    defaultValues: {
      rescue_date:     rescue?.rescue_date ?? '',
      rescue_location: rescue?.rescue_location ?? '',
      rescued_by:      rescue?.rescued_by ?? '',
      rescue_notes:    rescue?.rescue_notes ?? '',
      rescue_lat:      rescue?.rescue_lat != null ? String(rescue.rescue_lat) : '',
      rescue_lng:      rescue?.rescue_lng != null ? String(rescue.rescue_lng) : '',
    },
  })
  const [geocoding, setGeocoding] = useState(false)
  const locationValue = watch('rescue_location')

  async function geocode() {
    if (!locationValue) return
    setGeocoding(true)
    try {
      const q = encodeURIComponent(`${locationValue} Três Lagoas MS Brasil`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
      const json = await res.json()
      if (json[0]) {
        setValue('rescue_lat', json[0].lat)
        setValue('rescue_lng', json[0].lon)
        toast.success('Coordenadas preenchidas!')
      } else {
        toast.error('Endereço não encontrado.')
      }
    } catch {
      toast.error('Erro ao geocodificar.')
    }
    setGeocoding(false)
  }

  async function onSubmit(values: RescueValues) {
    const payload = {
      animal_id:       animalId,
      rescue_date:     values.rescue_date || null,
      rescue_location: values.rescue_location || null,
      rescued_by:      values.rescued_by || null,
      rescue_notes:    values.rescue_notes || null,
      rescue_lat:      values.rescue_lat ? parseFloat(values.rescue_lat) : null,
      rescue_lng:      values.rescue_lng ? parseFloat(values.rescue_lng) : null,
    }
    const { data, error } = rescue
      ? await supabase.from('animal_rescues').update(payload).eq('id', rescue.id).select().single()
      : await supabase.from('animal_rescues').insert(payload).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Resgate salvo!')
    onSaved(data as AnimalRescue); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{rescue ? 'Editar resgate' : 'Registrar resgate'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data do resgate</Label><Input type="date" {...register('rescue_date')} />
            </div>
            <div className="space-y-1.5"><Label>Resgatado por</Label><Input {...register('rescued_by')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Local do resgate</Label>
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Ex: Rua das Flores, Centro" {...register('rescue_location')} />
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5"
                onClick={geocode} disabled={geocoding || !locationValue}>
                {geocoding ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                Geocodificar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Latitude (auto)</Label>
              <Input placeholder="-20.7514" {...register('rescue_lat')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Longitude (auto)</Label>
              <Input placeholder="-51.7008" {...register('rescue_lng')} />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={3} {...register('rescue_notes')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── AddSanitaryModal ─────────────────────────────────────────────────────────

const sanitarySchema = z.object({
  procedure_type:  z.string().min(1, 'Obrigatório'),
  performed_date:  z.string().min(1, 'Obrigatório'),
  next_due_date:   z.string().optional(),
  description:     z.string().optional(),
  microchip_number: z.string().optional(),
})
type SanitaryValues = z.infer<typeof sanitarySchema>

export function AddSanitaryModal({
  open, onClose, animalId, onAdded,
}: { open: boolean; onClose: () => void; animalId: string; onAdded: (p: SanitaryProcedure) => void }) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<SanitaryValues>({
    resolver: zodResolver(sanitarySchema),
  })
  const procedureType = watch('procedure_type')

  async function onSubmit(values: SanitaryValues) {
    const { data, error } = await supabase.from('sanitary_procedures').insert({
      animal_id: animalId, procedure_type: values.procedure_type,
      performed_date: values.performed_date, next_due_date: values.next_due_date || null,
      description: values.description || null,
      microchip_number: values.procedure_type === 'microchipagem' ? (values.microchip_number || null) : null,
    }).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Procedimento registrado!')
    onAdded(data as SanitaryProcedure); reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registrar procedimento sanitário</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select onValueChange={(v) => setValue('procedure_type', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(SANITARY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.procedure_type && <p className="text-red-500 text-xs">{errors.procedure_type.message}</p>}
          </div>
          {procedureType === 'microchipagem' && (
            <div className="space-y-1.5">
              <Label>Número do microchip</Label>
              <Input placeholder="Ex: 985112345678901" {...register('microchip_number')} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Realizado em *</Label><Input type="date" {...register('performed_date')} />
              {errors.performed_date && <p className="text-red-500 text-xs">{errors.performed_date.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Próxima aplicação</Label><Input type="date" {...register('next_due_date')} /></div>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('description')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── AddMedicalRecordModal ────────────────────────────────────────────────────

const examRowSchema = z.object({
  exam_name: z.string().min(1, 'Obrigatório'), result: z.string(),
  result_detail: z.string().optional(), exam_date: z.string().optional(),
})
const medicationRowSchema = z.object({
  name: z.string().min(1, 'Obrigatório'), dosage: z.string().optional(),
  frequency: z.string().optional(), duration_days: z.string().optional(),
  start_date: z.string().optional(), notes: z.string().optional(),
})
const medicalSchema = z.object({
  visit_date: z.string().min(1, 'Obrigatório'), visit_type: z.string().min(1, 'Obrigatório'),
  vet_name: z.string().optional(), clinic_id: z.string().optional(),
  description: z.string().min(1, 'Obrigatório'), follow_up_notes: z.string().optional(),
  follow_up_date: z.string().optional(), exams: z.array(examRowSchema), medications: z.array(medicationRowSchema),
  new_clinic_name: z.string().optional(), new_clinic_phone: z.string().optional(),
  new_clinic_address: z.string().optional(), new_clinic_vet: z.string().optional(),
})
type MedicalValues = z.infer<typeof medicalSchema>

export function AddMedicalRecordModal({
  open, onClose, animalId, clinics, onAdded, onClinicCreated,
}: {
  open: boolean; onClose: () => void; animalId: string
  clinics: Clinic[]; onAdded: (r: MedicalRecord) => void; onClinicCreated: (c: Clinic) => void
}) {
  const [showNewClinic, setShowNewClinic] = useState(false)
  const { register, handleSubmit, setValue, control, reset, formState: { errors, isSubmitting } } = useForm<MedicalValues>({
    resolver: zodResolver(medicalSchema),
    defaultValues: { exams: [], medications: [] },
  })
  const { fields: examFields, append: addExam, remove: removeExam } = useFieldArray({ control, name: 'exams' })
  const { fields: medFields,  append: addMed,  remove: removeMed  } = useFieldArray({ control, name: 'medications' })

  async function onSubmit(values: MedicalValues) {
    let finalClinicId: string | null = (!values.clinic_id || values.clinic_id === 'none' || values.clinic_id === 'new') ? null : values.clinic_id
    if (values.clinic_id === 'new' && values.new_clinic_name) {
      const { data: clinic, error: cErr } = await supabase.from('clinics').insert({
        name: values.new_clinic_name, phone: values.new_clinic_phone || null,
        address: values.new_clinic_address || null, contact_vet: values.new_clinic_vet || null,
      }).select().single()
      if (cErr) { toast.error('Erro ao criar clínica: ' + cErr.message); return }
      finalClinicId = clinic.id; onClinicCreated(clinic as Clinic)
    }
    const { data: record, error: rErr } = await supabase.from('medical_records').insert({
      animal_id: animalId, clinic_id: finalClinicId, visit_date: values.visit_date,
      visit_type: values.visit_type, vet_name: values.vet_name || null,
      description: values.description, follow_up_notes: values.follow_up_notes || null,
      follow_up_date: values.follow_up_date || null,
    }).select('*, clinic:clinics(id,name)').single()
    if (rErr) { toast.error('Erro: ' + rErr.message); return }
    let insertedExams: any[] = [], insertedMeds: any[] = []
    if (values.exams.length > 0) {
      const { data: ed } = await supabase.from('exams').insert(values.exams.map(e => ({
        animal_id: animalId, medical_record_id: record.id, exam_name: e.exam_name,
        result: e.result || 'aguardando', result_detail: e.result_detail || null, exam_date: e.exam_date || null,
      }))).select()
      insertedExams = ed ?? []
    }
    if (values.medications.length > 0) {
      const { data: md } = await supabase.from('medications').insert(values.medications.map(m => ({
        animal_id: animalId, medical_record_id: record.id, name: m.name, dosage: m.dosage || null,
        frequency: m.frequency || null, duration_days: m.duration_days ? parseInt(m.duration_days) : null,
        start_date: m.start_date || null, notes: m.notes || null,
      }))).select()
      insertedMeds = md ?? []
    }
    toast.success('Atendimento registrado!')
    onAdded({ ...record, exams: insertedExams, medications: insertedMeds } as MedicalRecord)
    reset(); setShowNewClinic(false); onClose()
  }

  function handleClose() { reset(); setShowNewClinic(false); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo atendimento médico</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Data *</Label><Input type="date" {...register('visit_date')} />
              {errors.visit_date && <p className="text-red-500 text-xs">{errors.visit_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select onValueChange={(v) => setValue('visit_type', v)}>
                <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                <SelectContent>{Object.entries(VISIT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
              {errors.visit_type && <p className="text-red-500 text-xs">{errors.visit_type.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Veterinário</Label><Input placeholder="Nome" {...register('vet_name')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Clínica</Label>
            <Select onValueChange={(v) => { setValue('clinic_id', v); setShowNewClinic(v === 'new') }}>
              <SelectTrigger><SelectValue placeholder="Selecionar clínica..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem clínica</SelectItem>
                {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value="new"><span className="flex items-center gap-2 text-brand-600"><Plus size={13} />Nova clínica</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showNewClinic && (
            <div className="border border-brand-200 rounded-lg p-4 space-y-3 bg-brand-50/40">
              <p className="text-sm font-medium text-stone-700">Nova clínica</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nome *</Label><Input {...register('new_clinic_name')} /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input {...register('new_clinic_phone')} /></div>
                <div className="space-y-1.5"><Label>Veterinário responsável</Label><Input {...register('new_clinic_vet')} /></div>
                <div className="space-y-1.5"><Label>Endereço</Label><Input {...register('new_clinic_address')} /></div>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Descrição / Motivo *</Label><Textarea rows={2} {...register('description')} />
            {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Retorno em</Label><Input type="date" {...register('follow_up_date')} /></div>
            <div className="space-y-1.5"><Label>Obs. de retorno</Label><Input {...register('follow_up_notes')} /></div>
          </div>
          {/* Exams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exames</Label>
              <Button type="button" variant="outline" size="sm"
                onClick={() => addExam({ exam_name: '', result: 'aguardando', result_detail: '', exam_date: '' })}>
                <Plus size={13} className="mr-1" />Adicionar exame
              </Button>
            </div>
            {examFields.map((field, i) => (
              <div key={field.id} className="border border-stone-100 rounded-lg p-3 bg-stone-50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Nome do exame *</Label>
                    <Input className="h-8 text-sm" {...register(`exams.${i}.exam_name`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Resultado</Label>
                    <Select defaultValue="aguardando" onValueChange={(v) => setValue(`exams.${i}.result`, v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(EXAM_RESULT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Detalhe do resultado</Label>
                    <Input className="h-8 text-sm" placeholder="Ex: valor, observação" {...register(`exams.${i}.result_detail`)} /></div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Data do exame</Label>
                      <Input type="date" className="h-8 text-sm" {...register(`exams.${i}.exam_date`)} /></div>
                    <Button type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                      onClick={() => removeExam(i)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Medications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medicamentos</Label>
              <Button type="button" variant="outline" size="sm"
                onClick={() => addMed({ name: '', dosage: '', frequency: '', duration_days: '', start_date: '', notes: '' })}>
                <Plus size={13} className="mr-1" />Adicionar medicamento
              </Button>
            </div>
            {medFields.map((field, i) => (
              <div key={field.id} className="border border-stone-100 rounded-lg p-3 bg-stone-50 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" {...register(`medications.${i}.name`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Dose</Label><Input className="h-8 text-sm" placeholder="Ex: 10mg" {...register(`medications.${i}.dosage`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Frequência</Label><Input className="h-8 text-sm" placeholder="Ex: 2x/dia" {...register(`medications.${i}.frequency`)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Duração (dias)</Label><Input type="number" className="h-8 text-sm" {...register(`medications.${i}.duration_days`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Início</Label><Input type="date" className="h-8 text-sm" {...register(`medications.${i}.start_date`)} /></div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Obs.</Label><Input className="h-8 text-sm" {...register(`medications.${i}.notes`)} /></div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeMed(i)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── AddCustodyModal ──────────────────────────────────────────────────────────

const custodySchema = z.object({
  custody_type: z.enum(['lar_temporario', 'adocao']),
  custodian_id: z.string().min(1, 'Obrigatório'),
  started_at: z.string().min(1, 'Obrigatório'),
  termo_date: z.string().optional(),
  new_full_name: z.string().optional(), new_phone: z.string().optional(),
  new_email: z.string().optional(), new_cpf: z.string().optional(),
  new_address_street: z.string().optional(), new_address_city: z.string().optional(),
  new_address_neighborhood: z.string().optional(), new_notes: z.string().optional(),
})
type CustodyValues = z.infer<typeof custodySchema>

export function AddCustodyModal({
  open, onClose, animalId, activeCustodyId, custodians, onAdded, onCustodianCreated, onAnimalStatusChanged,
}: {
  open: boolean; onClose: () => void; animalId: string; activeCustodyId: string | null
  custodians: Custodian[]; onAdded: (c: AnimalCustody) => void
  onCustodianCreated: (c: Custodian) => void
  onAnimalStatusChanged?: (status: string) => void
}) {
  const [showNewCustodian, setShowNewCustodian] = useState(false)
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<CustodyValues>({
    resolver: zodResolver(custodySchema),
    defaultValues: { custody_type: 'lar_temporario' },
  })
  const custodyType = watch('custody_type')

  async function onSubmit(values: CustodyValues) {
    let finalCustodianId: string | null = values.custodian_id === 'new' ? null : values.custodian_id
    if (values.custodian_id === 'new') {
      if (!values.new_full_name || !values.new_phone) { toast.error('Nome e telefone são obrigatórios'); return }
      const { data: cust, error: cErr } = await supabase.from('custodians').insert({
        full_name: values.new_full_name, phone: values.new_phone, email: values.new_email || null,
        cpf: values.new_cpf || null, address_street: values.new_address_street || null,
        address_city: values.new_address_city || null, address_neighborhood: values.new_address_neighborhood || null,
        notes: values.new_notes || null,
      }).select().single()
      if (cErr) { toast.error('Erro: ' + cErr.message); return }
      finalCustodianId = cust.id; onCustodianCreated(cust as Custodian)
    }
    // Close active custody
    if (activeCustodyId) {
      await supabase.from('animal_custody').update({ is_active: false, ended_at: values.started_at }).eq('id', activeCustodyId)
    }
    const { data, error } = await supabase.from('animal_custody').insert({
      animal_id: animalId, custodian_id: finalCustodianId, custody_type: values.custody_type,
      started_at: values.started_at, termo_date: values.termo_date || null, is_active: true,
    }).select('*, custodian:custodians(id,full_name,phone,email,cpf,address_street,address_neighborhood,address_city,notes)').single()
    if (error) { toast.error('Erro: ' + error.message); return }
    if (values.custody_type === 'adocao') {
      await supabase.from('animals').update({ status: 'adotado' }).eq('id', animalId)
      onAnimalStatusChanged?.('adotado')
    }
    toast.success('Custódia registrada!')
    onAdded(data as AnimalCustody)
    reset(); setShowNewCustodian(false); onClose()
  }

  function handleClose() { reset(); setShowNewCustodian(false); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar custódia</DialogTitle></DialogHeader>
        {activeCustodyId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            A custódia atual será encerrada automaticamente na data de início informada.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select defaultValue="lar_temporario" onValueChange={(v) => setValue('custody_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lar_temporario">Lar temporário</SelectItem>
                <SelectItem value="adocao">Adoção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{custodyType === 'adocao' ? 'Adotante' : 'Responsável'} *</Label>
            <Select onValueChange={(v) => { setValue('custodian_id', v); setShowNewCustodian(v === 'new') }}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {custodians.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.phone}</SelectItem>)}
                <SelectItem value="new"><span className="flex items-center gap-2 text-brand-600"><Plus size={13} />Cadastrar novo</span></SelectItem>
              </SelectContent>
            </Select>
            {errors.custodian_id && <p className="text-red-500 text-xs">{errors.custodian_id.message}</p>}
          </div>
          {showNewCustodian && (
            <div className="border border-brand-200 rounded-lg p-4 space-y-3 bg-brand-50/40">
              <p className="text-sm font-medium text-stone-700">Novo responsável</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nome completo *</Label><Input {...register('new_full_name')} /></div>
                <div className="space-y-1.5"><Label>Telefone *</Label><Input {...register('new_phone')} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" {...register('new_email')} /></div>
                <div className="space-y-1.5"><Label>CPF</Label><Input {...register('new_cpf')} /></div>
                <div className="space-y-1.5 col-span-2"><Label>Rua</Label><Input {...register('new_address_street')} /></div>
                <div className="space-y-1.5"><Label>Bairro</Label><Input {...register('new_address_neighborhood')} /></div>
                <div className="space-y-1.5"><Label>Cidade</Label><Input {...register('new_address_city')} /></div>
              </div>
              <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('new_notes')} /></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Início *</Label><Input type="date" {...register('started_at')} />
              {errors.started_at && <p className="text-red-500 text-xs">{errors.started_at.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Data do termo</Label><Input type="date" {...register('termo_date')} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditCustodyModal ─────────────────────────────────────────────────────────

const editCustodySchema = z.object({
  custody_type: z.enum(['lar_temporario', 'adocao']),
  started_at:   z.string().min(1, 'Obrigatório'),
  termo_date:   z.string().optional(),
})
type EditCustodyValues = z.infer<typeof editCustodySchema>

export function EditCustodyModal({
  open, onClose, custody, onUpdated,
}: {
  open: boolean; onClose: () => void
  custody: AnimalCustody
  onUpdated: (c: AnimalCustody) => void
}) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<EditCustodyValues>({
    resolver: zodResolver(editCustodySchema),
    defaultValues: {
      custody_type: custody.custody_type,
      started_at:   custody.started_at,
      termo_date:   custody.termo_date ?? '',
    },
  })

  async function onSubmit(values: EditCustodyValues) {
    const { data, error } = await supabase.from('animal_custody')
      .update({ custody_type: values.custody_type, started_at: values.started_at, termo_date: values.termo_date || null })
      .eq('id', custody.id)
      .select('*, custodian:custodians(id,full_name,phone,email,cpf,address_street,address_neighborhood,address_city,notes)')
      .single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Custódia atualizada!')
    onUpdated(data as AnimalCustody); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar custódia</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select defaultValue={custody.custody_type} onValueChange={(v) => setValue('custody_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lar_temporario">Lar temporário</SelectItem>
                <SelectItem value="adocao">Adoção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Início *</Label><Input type="date" {...register('started_at')} />
              {errors.started_at && <p className="text-red-500 text-xs">{errors.started_at.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Data do termo</Label><Input type="date" {...register('termo_date')} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── DeleteCustodyModal ───────────────────────────────────────────────────────

export function DeleteCustodyModal({
  open, onClose, custody, onDeleted,
}: {
  open: boolean; onClose: () => void
  custody: AnimalCustody
  onDeleted: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const { error } = await supabase.from('animal_custody').delete().eq('id', custody.id)
    if (error) { toast.error('Erro: ' + error.message); setLoading(false); return }
    toast.success('Custódia removida.')
    onDeleted(custody.id)
    setLoading(false); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Remover custódia</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Esta ação é permanente. A custódia será deletada do histórico.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin mr-2" />}Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EndCustodyModal ──────────────────────────────────────────────────────────

const endCustodySchema = z.object({
  ended_at:   z.string().min(1, 'Obrigatório'),
  end_reason: z.string().min(1, 'Obrigatório'),
  end_notes:  z.string().optional(),
})
type EndCustodyValues = z.infer<typeof endCustodySchema>

export function EndCustodyModal({
  open, onClose, custody, onEnded,
}: {
  open: boolean; onClose: () => void; custody: AnimalCustody
  onEnded: (id: string, ended_at: string, end_reason: string, end_notes: string | null) => void
}) {
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<EndCustodyValues>({
    resolver: zodResolver(endCustodySchema),
  })

  async function onSubmit(values: EndCustodyValues) {
    const { error } = await supabase.from('animal_custody').update({
      is_active: false, ended_at: values.ended_at,
      end_reason: values.end_reason, end_notes: values.end_notes || null,
    }).eq('id', custody.id)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Custódia encerrada.')
    onEnded(custody.id, values.ended_at, values.end_reason, values.end_notes || null)
    reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Encerrar custódia</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Data de encerramento *</Label><Input type="date" {...register('ended_at')} />
            {errors.ended_at && <p className="text-red-500 text-xs">{errors.ended_at.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Motivo *</Label>
            <Select onValueChange={(v) => setValue('end_reason', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo..." /></SelectTrigger>
              <SelectContent>{Object.entries(CUSTODY_END_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
            {errors.end_reason && <p className="text-red-500 text-xs">{errors.end_reason.message}</p>}
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('end_notes')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Encerrar custódia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
// ─── EditSanitaryModal ────────────────────────────────────────────────────────

export function EditSanitaryModal({
  open, onClose, procedure, onUpdated,
}: { open: boolean; onClose: () => void; procedure: SanitaryProcedure; onUpdated: (p: SanitaryProcedure) => void }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SanitaryValues>({
    resolver: zodResolver(sanitarySchema),
    defaultValues: {
      procedure_type:   procedure.procedure_type,
      performed_date:   procedure.performed_date,
      next_due_date:    procedure.next_due_date ?? '',
      description:      procedure.description ?? '',
      microchip_number: procedure.microchip_number ?? '',
    },
  })
  const procedureType = watch('procedure_type')

  async function onSubmit(values: SanitaryValues) {
    const { data, error } = await supabase.from('sanitary_procedures').update({
      procedure_type:   values.procedure_type,
      performed_date:   values.performed_date,
      next_due_date:    values.next_due_date || null,
      description:      values.description || null,
      microchip_number: values.procedure_type === 'microchipagem' ? (values.microchip_number || null) : null,
    }).eq('id', procedure.id).select().single()
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Procedimento atualizado!')
    onUpdated(data as SanitaryProcedure); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar procedimento sanitário</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select defaultValue={procedure.procedure_type} onValueChange={(v) => setValue('procedure_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SANITARY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.procedure_type && <p className="text-red-500 text-xs">{errors.procedure_type.message}</p>}
          </div>
          {procedureType === 'microchipagem' && (
            <div className="space-y-1.5">
              <Label>Número do microchip</Label>
              <Input placeholder="Ex: 985112345678901" {...register('microchip_number')} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Realizado em *</Label><Input type="date" {...register('performed_date')} />
              {errors.performed_date && <p className="text-red-500 text-xs">{errors.performed_date.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Próxima aplicação</Label><Input type="date" {...register('next_due_date')} /></div>
          </div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} {...register('description')} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── EditMedicalRecordModal ───────────────────────────────────────────────────

export function EditMedicalRecordModal({
  open, onClose, record, clinics, onUpdated, onClinicCreated,
}: {
  open: boolean; onClose: () => void; record: MedicalRecord
  clinics: Clinic[]; onUpdated: (r: MedicalRecord) => void; onClinicCreated: (c: Clinic) => void
}) {
  const [showNewClinic, setShowNewClinic] = useState(false)
  const existingClinicId = (record as any).clinic?.id ?? ''
  const existingExams    = ((record as any).exams        ?? []) as any[]
  const existingMeds     = ((record as any).medications  ?? []) as any[]

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<MedicalValues>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      visit_date:      record.visit_date,
      visit_type:      record.visit_type,
      vet_name:        record.vet_name ?? '',
      clinic_id:       existingClinicId,
      description:     record.description,
      follow_up_notes: record.follow_up_notes ?? '',
      follow_up_date:  record.follow_up_date ?? '',
      exams: existingExams.map((e: any) => ({
        exam_name: e.exam_name, result: e.result,
        result_detail: e.result_detail ?? '', exam_date: e.exam_date ?? '',
      })),
      medications: existingMeds.map((m: any) => ({
        name: m.name, dosage: m.dosage ?? '', frequency: m.frequency ?? '',
        duration_days: m.duration_days?.toString() ?? '', start_date: m.start_date ?? '', notes: m.notes ?? '',
      })),
    },
  })
  const { fields: examFields, append: addExam, remove: removeExam } = useFieldArray({ control, name: 'exams' })
  const { fields: medFields,  append: addMed,  remove: removeMed  } = useFieldArray({ control, name: 'medications' })

  async function onSubmit(values: MedicalValues) {
    let finalClinicId: string | null = (!values.clinic_id || values.clinic_id === 'none' || values.clinic_id === 'new') ? null : values.clinic_id
    if (values.clinic_id === 'new' && values.new_clinic_name) {
      const { data: clinic, error: cErr } = await supabase.from('clinics').insert({
        name: values.new_clinic_name, phone: values.new_clinic_phone || null,
        address: values.new_clinic_address || null, contact_vet: values.new_clinic_vet || null,
      }).select().single()
      if (cErr) { toast.error('Erro ao criar clínica: ' + cErr.message); return }
      finalClinicId = clinic.id; onClinicCreated(clinic as Clinic)
    }
    const { data: updated, error: rErr } = await supabase.from('medical_records').update({
      clinic_id: finalClinicId, visit_date: values.visit_date, visit_type: values.visit_type,
      vet_name: values.vet_name || null, description: values.description,
      follow_up_notes: values.follow_up_notes || null, follow_up_date: values.follow_up_date || null,
    }).eq('id', record.id).select('*, clinic:clinics(id,name)').single()
    if (rErr) { toast.error('Erro: ' + rErr.message); return }

    // Replace exams
    await supabase.from('exams').delete().eq('medical_record_id', record.id)
    let insertedExams: any[] = []
    if (values.exams.length > 0) {
      const { data: ed } = await supabase.from('exams').insert(values.exams.map(e => ({
        animal_id: record.animal_id, medical_record_id: record.id, exam_name: e.exam_name,
        result: e.result || 'aguardando', result_detail: e.result_detail || null, exam_date: e.exam_date || null,
      }))).select()
      insertedExams = ed ?? []
    }

    // Replace medications
    await supabase.from('medications').delete().eq('medical_record_id', record.id)
    let insertedMeds: any[] = []
    if (values.medications.length > 0) {
      const { data: md } = await supabase.from('medications').insert(values.medications.map(m => ({
        animal_id: record.animal_id, medical_record_id: record.id, name: m.name, dosage: m.dosage || null,
        frequency: m.frequency || null, duration_days: m.duration_days ? parseInt(m.duration_days) : null,
        start_date: m.start_date || null, notes: m.notes || null,
      }))).select()
      insertedMeds = md ?? []
    }

    toast.success('Atendimento atualizado!')
    onUpdated({ ...updated, exams: insertedExams, medications: insertedMeds } as MedicalRecord)
    setShowNewClinic(false); onClose()
  }

  function handleClose() { setShowNewClinic(false); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar atendimento médico</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Data *</Label><Input type="date" {...register('visit_date')} />
              {errors.visit_date && <p className="text-red-500 text-xs">{errors.visit_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select defaultValue={record.visit_type} onValueChange={(v) => setValue('visit_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VISIT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
              {errors.visit_type && <p className="text-red-500 text-xs">{errors.visit_type.message}</p>}
            </div>
            <div className="space-y-1.5"><Label>Veterinário</Label><Input placeholder="Nome" {...register('vet_name')} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Clínica</Label>
            <Select defaultValue={existingClinicId || 'none'} onValueChange={(v) => { setValue('clinic_id', v); setShowNewClinic(v === 'new') }}>
              <SelectTrigger><SelectValue placeholder="Selecionar clínica..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem clínica</SelectItem>
                {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value="new"><span className="flex items-center gap-2 text-brand-600"><Plus size={13} />Nova clínica</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showNewClinic && (
            <div className="border border-brand-200 rounded-lg p-4 space-y-3 bg-brand-50/40">
              <p className="text-sm font-medium text-stone-700">Nova clínica</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nome *</Label><Input {...register('new_clinic_name')} /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input {...register('new_clinic_phone')} /></div>
                <div className="space-y-1.5"><Label>Veterinário responsável</Label><Input {...register('new_clinic_vet')} /></div>
                <div className="space-y-1.5"><Label>Endereço</Label><Input {...register('new_clinic_address')} /></div>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Descrição / Motivo *</Label><Textarea rows={2} {...register('description')} />
            {errors.description && <p className="text-red-500 text-xs">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Retorno em</Label><Input type="date" {...register('follow_up_date')} /></div>
            <div className="space-y-1.5"><Label>Obs. de retorno</Label><Input {...register('follow_up_notes')} /></div>
          </div>
          {/* Exams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exames</Label>
              <Button type="button" variant="outline" size="sm"
                onClick={() => addExam({ exam_name: '', result: 'aguardando', result_detail: '', exam_date: '' })}>
                <Plus size={13} className="mr-1" />Adicionar exame
              </Button>
            </div>
            {examFields.map((field, i) => (
              <div key={field.id} className="border border-stone-100 rounded-lg p-3 bg-stone-50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Nome do exame *</Label>
                    <Input className="h-8 text-sm" {...register(`exams.${i}.exam_name`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Resultado</Label>
                    <Select defaultValue={field.result || 'aguardando'} onValueChange={(v) => setValue(`exams.${i}.result`, v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(EXAM_RESULT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Detalhe do resultado</Label>
                    <Input className="h-8 text-sm" placeholder="Ex: valor, observação" {...register(`exams.${i}.result_detail`)} /></div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Data do exame</Label>
                      <Input type="date" className="h-8 text-sm" {...register(`exams.${i}.exam_date`)} /></div>
                    <Button type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0"
                      onClick={() => removeExam(i)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Medications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Medicamentos</Label>
              <Button type="button" variant="outline" size="sm"
                onClick={() => addMed({ name: '', dosage: '', frequency: '', duration_days: '', start_date: '', notes: '' })}>
                <Plus size={13} className="mr-1" />Adicionar medicamento
              </Button>
            </div>
            {medFields.map((field, i) => (
              <div key={field.id} className="border border-stone-100 rounded-lg p-3 bg-stone-50 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" {...register(`medications.${i}.name`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Dose</Label><Input className="h-8 text-sm" placeholder="Ex: 10mg" {...register(`medications.${i}.dosage`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Frequência</Label><Input className="h-8 text-sm" placeholder="Ex: 2x/dia" {...register(`medications.${i}.frequency`)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Duração (dias)</Label><Input type="number" className="h-8 text-sm" {...register(`medications.${i}.duration_days`)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Início</Label><Input type="date" className="h-8 text-sm" {...register(`medications.${i}.start_date`)} /></div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Obs.</Label><Input className="h-8 text-sm" {...register(`medications.${i}.notes`)} /></div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeMed(i)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Archive animal modal ─────────────────────────────────────────────────────

const ARCHIVE_REASONS = [
  { value: 'erro_cadastro', label: 'Erro de cadastro' },
  { value: 'obito',         label: 'Óbito (use também o status Óbito no animal)' },
  { value: 'outro',         label: 'Outro' },
]

export function ArchiveAnimalModal({ open, onClose, animal, onArchived }: {
  open: boolean; onClose: () => void
  animal: import('@/types/database').Animal
  onArchived: () => void
}) {
  const [reason,   setReason]   = useState('')
  const [freeText, setFreeText] = useState('')
  const [saving,   setSaving]   = useState(false)

  async function handleSubmit() {
    if (!reason) { toast.error('Selecione um motivo.'); return }
    const archive_reason = reason === 'outro' ? freeText.trim() || 'Outro' : ARCHIVE_REASONS.find(r => r.value === reason)!.label
    setSaving(true)
    const { error } = await supabase.from('animals')
      .update({ deleted_at: new Date().toISOString(), archive_reason })
      .eq('id', animal.id)
    setSaving(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(`${animal.name} arquivado.`)
    onArchived()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-700">Arquivar {animal.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-stone-500">
          O animal será ocultado de todas as listagens mas permanecerá no banco de dados.
        </p>
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-stone-700">Motivo</p>
          {ARCHIVE_REASONS.map(r => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 hover:text-stone-900">
              <input type="radio" name="archive_reason" value={r.value}
                checked={reason === r.value} onChange={() => setReason(r.value)}
                className="accent-brand-600" />
              {r.label}
            </label>
          ))}
          {reason === 'outro' && (
            <input
              type="text"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Descreva o motivo..."
              className="w-full mt-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-1.5" onClick={handleSubmit} disabled={saving || !reason}>
            {saving && <Loader2 size={13} className="animate-spin" />}Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
