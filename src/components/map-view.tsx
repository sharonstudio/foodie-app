"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Place } from "@/lib/places";

// ---------------------------------------------------------------------------
// Custom pin icon — avoids the broken default Leaflet marker in bundlers
// ---------------------------------------------------------------------------

function createPin(visited: boolean) {
  const bg = visited ? "#1c1917" : "#a8a29e"; // stone-900 : stone-400
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${bg};border:2.5px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
  });
}

// ---------------------------------------------------------------------------
// Auto-fit map to visible pins
// ---------------------------------------------------------------------------

function FitBounds({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = places
      .filter((p): p is Place & { lat: number; lng: number } =>
        p.lat !== null && p.lng !== null
      )
      .map((p) => [p.lat, p.lng] as [number, number]);

    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 15);
    } else {
      map.fitBounds(coords, { padding: [48, 48] });
    }
  }, [map, places]);
  return null;
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------

interface MapViewProps {
  places: Place[];
}

export default function MapView({ places }: MapViewProps) {
  const mappable = places.filter((p) => p.lat !== null && p.lng !== null);

  if (mappable.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-stone-100 bg-white text-sm text-stone-400">
        No places with a Maps link to show yet.
      </div>
    );
  }

  // Default centre: first mappable place
  const defaultCenter: [number, number] = [mappable[0].lat!, mappable[0].lng!];

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100" style={{ height: "60vh" }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds places={mappable} />
        {mappable.map((place) => (
          <Marker
            key={place.name}
            position={[place.lat!, place.lng!]}
            icon={createPin(place.visited)}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1">
                <p className="font-semibold text-stone-900">{place.name}</p>
                {place.visited && place.rating !== null && (
                  <p className="text-xs text-stone-500">
                    ★ {place.rating} <span className="text-stone-400">Beli</span>
                  </p>
                )}
                {place.note && (
                  <p className="text-xs text-stone-500">{place.note}</p>
                )}
                {place.googleMapsUrl && (
                  <a
                    href={place.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block pt-1 text-xs font-medium text-stone-700 hover:underline"
                  >
                    Open in Maps →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
