import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'

// Fix default marker icons broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface CollectionPointPin {
  id: string
  name: string
  address: string
  neighborhood: string | null
  notes: string | null
  lat: number
  lng: number
}

interface AnimalMapProps {
  points: CollectionPointPin[]
}

function FitBounds({ points }: { points: CollectionPointPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, points])
  return null
}

export default function AnimalMap({ points }: AnimalMapProps) {
  const defaultCenter: [number, number] = [-20.7514, -51.7008]

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="h-[400px] md:h-[360px] rounded-2xl z-0"
      style={{ width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map(pt => (
        <Marker key={pt.id} position={[pt.lat, pt.lng]}>
          <Popup>
            <div className="text-sm min-w-[160px]">
              <p className="font-semibold text-stone-800">{pt.name}</p>
              <p className="text-stone-500 text-xs mt-0.5">
                {pt.address}{pt.neighborhood ? ` — ${pt.neighborhood}` : ''}
              </p>
              {pt.notes && <p className="text-stone-400 text-xs mt-1">{pt.notes}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
