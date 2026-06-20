export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinRadius(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const distance = getDistanceInMeters(userLat, userLon, targetLat, targetLon);
  return distance <= radiusMeters;
}

/** Extra meters when GPS reports poor/unknown accuracy (common indoors). */
export const DEFAULT_GPS_BUFFER_M = 75;

export type SiteLike = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

/** Allowed distance = site radius + buffer from GPS accuracy. */
export function effectiveSiteRadius(
  siteRadiusMeters: number,
  accuracyMeters?: number | null
): number {
  const buffer =
    accuracyMeters != null && accuracyMeters > 0
      ? Math.min(Math.max(accuracyMeters * 0.8, 50), 500)
      : DEFAULT_GPS_BUFFER_M;
  return siteRadiusMeters + buffer;
}

export function findMatchingApprovedSite(
  userLat: number,
  userLon: number,
  sites: SiteLike[],
  accuracyMeters?: number | null
): { name: string; distance: number } | null {
  let best: { name: string; distance: number } | null = null;

  for (const site of sites) {
    const distance = getDistanceInMeters(
      userLat,
      userLon,
      site.latitude,
      site.longitude
    );
    const allowed = effectiveSiteRadius(site.radius, accuracyMeters);
    if (distance <= allowed) {
      if (!best || distance < best.distance) {
        best = { name: site.name, distance: Math.round(distance) };
      }
    }
  }

  return best;
}

export function findNearestApprovedSite(
  userLat: number,
  userLon: number,
  sites: SiteLike[]
): { name: string; distance: number; withinRadius: boolean } | null {
  let nearest: {
    name: string;
    distance: number;
    withinRadius: boolean;
  } | null = null;

  for (const site of sites) {
    const distance = getDistanceInMeters(
      userLat,
      userLon,
      site.latitude,
      site.longitude
    );
    const rounded = Math.round(distance);
    const withinRadius = distance <= site.radius;
    if (!nearest || distance < nearest.distance) {
      nearest = { name: site.name, distance: rounded, withinRadius };
    }
  }

  return nearest;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Take several GPS readings and keep the most accurate one. */
export async function getBestPosition(
  maxAttempts = 3
): Promise<GeolocationPosition> {
  let best: GeolocationPosition | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const position = await getCurrentPosition();
      if (
        !best ||
        position.coords.accuracy < best.coords.accuracy
      ) {
        best = position;
      }
      if (position.coords.accuracy <= 35) break;
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error("Could not read GPS location");
    }
    if (attempt < maxAttempts - 1) await sleep(900);
  }

  if (!best) {
    throw (
      lastError ??
      new Error(
        "Could not get GPS. Allow location access and try outdoors or near a window."
      )
    );
  }

  return best;
}
