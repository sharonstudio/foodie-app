import Papa from "papaparse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Place {
  name: string;
  city: string;
  neighborhood: string;
  mealIntents: string[];
  visited: boolean;
  rating: number | null;
  note: string;
  googleMapsUrl: string;
  photoUrl: string;
  toilet: boolean | null;  // null = not specified
  price: string;           // "$" | "$$" | "$$$" | ""
  space: string[];         // e.g. ["regular", "outside"]
  lat: number | null;
  lng: number | null;
}

// ---------------------------------------------------------------------------
// Emoji map for meal intents
// ---------------------------------------------------------------------------

const EMOJI: Record<string, string> = {
  coffee: "☕",
  "coffee & tea": "☕",
  "coffee & drinks": "☕",
  lunch: "🥗",
  dinner: "🍷",
  brunch: "🍳",
  sweets: "🍰",
  breakfast: "🥞",
  bar: "🍺",
  drinks: "🍸",
  bakery: "🥐",
  "fast food": "🍔",
};

export function intentLabel(intent: string): string {
  const key = intent.toLowerCase();
  const emoji = EMOJI[key] ?? "🍽️";
  // Title-case each word, preserve "&"
  const label = key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${emoji} ${label}`;
}

// Space display labels — keys must match lowercased Sheet values
export const SPACE_LABELS: Record<string, string> = {
  regular: "Sit-down",
  outside: "Outside seating",
  takeaway: "Takeaway",
  small: "Small & cosy",
  large: "Great for groups",
};

export function spaceLabel(space: string): string {
  return SPACE_LABELS[space.toLowerCase()] ?? space;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBool(val: string): boolean {
  return ["yes", "true"].includes(val?.trim().toLowerCase());
}

function parseToilet(val: string): boolean | null {
  if (!val?.trim()) return null;
  return parseBool(val);
}

/**
 * Convert a Google Drive share link to a direct image URL.
 * Passes any other URL through unchanged.
 */
function toDirectImageUrl(url: string): string {
  if (!url) return "";
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  return url;
}

/**
 * Follow a Google Maps short URL and extract the precise place coordinates.
 * Cached for 24 h — place coordinates never change.
 */
async function resolveCoordinates(
  url: string
): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      next: { revalidate: 86400 },
    });
    const finalUrl = res.url;
    const precise = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (precise) return { lat: parseFloat(precise[1]), lng: parseFloat(precise[2]) };
    const centre = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (centre) return { lat: parseFloat(centre[1]), lng: parseFloat(centre[2]) };
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch & parse
// ---------------------------------------------------------------------------

export async function getPlaces(): Promise<Place[]> {
  const url = process.env.SHEET_URL;
  if (!url) throw new Error("SHEET_URL environment variable is not set.");

  const res = await fetch(url, { next: { revalidate: 300 } });
  const csv = await res.text();

  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    // Trim whitespace and BOM from header names so column lookups are reliable
    transformHeader: (h) => h.trim().replace(/^﻿/, ""),
  });

  const active = data
    .filter((row) => parseBool(row.active))
    .map((row) => ({
      name: row.name?.trim() ?? "",
      city: row.city?.trim() ?? "",
      neighborhood: row.neighborhood?.trim() ?? "",
      mealIntents: (row.meal_intent ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      visited: parseBool(row.visited),
      rating: row.rating?.trim() ? parseFloat(row.rating) : null,
      note: row.note?.trim() ?? "",
      googleMapsUrl: row.google_maps_url?.trim() ?? "",
      photoUrl: toDirectImageUrl(row.photo_url?.trim() ?? ""),
      toilet: parseToilet(row.has_toilet ?? ""),
      price: row.price?.trim() ?? "",
      space: (row.space ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    }))
    .filter((p) => p.name);

  const coords = await Promise.all(
    active.map((p) => resolveCoordinates(p.googleMapsUrl))
  );

  return active.map((p, i) => ({
    ...p,
    lat: coords[i]?.lat ?? null,
    lng: coords[i]?.lng ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Derived lists for filters
// ---------------------------------------------------------------------------

export function getCities(places: Place[]): string[] {
  return [...new Set(places.map((p) => p.city).filter(Boolean))].sort();
}

export function getMealIntents(places: Place[]): string[] {
  const all = places.flatMap((p) => p.mealIntents);
  // Preferred order — these appear first if present in the data
  const preferred = ["coffee & tea", "coffee", "brunch", "lunch", "dinner"];
  const rest = [...new Set(all)].filter((i) => !preferred.includes(i)).sort();
  return [...preferred.filter((i) => all.includes(i)), ...rest];
}

export function getPrices(places: Place[]): string[] {
  const order = ["$", "$$", "$$$"];
  const found = [...new Set(places.map((p) => p.price).filter(Boolean))];
  return order.filter((p) => found.includes(p));
}

export function getSpaces(places: Place[]): string[] {
  const order = ["regular", "outside", "takeaway", "small", "large"];
  const found = [...new Set(places.flatMap((p) => p.space))];
  return order.filter((s) => found.includes(s));
}
