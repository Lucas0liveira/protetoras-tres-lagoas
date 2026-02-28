import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, PawPrint, Stethoscope, Syringe, Home } from 'lucide-react'

export default function AnimalDetail() {
  const { id } = useParams()

  return (
    <div className="p-8 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-stone-500 -ml-2">
        <Link to="/dashboard/animais"><ArrowLeft size={15} className="mr-1" />Voltar</Link>
      </Button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800 mb-1">Diana</h1>
          <p className="text-stone-400 text-sm">Canina · Fêmea · SRD · ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-stone-50 text-stone-500 border-stone-200">Adotada</Badge>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Editar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* identification */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PawPrint size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-stone-700">Identificação & Resgate</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Origem', 'Praça do Alvorada'],
              ['Data do resgate', '18/01/2026'],
              ['Pelagem', 'Preta, marrom e branca'],
              ['Lar temporário', 'Charlene — (67) 99999-0000'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-stone-400">{label}</span>
                <p className="text-stone-700 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* sanitary */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Syringe size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-stone-700">Protocolo Sanitário</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Castrada', done: true },
              { label: 'Vacinada', done: false },
              { label: 'Vermifugada', done: false },
              { label: 'Bravecto', done: true },
              { label: 'Coleira Leishmaniose', done: true },
            ].map(({ label, done }) => (
              <Badge key={label} variant="outline"
                className={done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-400 border-stone-200'}>
                {done ? '✓' : '○'} {label}
              </Badge>
            ))}
          </div>
        </section>

        {/* medical timeline placeholder */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-emerald-600" />
              <h2 className="font-semibold text-stone-700">Histórico Médico</h2>
            </div>
            <Button size="sm" variant="outline">+ Novo atendimento</Button>
          </div>
          <p className="text-stone-400 text-sm">Nenhum atendimento registrado ainda. Placeholder — lista de medical_records vai aqui.</p>
        </section>

        {/* adoption */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-stone-700">Adoção</h2>
          </div>
          <p className="text-stone-400 text-sm">Histórico de adoções vai aqui. Placeholder.</p>
        </section>

      </div>
    </div>
  )
}