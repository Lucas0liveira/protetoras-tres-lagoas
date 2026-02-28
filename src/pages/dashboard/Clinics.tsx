import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function Clinics() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Clínicas</h1>
          <p className="text-stone-400 text-sm mt-1">Clínicas parceiras</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus size={16} />Nova clínica</Button>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
        Lista de clínicas — placeholder.
      </div>
    </div>
  )
}