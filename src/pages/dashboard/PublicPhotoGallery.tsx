import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Globe } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { uploadToCloudinary, cloudinaryUrl } from '@/lib/cloudinary'
import type { AnimalPhoto } from '@/types/database'
import { Button } from '@/components/ui/button'

interface Props {
  animalId: string
  photos: AnimalPhoto[]
  onAdded: (photo: AnimalPhoto) => void
  onRemoved: (id: string) => void
}

export function PublicPhotoGallery({ animalId, photos, onAdded, onRemoved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    setUploading(true)
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} não é uma imagem.`); continue }
      try {
        const result = await uploadToCloudinary(file, `protetoras/${animalId}/public`)
        const { data, error } = await supabase
          .from('animal_photos')
          .insert({ animal_id: animalId, storage_path: result.secure_url, is_cover: false, is_public: true })
          .select()
          .single()
        if (error) throw new Error(error.message)
        onAdded(data as AnimalPhoto)
      } catch (err: any) {
        toast.error('Erro ao enviar foto: ' + (err.message ?? 'tente novamente'))
      }
    }
    setUploading(false)
    if (files.length > 0) toast.success(files.length === 1 ? 'Foto adicionada!' : `${files.length} fotos adicionadas!`)
  }

  async function handleDelete(photo: AnimalPhoto) {
    if (!confirm('Remover esta foto pública?')) return
    setDeletingId(photo.id)
    const { error } = await supabase.from('animal_photos').delete().eq('id', photo.id)
    setDeletingId(null)
    if (error) { toast.error('Erro ao remover foto.'); return }
    onRemoved(photo.id)
    toast.success('Foto removida.')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe size={15} className="text-brand-600" />
        <p className="text-sm font-medium text-stone-700">Fotos públicas</p>
        <span className="text-xs text-stone-400">({photos.length} foto{photos.length !== 1 ? 's' : ''})</span>
      </div>
      <p className="text-xs text-stone-400 mb-3">Estas fotos aparecem no carrossel da página pública do animal. Selecione fotos em boas condições.</p>

      <div className="flex flex-wrap gap-3">
        {photos.map(photo => (
          <div key={photo.id} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
            <img
              src={cloudinaryUrl(photo.storage_path, 'w_200,h_200,c_fill,q_auto,f_auto')}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              onClick={() => handleDelete(photo)}
              disabled={deletingId === photo.id}
            >
              {deletingId === photo.id
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Trash2 size={18} className="text-white" />
              }
            </button>
          </div>
        ))}

        {/* Upload button */}
        <button
          className="w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-brand-600 shrink-0"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <Loader2 size={20} className="animate-spin" />
            : <><Plus size={20} /><span className="text-xs">Adicionar</span></>
          }
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
