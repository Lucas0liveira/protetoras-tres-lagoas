import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { Animal } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const schema = z.object({
  // Dados pessoais
  full_name:     z.string().min(2, 'Nome obrigatório'),
  documento:     z.string().min(1, 'Obrigatório'),
  idade:         z.string().min(1, 'Obrigatório'),
  phone:         z.string().min(8, 'Obrigatório'),
  endereco:      z.string().min(3, 'Obrigatório'),
  cidade_uf:     z.string().min(2, 'Obrigatório'),
  rede_social:   z.string().optional(),
  email:         z.string().email('Email inválido').optional().or(z.literal('')),
  // Residência
  tipo_moradia:  z.string().optional(),
  imovel_proprio: z.string().optional(),
  proprietario_permite: z.string().optional(),
  por_que_lar_temp: z.string().min(1, 'Obrigatório'),
  autoriza_visitas: z.string().optional(),
  condominio_animais: z.string().optional(),
  janelas_teladas: z.string().optional(),
  tem_quintal:   z.string().optional(),
  local_murado:  z.string().optional(),
  // Pessoas na casa
  outro_morador: z.string().optional(),
  num_pessoas:   z.string().optional(),
  todos_concordam: z.string().optional(),
  criancas:      z.string().optional(),
  // Outros animais
  tem_animais:   z.string().optional(),
  quais_animais: z.string().optional(),
  animais_castrados: z.string().optional(),
  animais_vacinados: z.string().optional(),
  usa_antiparasitario: z.string().optional(),
  aceitam_outros: z.string().optional(),
  // Experiência
  exp_lar_provisorio: z.string().optional(),
  ja_resgatou:   z.string().optional(),
  cuidou_doente: z.string().optional(),
  como_foi_cuidado: z.string().optional(),
  // Disponibilidade
  tempo_disponivel: z.string().optional(),
  segue_orientacoes: z.string().optional(),
  leva_clinica:  z.string().optional(),
  // Animal aceito
  tipo_animal:   z.string().optional(),
  condicao_animal: z.string().optional(),
  preferencia_especie: z.string().optional(),
  // Rotina
  animal_ficaria: z.string().optional(),
  horas_sozinho: z.string().optional(),
  responsavel_viagem: z.string().optional(),
  // Compromissos
  ciente_responsabilidade: z.string().optional(),
  ciente_comunicar: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function RadioGroup({ name, label, options, value, onChange, required }: {
  name: string; label: string; options: string[]; value: string | undefined; onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && ' *'}</Label>
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

export function LarTemporarioForm({ open, onClose, animal }: {
  open: boolean; onClose: () => void; animal: Animal | null
}) {
  const [step, setStep] = useState(0)
  const sections = ['Dados Pessoais', 'Residência', 'Pessoas & Animais', 'Experiência', 'Disponibilidade & Perfil']

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    const { full_name, phone, email, ...rest } = values
    const form_data: Record<string, unknown> = { ...rest }
    if (animal) form_data.animal_nome = animal.name

    const { error } = await supabase.from('interests').insert({
      animal_id:     animal?.id ?? null,
      full_name,
      phone,
      email:         email || null,
      interest_type: 'lar_temporario',
      message:       null,
      form_data,
    })
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return }
    toast.success('Formulário enviado! Entraremos em contato em breve. 🐾')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulário para Lar Temporário</DialogTitle>
          {animal && (
            <p className="text-sm text-stone-500">Animal de interesse: <span className="font-medium">{animal.name}</span></p>
          )}
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {sections.map((_, i) => (
            <button key={i} type="button" onClick={() => setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-stone-200'}`} />
          ))}
        </div>
        <p className="text-xs text-stone-400 mb-4">{step + 1} / {sections.length} — {sections[step]}</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {step === 0 && <>
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
                <Label>Telefone/WhatsApp *</Label>
                <Input placeholder="(67) 99999-0000" {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Endereço completo *</Label>
                <Input {...register('endereco')} />
                {errors.endereco && <p className="text-xs text-red-500">{errors.endereco.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Cidade/UF *</Label>
                <Input {...register('cidade_uf')} />
                {errors.cidade_uf && <p className="text-xs text-red-500">{errors.cidade_uf.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Rede Social</Label>
                <Input placeholder="@perfil" {...register('rede_social')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
              </div>
            </>}

            {step === 1 && <>
              <Controller name="tipo_moradia" control={control} render={({ field }) => (
                <RadioGroup name="tipo_moradia" label="Você mora em" options={['Casa', 'Apartamento']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="imovel_proprio" control={control} render={({ field }) => (
                <RadioGroup name="imovel_proprio" label="O imóvel é" options={['Próprio', 'Alugado']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="proprietario_permite" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="proprietario_permite" label="Se alugado, proprietário permite animais?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="col-span-2 space-y-1">
                <Label>Por que quer ser lar temporário? *</Label>
                <Textarea rows={3} {...register('por_que_lar_temp')} />
                {errors.por_que_lar_temp && <p className="text-xs text-red-500">{errors.por_que_lar_temp.message}</p>}
              </div>
              <Controller name="janelas_teladas" control={control} render={({ field }) => (
                <RadioGroup name="janelas_teladas" label="Apto: janelas/sacadas teladas?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="tem_quintal" control={control} render={({ field }) => (
                <RadioGroup name="tem_quintal" label="Casa: possui quintal?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="local_murado" control={control} render={({ field }) => (
                <RadioGroup name="local_murado" label="Casa: local murado/telado?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="autoriza_visitas" control={control} render={({ field }) => (
                <RadioGroup name="autoriza_visitas" label="Autoriza visitas/acompanhamento?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
              )} />
              <div className="col-span-2 space-y-1">
                <Label>Condições do condomínio sobre animais</Label>
                <Textarea rows={2} {...register('condominio_animais')} />
              </div>
            </>}

            {step === 2 && <>
              <div className="col-span-2 space-y-1">
                <Label>Nome e telefone de outro morador</Label>
                <Input {...register('outro_morador')} />
              </div>
              <div className="space-y-1">
                <Label>Quantas pessoas moram com você?</Label>
                <Input {...register('num_pessoas')} />
              </div>
              <div className="space-y-1">
                <Label>Crianças na casa? Qual idade?</Label>
                <Input {...register('criancas')} />
              </div>
              <Controller name="todos_concordam" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="todos_concordam" label="Todos concordam com lar temporário?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="tem_animais" control={control} render={({ field }) => (
                <RadioGroup name="tem_animais" label="Possui outros animais?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <div className="space-y-1">
                <Label>Quantos e quais?</Label>
                <Input {...register('quais_animais')} />
              </div>
              <Controller name="animais_castrados" control={control} render={({ field }) => (
                <RadioGroup name="animais_castrados" label="São castrados?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="animais_vacinados" control={control} render={({ field }) => (
                <RadioGroup name="animais_vacinados" label="Vacinados em dia?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="usa_antiparasitario" control={control} render={({ field }) => (
                <RadioGroup name="usa_antiparasitario" label="Usam antiparasitário?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="aceitam_outros" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="aceitam_outros" label="Costumam aceitar outros animais?" options={['Sim', 'Não', 'Não sei']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
            </>}

            {step === 3 && <>
              <Controller name="exp_lar_provisorio" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="exp_lar_provisorio" label="Experiência com lar provisório?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="ja_resgatou" control={control} render={({ field }) => (
                <RadioGroup name="ja_resgatou" label="Já resgatou animal de rua?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="cuidou_doente" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="cuidou_doente" label="Cuidou de animal doente, filhote ou em recuperação?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="col-span-2 space-y-1">
                <Label>Se sim, como foi?</Label>
                <Textarea rows={3} {...register('como_foi_cuidado')} />
              </div>
            </>}

            {step === 4 && <>
              <div className="col-span-2">
                <Controller name="tempo_disponivel" control={control} render={({ field }) => (
                  <RadioGroup name="tempo_disponivel" label="Quanto tempo pode oferecer?" options={['Até adoção', '15 dias', '30 dias', 'Outro']} value={field.value} onChange={field.onChange} />
                )} />
              </div>
              <Controller name="segue_orientacoes" control={control} render={({ field }) => (
                <RadioGroup name="segue_orientacoes" label="Consegue seguir orientações da ONG?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="leva_clinica" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="leva_clinica" label="Consegue levar a acompanhamento em clínica?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="col-span-2">
                <Controller name="tipo_animal" control={control} render={({ field }) => (
                  <RadioGroup name="tipo_animal" label="Aceita qual tipo de animal?" options={['Filhote', 'Adulto', 'Idoso', 'Jovem', 'Todos']} value={field.value} onChange={field.onChange} />
                )} />
              </div>
              <Controller name="preferencia_especie" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="preferencia_especie" label="Preferência?" options={['Cachorro', 'Gato', 'Indiferente']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="animal_ficaria" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="animal_ficaria" label="O animal ficaria..." options={['Dentro de casa', 'Fora de casa', 'Livre']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="space-y-1">
                <Label>Horas sozinho por dia</Label>
                <Input {...register('horas_sozinho')} />
              </div>
              <div className="space-y-1">
                <Label>Responsável em viagens</Label>
                <Input {...register('responsavel_viagem')} />
              </div>
              <Controller name="ciente_responsabilidade" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="ciente_responsabilidade" label="Ciente que o animal é responsabilidade da ONG?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="ciente_comunicar" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="ciente_comunicar" label="Ciente de comunicar problemas imediatamente?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
            </>}
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>Anterior</Button>
            )}
            {step < sections.length - 1 ? (
              <Button type="button" onClick={() => setStep(s => s + 1)}>Próximo</Button>
            ) : (
              <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={isSubmitting}>
                {isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}Enviar formulário
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
