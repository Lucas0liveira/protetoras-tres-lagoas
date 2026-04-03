import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

// Fix default marker icons broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface AnimalPin {
  id: string
  name: string
  species: string
  rescue_lat: number
  rescue_lng: number
  coverUrl?: string
}

interface AnimalMapProps {
  pins: AnimalPin[]
}

const SPECIES_PT: Record<string, string> = { canino: 'Canino', felino: 'Felino', outro: 'Outro' }

export default function AnimalMap({ pins }: AnimalMapProps) {
  const center: [number, number] = [-20.7514, -51.7008]

  if (pins.length === 0) {
    return (
      <div className="h-[400px] md:h-[360px] rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-3 text-stone-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <p className="text-sm">Nenhum animal com localização cadastrada</p>
        <p className="text-xs text-stone-300">As coordenadas são preenchidas ao registrar um resgate</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-[400px] md:h-[360px] rounded-2xl z-0"
      style={{ width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(pin => (
        <Marker key={pin.id} position={[pin.rescue_lat, pin.rescue_lng]}>
          <Popup>
            <div className="text-sm min-w-[140px]">
              {pin.coverUrl && (
                <img src={pin.coverUrl} alt={pin.name}
                  className="w-full h-24 object-cover rounded mb-2" />
              )}
              <p className="font-semibold text-stone-800">{pin.name}</p>
              <p className="text-stone-500 text-xs mt-0.5">{SPECIES_PT[pin.species] ?? pin.species} · Precisa de resgate</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
