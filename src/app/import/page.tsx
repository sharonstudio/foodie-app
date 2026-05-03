"use client";

import { useState } from "react";

interface ImportedPlace {
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
}

// Sheet columns order must match your Google Sheet exactly
const SHEET_COLUMNS = [
  "name", "city", "meal_intent", "visited", "rating",
  "note", "google_maps_url", "active", "toilet", "price", "space", "photo_url",
];

function toSheetRow(p: ImportedPlace): string {
  return [
    p.name,
    "",          // city — fill in manually
    "",          // meal_intent — fill in manually
    "",          // visited — fill in manually
    "",          // rating — fill in manually
    p.note,
    p.googleMapsUrl,
    "Yes",       // active — default on
    "",          // toilet
    "",          // price
    "",          // space
    "",          // photo_url
  ].join("\t");
}

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listName, setListName] = useState("");
  const [places, setPlaces] = useState<ImportedPlace[]>([]);
  const [copied, setCopied] = useState(false);

  async function handleImport() {
    setError("");
    setPlaces([]);
    setLoading(true);
    try {
      const res = await fetch("/api/import-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setListName(data.listName);
      setPlaces(data.places);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    const header = SHEET_COLUMNS.join("\t");
    const rows = places.map(toSheetRow).join("\n");
    navigator.clipboard.writeText(header + "\n" + rows).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            Import from Google Maps
          </h1>
          <p className="text-xs text-stone-400">Paste a public list link → copy rows into your Sheet</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">

        {/* URL input */}
        <div className="rounded-xl border border-stone-100 bg-white p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="maps-url" className="text-sm font-medium text-stone-700">
              Google Maps list URL
            </label>
            <p className="text-xs text-stone-400">
              Open your list in Google Maps → Share → Copy link. The list must be set to public.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              id="maps-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
            />
            <button
              onClick={handleImport}
              disabled={!url || loading}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Results */}
        {places.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-stone-900">
                  {listName} — {places.length} places
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Click Copy, then paste directly into your Google Sheet (Cmd+V).
                  Fill in the blank columns (city, meal type, visited, rating) afterwards.
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="shrink-0 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
              >
                {copied ? "✓ Copied!" : "Copy all rows"}
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-hidden rounded-xl border border-stone-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Note from Maps</th>
                    <th className="px-4 py-2">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {places.map((place, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-medium text-stone-900">{place.name}</td>
                      <td className="px-4 py-2.5 text-stone-500">{place.note || <span className="text-stone-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-stone-400 font-mono">
                        {place.lat && place.lng
                          ? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
                          : <span className="text-stone-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
