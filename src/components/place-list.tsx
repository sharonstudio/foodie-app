"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Place, getMealIntents, getCities, intentLabel } from "@/lib/places";

// Load map only on the client — Leaflet requires window
const MapView = dynamic(() => import("./map-view"), { ssr: false });

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlaceList({ places }: { places: Place[] }) {
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const cities = getCities(places);
  const mealIntents = getMealIntents(places);

  const filtered = places.filter((p) => {
    const cityMatch = !activeCity || p.city === activeCity;
    const mealMatch = !activeMeal || p.mealIntents.includes(activeMeal);
    return cityMatch && mealMatch;
  });

  const visited = [...filtered.filter((p) => p.visited)].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );
  const unvisited = filtered.filter((p) => !p.visited);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Filters + view toggle row                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {/* City chips — only when multiple cities */}
          {cities.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by city">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setActiveCity(activeCity === city ? null : city)}
                  aria-pressed={activeCity === city}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    activeCity === city
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}

          {/* Meal intent chips */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by meal type">
            {mealIntents.map((intent) => (
              <button
                key={intent}
                onClick={() => setActiveMeal(activeMeal === intent ? null : intent)}
                aria-pressed={activeMeal === intent}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  activeMeal === intent
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                {intentLabel(intent)}
              </button>
            ))}
          </div>
        </div>

        {/* List / Map toggle */}
        <div
          className="flex shrink-0 overflow-hidden rounded-full border border-stone-200 bg-white text-sm font-medium"
          role="group"
          aria-label="Switch view"
        >
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-4 py-1.5 capitalize transition-colors ${
                view === v
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {v === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Map view                                                             */}
      {/* ------------------------------------------------------------------ */}
      {view === "map" && <MapView places={filtered} />}

      {/* ------------------------------------------------------------------ */}
      {/* List view                                                            */}
      {/* ------------------------------------------------------------------ */}
      {view === "list" && (
        <>
          {visited.length > 0 && (
            <section aria-labelledby="visited-heading" className="space-y-3">
              <h3
                id="visited-heading"
                className="text-xs font-semibold uppercase tracking-widest text-stone-400"
              >
                Sharon&apos;s been here
              </h3>
              <ul className="space-y-2">
                {visited.map((place) => (
                  <li key={place.name}>
                    <PlaceCard place={place} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unvisited.length > 0 && (
            <section aria-labelledby="list-heading" className="space-y-3">
              <h3
                id="list-heading"
                className="text-xs font-semibold uppercase tracking-widest text-stone-400"
              >
                Also on the list
              </h3>
              <ul className="space-y-2">
                {unvisited.map((place) => (
                  <li key={place.name}>
                    <PlaceCard place={place} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filtered.length === 0 && (
            <p className="pt-8 text-center text-sm text-stone-400">
              Nothing here for that filter yet — check back soon.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Place card
// ---------------------------------------------------------------------------

function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="rounded-xl border border-stone-100 bg-white p-4 transition-colors hover:border-stone-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="font-semibold text-stone-900">{place.name}</h4>
            {place.neighborhood && (
              <span className="text-xs text-stone-400">· {place.neighborhood}</span>
            )}
            {place.city && (
              <span className="text-xs text-stone-300">· {place.city}</span>
            )}
          </div>
          {place.note && (
            <p className="mt-1 text-sm leading-snug text-stone-500">{place.note}</p>
          )}
          {place.googleMapsUrl && (
            <a
              href={place.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-stone-400 underline-offset-2 hover:text-stone-600 hover:underline"
            >
              Open in Maps →
            </a>
          )}
        </div>

        <div className="shrink-0 text-right">
          {place.visited && place.rating !== null ? (
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-stone-900">{place.rating}</span>
              <span className="text-[10px] uppercase tracking-wide text-stone-400">Beli</span>
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-stone-300">
              Not tried yet
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
