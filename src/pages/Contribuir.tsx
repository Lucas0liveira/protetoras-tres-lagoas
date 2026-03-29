import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Copy, Check, Mail, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import qrCode from '@/assets/qrcode-pix.png'

const PIX_KEY   = '29.022.433/0001-20'
const RAW_KEY   = '29022433000120'
const RECIPIENT = 'Associação Protetoras Três Lagoas'
const EMAIL     = 'protetorastl@gmail.com'

export default function Contribuir() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(RAW_KEY).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img
            src="/logo.png"
            alt="Protetoras TL"
            className="h-8 w-8 object-contain"
            onError={e => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              ;(e.currentTarget.nextElementSibling as HTMLElement).style.display = 'inline'
            }}
          />
          <PawPrint className="text-brand-600 hidden" size={22} />
          <span className="font-semibold text-stone-700">Protetoras Três Lagoas</span>
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link to="/">← Voltar</Link>
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 border border-brand-100 mb-4">
              <Heart size={26} className="text-brand-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">Faça uma doação via Pix</h1>
            <p className="text-stone-500 text-sm sm:text-base leading-relaxed">
              Sua contribuição ajuda diretamente no resgate, tratamento e cuidado dos animais.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* QR Code */}
            <div className="flex flex-col items-center px-6 pt-8 pb-6 border-b border-stone-100">
              <img
                src={qrCode}
                alt="QR Code Pix"
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
              />
              <p className="text-xs text-stone-400 mt-3">Aponte a câmera do celular para o QR Code</p>
            </div>

            {/* Details */}
            <div className="px-6 py-5 space-y-4">
              {/* Beneficiary */}
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">Beneficiário</p>
                <p className="font-semibold text-stone-800">{RECIPIENT}</p>
              </div>

              {/* Pix key with copy */}
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1">Chave Pix (CNPJ)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono text-stone-700 tracking-wider">
                    {PIX_KEY}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`shrink-0 gap-1.5 transition-colors ${copied ? 'border-brand-300 text-brand-700 bg-brand-50' : ''}`}
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>

              {/* Steps */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm text-stone-600">
                <p className="font-medium text-stone-700 mb-1">Como transferir:</p>
                <p>1. Abra o app do seu banco e vá em <strong>Pix</strong></p>
                <p>2. Escolha <strong>Pagar com QR Code</strong> ou <strong>Pix Copia e Cola</strong></p>
                <p>3. Cole a chave CNPJ ou escaneie o QR acima</p>
                <p>4. Confirme o beneficiário: <strong>{RECIPIENT}</strong></p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-400">
              <Mail size={13} className="shrink-0" />
              <span>Dúvidas? Fale conosco: <a href={`mailto:${EMAIL}`} className="underline hover:text-stone-600">{EMAIL}</a></span>
            </div>
          </div>

          {/* Back link */}
          <p className="text-center text-sm text-stone-400 mt-6">
            Prefere ajudar de outra forma?{' '}
            <Link to="/" className="text-brand-600 hover:underline font-medium">Ver mais opções</Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white px-6 py-4 text-center text-stone-400 text-xs">
        © {new Date().getFullYear()} Protetoras Três Lagoas
        {' · '}
        <Link to="/transparencia" className="hover:text-stone-600 underline">Transparência</Link>
      </footer>
    </div>
  )
}
