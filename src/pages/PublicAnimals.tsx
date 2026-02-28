import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PawPrint, ArrowLeft } from 'lucide-react'

const MOCK = [
  { id: '1', name: 'Diana', species: 'Canina', status: 'Disponível', breed: 'SRD', sex: 'Fêmea' },
  { id: '2', name: 'Mel', species: 'Felina', status: 'Lar temporário', breed: 'SRD', sex: 'Fêmea' },
  { id: '3', name: 'Thor', species: 'Canino', status: 'Disponível', breed: 'SRD', sex: 'Macho' },
]

export default function PublicAnimals() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between px-8 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <PawPrint className="text-emerald-600" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft size={16} className="mr-1" />Início</Link>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">Animais para adoção</h1>
        <p className="text-stone-500 mb-8">Conheça os animais resgatados que estão em busca de um lar.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK.map((animal) => (
            <div key={animal.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-stone-100 h-44 flex items-center justify-center">
                <PawPrint size={40} className="text-stone-300" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-stone-800">{animal.name}</h3>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs">
                    {animal.status}
                  </Badge>
                </div>
                <p className="text-stone-400 text-sm">{animal.sex} · {animal.species} · {animal.breed}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}