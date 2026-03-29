import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const AREAS = [
  'Resgate de animais', 'Transporte de animais', 'Apoio em clínica veterinária',
  'Buscar e levar doações', 'Apoio em demandas do dia a dia', 'Organização de doações',
  'Marketing', 'Redes sociais', 'Tirar fotos dos animais', 'Fazer vídeos',
  'Edição de fotos e vídeos', 'Criação de artes', 'Captação de recursos',
  'Apoio em ações presenciais',
]

const schema = z.object({
  full_name:         z.string().min(2, 'Nome obrigatório'),
  documento:         z.string().min(1, 'Obrigatório'),
  idade:             z.string().min(1, 'Obrigatório'),
  profissao:         z.string().min(1, 'Obrigatório'),
  phone:             z.string().min(8, 'Obrigatório'),
  email:             z.string().email('Email obrigatório'),
  endereco_cep:      z.string().min(3, 'Obrigatório'),
  por_que_voluntario: z.string().min(1, 'Obrigatório'),
  trabalho_voluntario_anterior: z.string().min(1, 'Obrigatório'),
  disponibilidade:   z.string().optional(),
  areas_atuacao:     z.array(z.string()).min(1, 'Selecione pelo menos uma área'),
  locomocao:         z.string().optional(),
  confortavel_transporte: z.string().optional(),
  preparado_emocionalmente: z.string().optional(),
  como_lida_dificuldades: z.string().min(1, 'Obrigatório'),
  assume_responsabilidade: z.string().optional(),
  segue_orientacoes: z.string().optional(),
  habilidades_adicionais: z.string().min(1, 'Obrigatório'),
})
type FormValues = z.infer<typeof schema>

function RadioGroup({ name, label, options, value, onChange }: {
  name: string; label: string; options: string[]; value: string | undefined; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <label key={opt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
            value === opt ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
          }`}>
            <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="hidden" />
            {opt}
          </label>
        ))}
      </div>
    </div>
  )
}

export function VoluntarioForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { areas_atuacao: [] },
  })

  async function onSubmit(values: FormValues) {
    const { full_name, phone, email, ...rest } = values
    const { error } = await supabase.from('interests').insert({
      animal_id:     null,
      full_name,
      phone,
      email,
      interest_type: 'voluntario',
      message:       null,
      form_data:     rest as unknown as Record<string, unknown>,
    })
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return }
    toast.success('Formulário enviado! Entraremos em contato em breve. 🐾')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulário de Voluntariado</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">

            {/* Dados pessoais */}
            <div className="col-span-2 pt-1 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Dados Pessoais</p>
            </div>
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>RG ou CPF *</Label>
              <Input {...register('documento')} />
              {errors.documento && <p className="text-xs text-red-500">{errors.documento.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Idade *</Label>
              <Input {...register('idade')} />
              {errors.idade && <p className="text-xs text-red-500">{errors.idade.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Profissão *</Label>
              <Input {...register('profissao')} />
              {errors.profissao && <p className="text-xs text-red-500">{errors.profissao.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Telefone/WhatsApp *</Label>
              <Input placeholder="(67) 99999-0000" {...register('phone')} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Endereço (com CEP) *</Label>
              <Input {...register('endereco_cep')} />
              {errors.endereco_cep && <p className="text-xs text-red-500">{errors.endereco_cep.message}</p>}
            </div>

            {/* Motivação */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Motivação</p>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Por que deseja ser voluntário(a)? *</Label>
              <Textarea rows={3} {...register('por_que_voluntario')} />
              {errors.por_que_voluntario && <p className="text-xs text-red-500">{errors.por_que_voluntario.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Já participou de trabalho voluntário? Se sim, qual? *</Label>
              <Textarea rows={2} {...register('trabalho_voluntario_anterior')} />
              {errors.trabalho_voluntario_anterior && <p className="text-xs text-red-500">{errors.trabalho_voluntario_anterior.message}</p>}
            </div>

            {/* Disponibilidade */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Disponibilidade</p>
            </div>
            <div className="col-span-2">
              <Controller name="disponibilidade" control={control} render={({ field }) => (
                <RadioGroup name="disponibilidade" label="Tempo disponível por semana"
                  options={['1 vez por semana', '2 a 3 vezes por semana', 'Finais de semana', 'Esporadicamente', 'Outro']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>

            {/* Áreas de atuação */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Áreas de Atuação</p>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Em quais áreas pode atuar? * (selecione todas que se aplicam)</Label>
              <Controller name="areas_atuacao" control={control} render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {AREAS.map(area => {
                    const checked = field.value.includes(area)
                    return (
                      <label key={area} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        checked ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}>
                        <input type="checkbox" checked={checked}
                          onChange={e => {
                            if (e.target.checked) field.onChange([...field.value, area])
                            else field.onChange(field.value.filter((a: string) => a !== area))
                          }}
                          className="hidden" />
                        {area}
                      </label>
                    )
                  })}
                </div>
              )} />
              {errors.areas_atuacao && <p className="text-xs text-red-500">{errors.areas_atuacao.message}</p>}
            </div>

            {/* Logística */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Logística</p>
            </div>
            <div className="col-span-2">
              <Controller name="locomocao" control={control} render={({ field }) => (
                <RadioGroup name="locomocao" label="Meio de locomoção"
                  options={['Carro', 'Moto', 'Bicicleta', 'Não possuo', 'Outro']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>
            <div className="col-span-2">
              <Controller name="confortavel_transporte" control={control} render={({ field }) => (
                <RadioGroup name="confortavel_transporte" label="Confortável em transportar animais?"
                  options={['Sim', 'Não', 'Depende da situação']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>

            {/* Perfil emocional */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Perfil Emocional</p>
            </div>
            <div className="col-span-2">
              <Controller name="preparado_emocionalmente" control={control} render={({ field }) => (
                <RadioGroup name="preparado_emocionalmente" label="Preparado(a) emocionalmente para lidar com situações difíceis?"
                  options={['Sim', 'Não', 'Parcialmente']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Como lida com situações emocionalmente desafiadoras? *</Label>
              <Textarea rows={3} {...register('como_lida_dificuldades')} />
              {errors.como_lida_dificuldades && <p className="text-xs text-red-500">{errors.como_lida_dificuldades.message}</p>}
            </div>

            {/* Compromisso */}
            <div className="col-span-2 pt-2 pb-1 border-b border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Compromisso</p>
            </div>
            <div className="col-span-2">
              <Controller name="assume_responsabilidade" control={control} render={({ field }) => (
                <RadioGroup name="assume_responsabilidade" label="Entende que assume responsabilidade com o animal e a equipe?"
                  options={['Sim', 'Não']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>
            <div className="col-span-2">
              <Controller name="segue_orientacoes" control={control} render={({ field }) => (
                <RadioGroup name="segue_orientacoes" label="Disposto(a) a seguir orientações e organização da ONG?"
                  options={['Sim', 'Não']}
                  value={field.value} onChange={field.onChange} />
              )} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Habilidades ou conhecimentos especiais que pode contribuir? *</Label>
              <Textarea rows={3} {...register('habilidades_adicionais')} />
              {errors.habilidades_adicionais && <p className="text-xs text-red-500">{errors.habilidades_adicionais.message}</p>}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Enviar formulário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
