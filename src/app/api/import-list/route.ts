import { NextRequest, NextResponse } from "next/server";
import * as https from "https";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.google.com/maps",
};

// ---------------------------------------------------------------------------
// Get the first redirect Location header using Node's https module.
// fetch() follows all redirects and loses intermediate URLs;
// Google's short URLs do a client-side redirect that fetch never sees.
// Using curl's User-Agent triggers a proper HTTP 302 from Google.
// ---------------------------------------------------------------------------

function getRedirectLocation(rawUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const u = new URL(rawUrl);
      const req = https.get(
        { hostname: u.hostname, path: u.pathname + u.search, headers: { "User-Agent": "curl/7.79.1" } },
        (res) => { resolve(res.headers.location ?? null); res.destroy(); }
      );
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      req.on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------------------
// Extract list ID from any Google Maps list URL
// ---------------------------------------------------------------------------

async function extractListId(inputUrl: string): Promise<string | null> {
  // Already a full placelists URL: /placelists/list/LIST_ID
  const directMatch = inputUrl.match(/placelists\/list\/([a-zA-Z0-9_-]+)/);
  if (directMatch) return directMatch[1];

  // Already a @/data= URL with the list ID embedded
  const dataMatch = inputUrl.match(/!2s([a-zA-Z0-9_+/=-]{20,})!3e3/);
  if (dataMatch) return dataMatch[1];

  // Short URL (maps.app.goo.gl) — get the first redirect Location header
  const location = await getRedirectLocation(inputUrl);
  if (location) {
    const locationMatch = location.match(/!2s([a-zA-Z0-9_+/=-]{20,})!3e3/);
    if (locationMatch) return locationMatch[1];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Fetch and parse the list
// ---------------------------------------------------------------------------

interface ImportedPlace {
  name: string;
  city: string;
  note: string;
  lat: number | null;
  lng: number | null;
  googleMapsUrl: string;
}

// ---------------------------------------------------------------------------
// Reverse geocode using Nominatim — one call per unique city bucket (~50 km)
// ---------------------------------------------------------------------------

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // accept-language=en forces English names; zoom=10 targets city level
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FoodieRunsTheWorld/1.0" },
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const addr = data.address ?? {};
    // city > municipality > town — intentionally stop here, never go to village/suburb
    return addr.city ?? addr.municipality ?? addr.town ?? "";
  } catch {
    return "";
  }
}

// Round to 0.5° (~55 km) — just for grouping; we geocode actual place coordinates, not the bucket centre
function bucket(lat: number, lng: number) {
  return `${Math.round(lat * 2) / 2},${Math.round(lng * 2) / 2}`;
}

async function fetchList(
  listId: string
): Promise<{ listName: string; places: ImportedPlace[] }> {
  const pb = encodeURIComponent(
    `!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!6m3!1sjKL3aa_8GovywPAPvdqC2As!15i204459!28e2!16b1`
  );
  const url = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=en&pb=${pb}`;

  const res = await fetch(url, { headers: FETCH_HEADERS, cache: "no-store" });
  const text = await res.text();

  const json = text.replace(/^\)\]\}'\n/, "");
  const data = JSON.parse(json);

  const inner = data[0];
  const listName: string = inner[4] ?? "Imported list";
  const rawPlaces: unknown[] = inner[8] ?? [];

  const parsed = rawPlaces
    .map((p: unknown) => {
      const place = p as unknown[];
      const meta = place[1] as unknown[];
      const name = place[2] as string;
      const note = (place[3] as string) ?? "";
      const coords = meta?.[5] as unknown[];
      const lat = (coords?.[2] as number) ?? null;
      const lng = (coords?.[3] as number) ?? null;
      const mapsUrl = lat && lng
        ? `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
        : "";
      return { name, note, lat, lng, googleMapsUrl: mapsUrl };
    })
    .filter((p) => p.name);

  // Reverse geocode — one Nominatim call per unique ~55 km bucket.
  // Use the FIRST actual place's coordinates in each bucket, not the bucket centre.
  const bucketCache = new Map<string, string>();
  const bucketToCoord = new Map<string, { lat: number; lng: number }>();
  for (const p of parsed) {
    if (p.lat && p.lng) {
      const b = bucket(p.lat, p.lng);
      if (!bucketToCoord.has(b)) bucketToCoord.set(b, { lat: p.lat, lng: p.lng });
    }
  }
  await Promise.all(
    [...bucketToCoord.entries()].map(async ([b, { lat, lng }]) => {
      bucketCache.set(b, await reverseGeocode(lat, lng));
    })
  );

  const places: ImportedPlace[] = parsed.map((p) => ({
    ...p,
    city: p.lat && p.lng ? (bucketCache.get(bucket(p.lat, p.lng)) ?? "") : "",
  }));

  return { listName, places };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const listId = await extractListId(url);
    if (!listId) {
      return NextResponse.json(
        { error: "Could not find a list ID in that URL. Make sure the list is public." },
        { status: 400 }
      );
    }

    const { listName, places } = await fetchList(listId);
    return NextResponse.json({ listName, places });
  } catch (e) {
    console.error("Import error:", e);
    return NextResponse.json(
      { error: `Import failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
