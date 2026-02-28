import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PawPrint, Heart, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2">
          <PawPrint className="text-emerald-600" size={22} />
          <span className="font-semibold text-stone-700 tracking-tight">Protetoras Três Lagoas</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/animais">Ver animais</Link>
          </Button>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/login">Área restrita</Link>
          </Button>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-3xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full mb-6 border border-emerald-200">
          <Heart size={14} /> Três Lagoas / MS
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-stone-800 mb-6 leading-tight">
          Cada animal resgatado<br />tem uma história.
        </h1>
        <p className="text-stone-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          Acompanhe os animais resgatados pelas Protetoras de Três Lagoas — do resgate ao lar definitivo.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/animais">Ver animais disponíveis</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#sobre">Saiba mais</a>
          </Button>
        </div>
      </section>

      {/* stats placeholder */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-8 py-16 grid grid-cols-3 gap-8 text-center">
          {[
            { label: 'Animais resgatados', value: '—' },
            { label: 'Adotados', value: '—' },
            { label: 'Em lar temporário', value: '—' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-bold text-emerald-600 mb-2">{s.value}</div>
              <div className="text-stone-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* about placeholder */}
      <section id="sobre" className="max-w-3xl mx-auto px-8 py-20">
        <div className="flex items-start gap-3 mb-6">
          <Shield className="text-emerald-600 mt-1" size={20} />
          <h2 className="text-2xl font-bold text-stone-800">Sobre o projeto</h2>
        </div>
        <p className="text-stone-500 leading-relaxed">
          Texto sobre a ONG e o trabalho das protetoras vai aqui. Placeholder para conteúdo real.
        </p>
      </section>

      <footer className="border-t border-stone-200 bg-white px-8 py-6 text-center text-stone-400 text-sm">
        © {new Date().getFullYear()} Protetoras Três Lagoas
      </footer>
    </div>
  )
}