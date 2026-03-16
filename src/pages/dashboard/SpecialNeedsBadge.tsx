import { Heart } from 'lucide-react'

interface Props {
  description?: string | null
  /** 'ribbon' = corner ribbon on a card, 'badge' = inline badge for detail page */
  variant?: 'ribbon' | 'badge'
}

export function SpecialNeedsBadge({ description, variant = 'badge' }: Props) {
  if (variant === 'ribbon') {
    return (
      <div className="absolute top-0 right-0 z-10">
        {/* Corner ribbon */}
        <div className="relative w-20 h-20 overflow-hidden">
          <div className="absolute top-3 right-[-20px] w-24 bg-purple-500 text-white text-[10px] font-bold text-center py-1 rotate-45 shadow-sm leading-tight">
            Especial
          </div>
        </div>
        {/* Tooltip on hover */}
        {description && (
          <div className="absolute top-1 right-1 group">
            <div className="hidden group-hover:block absolute right-0 top-6 bg-white border border-purple-200 text-purple-700 text-xs rounded-lg px-3 py-2 shadow-lg w-48 z-20 leading-snug">
              {description}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <span
      title={description ?? undefined}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 cursor-default"
    >
      <Heart size={11} className="fill-purple-400 text-purple-400" />
      Animal especial
      {description && <span className="text-purple-500">· {description}</span>}
    </span>
  )
}