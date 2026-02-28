import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'

export default function Adoptants() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Adotantes</h1>
          <p className="text-stone-400 text-sm mt-1">Cadastro de adotantes</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus size={16} />Novo adotante</Button>
      </div>
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input placeholder="Buscar por nome ou CPF..." className="pl-9 bg-white" />
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
        Tabela de adotantes — placeholder. Conectar com Supabase na próxima etapa.
      </div>
    </div>
  )
}