import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, User, Lock, Mail, Package, X, Plus } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Profile form ─────────────────────────────────────────────────────────────

const profileSchema = z.object({
  display_name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone:        z.string().optional(),
})
type ProfileValues = z.infer<typeof profileSchema>

// ─── Email form ───────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
})
type EmailValues = z.infer<typeof emailSchema>

// ─── Password form ────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  password:        z.string().min(8, 'Mínimo 8 caracteres'),
  password_confirm: z.string(),
}).refine(d => d.password === d.password_confirm, {
  message: 'Senhas não coincidem', path: ['password_confirm'],
})
type PasswordValues = z.infer<typeof passwordSchema>

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className="text-brand-600" />
        <h2 className="font-semibold text-stone-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Wish list editor ─────────────────────────────────────────────────────────

function WishListEditor() {
  const [items, setItems] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('site_config').select('value').eq('key', 'wish_list').single()
      .then(({ data }) => { if (data?.value) setItems(data.value as string[]) })
  }, [])

  function addItem() {
    const v = input.trim()
    if (!v || items.includes(v)) return
    setItems(prev => [...prev, v])
    setInput('')
  }

  function removeItem(item: string) {
    setItems(prev => prev.filter(i => i !== item))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('site_config')
      .upsert({ key: 'wish_list', value: items as unknown as Record<string, unknown> }, { onConflict: 'key' })
    setSaving(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success('Lista atualizada!')
  }

  return (
    <Card icon={Package} title="Lista de itens bem-vindos (site público)">
      <p className="text-xs text-stone-400 mb-4">Itens exibidos na página inicial como doações sempre bem-vindas.</p>
      <div className="flex flex-wrap gap-2 mb-4 min-h-8">
        {items.map(item => (
          <span key={item} className="flex items-center gap-1.5 bg-stone-100 rounded-full px-3 py-1 text-sm text-stone-700">
            {item}
            <button onClick={() => removeItem(item)} className="text-stone-400 hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-stone-400">Nenhum item cadastrado.</p>}
      </div>
      <div className="flex gap-2 mb-4">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
          placeholder="Adicionar item…"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addItem}>
          <Plus size={15} />
        </Button>
      </div>
      <Button onClick={save} disabled={saving} className="bg-brand-600 hover:bg-brand-700">
        {saving && <Loader2 size={14} className="animate-spin mr-2" />}Salvar lista
      </Button>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [currentEmail, setCurrentEmail] = useState('')

  // ── Profile ──────────────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: '', phone: '' },
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles').select('display_name, phone').eq('id', user.id).single()
      if (profile) {
        profileForm.reset({ display_name: profile.display_name ?? '', phone: profile.phone ?? '' })
      }
    }
    loadProfile()
  }, [])

  async function onProfileSubmit(values: ProfileValues) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles')
      .update({ display_name: values.display_name, phone: values.phone || null })
      .eq('id', user.id)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Perfil atualizado!')
  }

  // ── Email ─────────────────────────────────────────────────────────────────────
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  async function onEmailSubmit(values: EmailValues) {
    const { error } = await supabase.auth.updateUser({ email: values.email })
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Email de confirmação enviado para ' + values.email)
    emailForm.reset()
  }

  // ── Password ──────────────────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })

  async function onPasswordSubmit(values: PasswordValues) {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success('Senha atualizada!')
    passwordForm.reset()
  }

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Configurações</h1>
        <p className="text-stone-400 text-sm mt-1">Gerencie seu perfil e credenciais de acesso.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card icon={User} title="Informações do perfil">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome de exibição</Label>
              <Input {...profileForm.register('display_name')} placeholder="Seu nome" />
              {profileForm.formState.errors.display_name && (
                <p className="text-red-500 text-xs">{profileForm.formState.errors.display_name.message}</p>
              )}
              <p className="text-xs text-stone-400">Este é o nome que aparece no histórico de atividades.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input {...profileForm.register('phone')} placeholder="(67) 99999-9999" />
            </div>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700"
              disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}
              Salvar perfil
            </Button>
          </form>
        </Card>

        {/* Email */}
        <Card icon={Mail} title="Alterar email">
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email atual</Label>
              <Input value={currentEmail} disabled className="bg-stone-50 text-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label>Novo email</Label>
              <Input type="email" {...emailForm.register('email')} placeholder="novo@email.com" />
              {emailForm.formState.errors.email && (
                <p className="text-red-500 text-xs">{emailForm.formState.errors.email.message}</p>
              )}
              <p className="text-xs text-stone-400">Um email de confirmação será enviado para o novo endereço.</p>
            </div>
            <Button type="submit" variant="outline" disabled={emailForm.formState.isSubmitting}>
              {emailForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}
              Alterar email
            </Button>
          </form>
        </Card>

        {/* Wish list */}
        <WishListEditor />

        {/* Password */}
        <Card icon={Lock} title="Alterar senha">
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input type="password" {...passwordForm.register('password')} />
              {passwordForm.formState.errors.password && (
                <p className="text-red-500 text-xs">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type="password" {...passwordForm.register('password_confirm')} />
              {passwordForm.formState.errors.password_confirm && (
                <p className="text-red-500 text-xs">{passwordForm.formState.errors.password_confirm.message}</p>
              )}
            </div>
            <Button type="submit" variant="outline" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting && <Loader2 size={14} className="animate-spin mr-2" />}
              Alterar senha
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}