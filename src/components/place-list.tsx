"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Place,
  getMealIntents,
  getCities,
  getPrices,
  getSpaces,
  intentLabel,
  spaceLabel,
} from "@/lib/places";

const MapView = dynamic(() => import("./map-view"), { ssr: false });

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlaceList({ places }: { places: Place[] }) {
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [activePrice, setActivePrice] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  const cities = getCities(places);
  const mealIntents = getMealIntents(places);
  const prices = getPrices(places);
  const spaces = getSpaces(places);

  const filtered = places.filter((p) => {
    if (activeCity && p.city !== activeCity) return false;
    if (activeMeal && !p.mealIntents.includes(activeMeal)) return false;
    if (activePrice && p.price !== activePrice) return false;
    if (activeSpace && p.space.toLowerCase() !== activeSpace) return false;
    return true;
  });

  const visited = [...filtered.filter((p) => p.visited)].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  );
  const unvisited = filtered.filter((p) => !p.visited);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* Filters + view toggle                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">

          {/* City */}
          {cities.length > 1 && (
            <FilterRow label="City">
              {cities.map((city) => (
                <Chip
                  key={city}
                  label={city}
                  active={activeCity === city}
                  onClick={() => setActiveCity(activeCity === city ? null : city)}
                />
              ))}
            </FilterRow>
          )}

          {/* Meal intent */}
          <FilterRow label="I'm looking for">
            {mealIntents.map((intent) => (
              <Chip
                key={intent}
                label={intentLabel(intent)}
                active={activeMeal === intent}
                onClick={() => setActiveMeal(activeMeal === intent ? null : intent)}
              />
            ))}
          </FilterRow>

          {/* Price */}
          {prices.length > 0 && (
            <FilterRow label="Price">
              {prices.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  active={activePrice === p}
                  onClick={() => setActivePrice(activePrice === p ? null : p)}
                />
              ))}
            </FilterRow>
          )}

          {/* Space */}
          {spaces.length > 0 && (
            <FilterRow label="Space">
              {spaces.map((s) => (
                <Chip
                  key={s}
                  label={spaceLabel(s)}
                  active={activeSpace === s}
                  onClick={() => setActiveSpace(activeSpace === s ? null : s)}
                />
              ))}
            </FilterRow>
          )}
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
                view === v ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800"
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
                ✓ Been here
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
                🧡 Bucket list
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
// Filter row + chip helpers
// ---------------------------------------------------------------------------

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-stone-400">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Place card
// ---------------------------------------------------------------------------

function PlaceCard({ place }: { place: Place }) {
  return (
    <article className="overflow-hidden rounded-xl border border-stone-100 bg-white transition-colors hover:border-stone-300">
      {/* Photo */}
      {place.visited && place.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.photoUrl}
          alt={`Photo of ${place.name}`}
          className="h-48 w-full object-cover"
        />
      )}

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          {/* Name + location */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="font-semibold text-stone-900">{place.name}</h4>
            {place.neighborhood && (
              <span className="text-xs text-stone-400">· {place.neighborhood}</span>
            )}
            {place.city && (
              <span className="text-xs text-stone-300">· {place.city}</span>
            )}
          </div>

          {/* Meta pills: price · space · toilet */}
          {(place.price || place.space || place.toilet !== null) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {place.price && (
                <span className="rounded-full bg-stone-50 border border-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {place.price}
                </span>
              )}
              {place.space && (
                <span className="rounded-full bg-stone-50 border border-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  {spaceLabel(place.space)}
                </span>
              )}
              {place.toilet === true && (
                <span className="rounded-full bg-stone-50 border border-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  🚻 Toilet
                </span>
              )}
              {place.toilet === false && (
                <span className="rounded-full bg-stone-50 border border-stone-100 px-2 py-0.5 text-xs text-stone-400 line-through">
                  No toilet
                </span>
              )}
            </div>
          )}

          {/* Note */}
          {place.note && (
            <p className="mt-2 text-sm leading-snug text-stone-500">{place.note}</p>
          )}

          {/* Maps link */}
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

        {/* Rating / status badge */}
        <div className="shrink-0 text-right">
          {place.visited ? (
            place.rating !== null ? (
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-stone-900">{place.rating}</span>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">Beli</span>
              </div>
            ) : (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
                Visited
              </span>
            )
          ) : (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-orange-400">
              Bucket list
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
