import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  resgatado:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  lar_temporario:  'bg-blue-50 text-blue-700 border-blue-200',
  disponivel:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  adotado:         'bg-stone-50 text-stone-500 border-stone-200',
  obito:           'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  resgatado: 'Resgatado', lar_temporario: 'Lar temporário',
  disponivel: 'Disponível', adotado: 'Adotado', obito: 'Óbito',
}

const MOCK = [
  { id: '1', name: 'Diana', species: 'Canina', sex: 'Fêmea', breed: 'SRD', status: 'adotado', rescue_date: '2026-01-18' },
  { id: '2', name: 'Mel',   species: 'Felina', sex: 'Fêmea', breed: 'SRD', status: 'lar_temporario', rescue_date: '2026-02-01' },
  { id: '3', name: 'Thor',  species: 'Canino', sex: 'Macho', breed: 'SRD', status: 'disponivel', rescue_date: '2026-02-10' },
]

export default function Animals() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Animais</h1>
          <p className="text-stone-400 text-sm mt-1">Todos os animais resgatados</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus size={16} />Novo animal
        </Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input placeholder="Buscar por nome..." className="pl-9 bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 bg-stone-50">
            <tr>
              {['Nome','Espécie','Sexo','Raça','Status','Resgatado em',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {MOCK.map((a) => (
              <tr key={a.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3 font-medium text-stone-800">{a.name}</td>
                <td className="px-4 py-3 text-stone-500">{a.species}</td>
                <td className="px-4 py-3 text-stone-500">{a.sex}</td>
                <td className="px-4 py-3 text-stone-500">{a.breed}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_COLORS[a.status]}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-stone-400">{a.rescue_date}</td>
                <td className="px-4 py-3">
                  <Button asChild variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                    <Link to={`/dashboard/animais/${a.id}`}>Ver prontuário →</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}