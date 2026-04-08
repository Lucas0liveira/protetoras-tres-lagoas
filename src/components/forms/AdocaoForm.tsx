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

// ─── Types ────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Dados pessoais
  full_name:          z.string().min(2, 'Nome obrigatório'),
  idade:              z.string().min(1, 'Obrigatório'),
  documento:          z.string().optional(),
  rede_social:        z.string().optional(),
  endereco:           z.string().min(3, 'Obrigatório'),
  cidade_uf:          z.string().min(2, 'Obrigatório'),
  profissao:          z.string().optional(),
  local_horario_trabalho: z.string().min(1, 'Obrigatório'),
  phone:              z.string().min(8, 'Obrigatório'),
  email:              z.string().email('Email inválido'),
  // Residência
  transporte:         z.string().optional(),
  imovel_proprio:     z.string().optional(),
  proprietario_permite: z.string().optional(),
  tipo_moradia:       z.string().optional(),
  condominio_animais: z.string().optional(),
  janelas_teladas:    z.string().optional(),
  tem_quintal:        z.string().optional(),
  local_murado:       z.string().optional(),
  acesso_animal:      z.string().optional(),
  perspectiva_mudanca: z.string().optional(),
  o_que_faria_animal: z.string().optional(),
  autoriza_visitas:   z.string().optional(),
  // Pessoas na casa
  outro_morador:      z.string().optional(),
  todos_concordam:    z.string().optional(),
  num_pessoas:        z.string().optional(),
  adultos_criancas:   z.string().optional(),
  // Outros animais
  outros_animais:     z.string().optional(),
  temperamento_porte: z.string().optional(),
  antiparasitario_existente: z.string().optional(),
  vacinacao_dia:      z.string().optional(),
  castrado_existente: z.string().optional(),
  acesso_rua:         z.string().optional(),
  // Sobre a adoção
  especie_desejada:   z.string().optional(),
  cuidados_basicos:   z.string().optional(),
  coleira_leishmaniose: z.string().optional(),
  antiparasitarios_ciente: z.string().optional(),
  expectativa_animal: z.string().optional(),
  condicoes_financeiras: z.string().min(1, 'Obrigatório'),
  animal_escolhido:   z.string().optional(),
  horas_sozinho:      z.string().optional(),
  responsavel_viagem: z.string().optional(),
  tratamento_leishmaniose: z.string().optional(),
  seria_presente:     z.string().optional(),
  // Informativo
  gravidez_animais:   z.string().optional(),
  alergias:           z.string().optional(),
  devolveu_antes:     z.string().optional(),
  perdeu_animal:      z.string().optional(),
  ciente_15_anos:     z.string().optional(),
  concorda_nao_repassar: z.string().optional(),
  responsabilidade_respostas: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Main form ────────────────────────────────────────────────────────────────

