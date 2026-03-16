import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, Trash2, ImageOff } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { uploadToCloudinary, cloudinaryUrl } from '@/lib/cloudinary'
import type { AnimalPhoto } from '@/types/database'
import { Button } from '@/components/ui/button'

interface Props {
  animalId:  string
  photo:     AnimalPhoto | null           // current cover photo
  onUpdated: (photo: AnimalPhoto | null) => void
}

export function AnimalPhotoUpload({ animalId, photo, onUpdated }: Props) {
  const inputRef                  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so same file can be re-selected after a delete
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.')
      return
    }

    setUploading(true)
    try {
      // 1 — Upload to Cloudinary (resized client-side)
      const result = await uploadToCloudinary(file, `protetoras/${animalId}`)

      // 2 — If there's already a cover photo, unset it first
      if (photo) {
        await supabase.from('animal_photos')
          .update({ is_cover: false })
          .eq('id', photo.id)
      }

      // 3 — Save URL in Supabase
      const { data, error } = await supabase
        .from('animal_photos')
        .insert({
          animal_id:    animalId,
          storage_path: result.secure_url,
          is_cover:     true,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      toast.success('Foto atualizada!')
      onUpdated(data as AnimalPhoto)
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message ?? 'tente novamente'))
    } finally {
      setUploading(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!photo) return
    if (!confirm('Remover a foto de perfil?')) return
    setDeleting(true)
    const { error } = await supabase
      .from('animal_photos')
      .delete()
      .eq('id', photo.id)
    setDeleting(false)
    if (error) { toast.error('Erro ao remover foto.'); return }
    toast.success('Foto removida.')
    onUpdated(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const thumbUrl = photo
    ? cloudinaryUrl(photo.storage_path, 'w_320,h_320,c_fill,q_auto,f_auto')
    : null

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Photo or placeholder */}
      <div
        className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-100 group cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="Foto do animal" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-stone-300">
            <ImageOff size={28} />
            <span className="text-xs">Sem foto</span>
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && !deleting && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={22} className="text-white" />
          </div>
        )}

        {/* Loading overlay */}
        {(uploading || deleting) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-7"
          disabled={uploading || deleting}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={12} />
          {photo ? 'Trocar foto' : 'Adicionar foto'}
        </Button>

        {photo && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs h-7 text-red-400 hover:text-red-600"
            disabled={deleting || uploading}
            onClick={handleDelete}
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}