export function AdocaoForm({ open, onClose, animal }: {
  open: boolean; onClose: () => void; animal: Animal | null
}) {
  const [step, setStep] = useState(0)
  const sections = ['Dados Pessoais', 'Residência', 'Pessoas na Casa', 'Outros Animais', 'Sobre a Adoção', 'Informativo']

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
      interest_type: 'adocao',
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
          <DialogTitle>Formulário para Adoção de Animais</DialogTitle>
          {animal && (
            <p className="text-sm text-stone-500">Animal de interesse: <span className="font-medium">{animal.name}</span></p>
          )}
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-2">
          {sections.map((_s, i) => (
            <button key={i} type="button" onClick={() => setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-stone-200'}`} />
          ))}
        </div>
        <p className="text-xs text-stone-400 mb-4">{step + 1} / {sections.length} — {sections[step]}</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* ── Step 0: Dados Pessoais ─────────────────────────── */}
            {step === 0 && <>
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
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
              <div className="space-y-1">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>RG ou CPF</Label>
                <Input {...register('documento')} />
              </div>
              <div className="space-y-1">
                <Label>Rede Social</Label>
                <Input placeholder="@perfil" {...register('rede_social')} />
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
                <Label>Profissão</Label>
                <Input {...register('profissao')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Local e horário de trabalho *</Label>
                <Input {...register('local_horario_trabalho')} />
                {errors.local_horario_trabalho && <p className="text-xs text-red-500">{errors.local_horario_trabalho.message}</p>}
              </div>
            </>}

            {/* ── Step 1: Residência ────────────────────────────── */}
            {step === 1 && <>
              <div className="col-span-2 space-y-1">
                <Label>Possui meio de transporte? Qual?</Label>
                <Input {...register('transporte')} />
              </div>
              <Controller name="imovel_proprio" control={control} render={({ field }) => (
                <RadioGroup name="imovel_proprio" label="O imóvel é" options={['Próprio', 'Alugado']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="proprietario_permite" control={control} render={({ field }) => (
                <RadioGroup name="proprietario_permite" label="Se alugado, proprietário permite animais?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="tipo_moradia" control={control} render={({ field }) => (
                <RadioGroup name="tipo_moradia" label="Você mora em" options={['Casa', 'Apartamento']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="janelas_teladas" control={control} render={({ field }) => (
                <RadioGroup name="janelas_teladas" label="Apartamento: janelas/sacadas teladas?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="tem_quintal" control={control} render={({ field }) => (
                <RadioGroup name="tem_quintal" label="Casa: possui quintal?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="local_murado" control={control} render={({ field }) => (
                <RadioGroup name="local_murado" label="Casa: local murado/telado?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <div className="col-span-2 space-y-1">
                <Label>Condições do condomínio sobre animais</Label>
                <Textarea rows={2} {...register('condominio_animais')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>O animal terá acesso dentro de casa ou ficará restrito?</Label>
                <Textarea rows={2} {...register('acesso_animal')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Perspectiva de mudança de casa ou cidade?</Label>
                <Textarea rows={2} {...register('perspectiva_mudanca')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Se mudar, o que fará com o animal?</Label>
                <Textarea rows={2} {...register('o_que_faria_animal')} />
              </div>
              <Controller name="autoriza_visitas" control={control} render={({ field }) => (
                <RadioGroup name="autoriza_visitas" label="Autoriza visitas/acompanhamento da ONG?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
              )} />
            </>}

            {/* ── Step 2: Pessoas na Casa ───────────────────────── */}
            {step === 2 && <>
              <div className="col-span-2 space-y-1">
                <Label>Nome e telefone de outro morador</Label>
                <Input {...register('outro_morador')} />
              </div>
              <Controller name="todos_concordam" control={control} render={({ field }) => (
                <RadioGroup name="todos_concordam" label="Todos concordam com a adoção?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
              )} />
              <div className="space-y-1">
                <Label>Quantas pessoas moram com você?</Label>
                <Input {...register('num_pessoas')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Quantos adultos e crianças? Qual a idade?</Label>
                <Input {...register('adultos_criancas')} />
              </div>
            </>}

            {/* ── Step 3: Outros Animais ────────────────────────── */}
            {step === 3 && <>
              <div className="col-span-2 space-y-1">
                <Label>Você já possui animais? Quais? Qual idade?</Label>
                <Textarea rows={2} {...register('outros_animais')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Qual o temperamento? Qual o porte?</Label>
                <Input {...register('temperamento_porte')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Utiliza antiparasitário? Com qual frequência?</Label>
                <Input {...register('antiparasitario_existente')} />
              </div>
              <Controller name="vacinacao_dia" control={control} render={({ field }) => (
                <RadioGroup name="vacinacao_dia" label="Vacinação em dia?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="castrado_existente" control={control} render={({ field }) => (
                <RadioGroup name="castrado_existente" label="É castrado?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="acesso_rua" control={control} render={({ field }) => (
                <RadioGroup name="acesso_rua" label="Tem acesso à rua?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
            </>}

            {/* ── Step 4: Sobre a Adoção ────────────────────────── */}
            {step === 4 && <>
              <Controller name="especie_desejada" control={control} render={({ field }) => (
                <RadioGroup name="especie_desejada" label="Qual animal quer adotar?" options={['Cão', 'Gato']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="cuidados_basicos" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="cuidados_basicos" label="Disposto(a) a cuidados diários (limpeza, passeios, alimentação, carinho)?" options={['Sim', 'Não', 'Talvez']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="coleira_leishmaniose" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="coleira_leishmaniose" label="Ciente do uso de coleira contra leishmaniose?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="antiparasitarios_ciente" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="antiparasitarios_ciente" label="Ciente que cães e gatos precisam de antiparasitários?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="col-span-2 space-y-1">
                <Label>Sua expectativa sobre o animal (porte, humor, idade...)</Label>
                <Textarea rows={2} {...register('expectativa_animal')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Tem condições de gastar com alimentação, vacinas, vet? *</Label>
                <Textarea rows={2} {...register('condicoes_financeiras')} />
                {errors.condicoes_financeiras && <p className="text-xs text-red-500">{errors.condicoes_financeiras.message}</p>}
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Já escolheu algum de nossos animais?</Label>
                <Input {...register('animal_escolhido')} />
              </div>
              <div className="space-y-1">
                <Label>Horas/dia que o animal ficará sozinho</Label>
                <Input {...register('horas_sozinho')} />
              </div>
              <div className="space-y-1">
                <Label>Quem cuida em viagens?</Label>
                <Input {...register('responsavel_viagem')} />
              </div>
              <Controller name="tratamento_leishmaniose" control={control} render={({ field }) => (
                <RadioGroup name="tratamento_leishmaniose" label="Se tiver leishmaniose, fará tratamento?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
              <Controller name="seria_presente" control={control} render={({ field }) => (
                <RadioGroup name="seria_presente" label="Será dado de presente?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
              )} />
            </>}

            {/* ── Step 5: Informativo ───────────────────────────── */}
            {step === 5 && <>
              <div className="col-span-2 space-y-1">
                <Label>O que pensa sobre ter animais em caso de gravidez?</Label>
                <Textarea rows={2} {...register('gravidez_animais')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Alguém em casa é alérgico a cães/gatos?</Label>
                <Textarea rows={2} {...register('alergias')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Já adotou e depois devolveu algum animal? Descreva.</Label>
                <Textarea rows={2} {...register('devolveu_antes')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Já perdeu algum animal? Descreva.</Label>
                <Textarea rows={2} {...register('perdeu_animal')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Ciente que cães/gatos podem viver mais de 15 anos?</Label>
                <Textarea rows={2} {...register('ciente_15_anos')} />
              </div>
              <Controller name="concorda_nao_repassar" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="concorda_nao_repassar" label="Concorda em não repassar o animal sem comunicar a ONG?" options={['Concordo', 'Discordo']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <Controller name="responsabilidade_respostas" control={control} render={({ field }) => (
                <div className="col-span-2">
                  <RadioGroup name="responsabilidade_respostas" label="Confirma que todas as respostas são verdadeiras?" options={['Sim', 'Não']} value={field.value} onChange={field.onChange} />
                </div>
              )} />
              <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <p className="font-medium mb-1">📸 Documentos necessários após envio do formulário:</p>
                <p>Envie via WhatsApp: comprovante de endereço, fachada da residência, quintal/área externa e portões/muros.</p>
              </div>
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
