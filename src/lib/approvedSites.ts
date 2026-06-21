import { prisma } from "@/lib/db";
import {
  findMatchingApprovedSite,
  findNearestApprovedSite,
} from "@/lib/geolocation";

/** Official Sewadal attendance centres (Google Maps links from admin). */
export const APPROVED_SITES_CONFIG = [
  {
    name: "Samta Nagar",
    mapUrl: "https://g.co/kgs/kPeVSo",
    latitude: 19.205802,
    longitude: 72.868881,
    radius: 5000,
  },
  {
    name: "Kranti Nagar Satsung Bhawan",
    mapUrl: "https://g.co/kgs/xSFBrJ",
    latitude: 19.199938,
    longitude: 72.861613,
    radius: 5000,
  },
] as const;

/** Always refresh map pins from config; keeps DB in sync after coordinate fixes. */
export async function ensureApprovedLocations() {
  for (const site of APPROVED_SITES_CONFIG) {
    await prisma.location.upsert({
      where: { name: site.name },
      create: {
        name: site.name,
        mapUrl: site.mapUrl,
        latitude: site.latitude,
        longitude: site.longitude,
        radius: site.radius,
        isActive: true,
      },
      update: {
        mapUrl: site.mapUrl,
        latitude: site.latitude,
        longitude: site.longitude,
        isActive: true,
      },
    });
    await prisma.location.updateMany({
      where: { name: site.name, radius: { lt: site.radius } },
      data: { radius: site.radius },
    });
  }
}

/** Force full re-sync including radius (admin settings). */
export async function syncApprovedLocations() {
  for (const site of APPROVED_SITES_CONFIG) {
    await prisma.location.upsert({
      where: { name: site.name },
      create: {
        name: site.name,
        mapUrl: site.mapUrl,
        latitude: site.latitude,
        longitude: site.longitude,
        radius: site.radius,
        isActive: true,
      },
      update: {
        mapUrl: site.mapUrl,
        latitude: site.latitude,
        longitude: site.longitude,
        radius: site.radius,
        isActive: true,
      },
    });
  }
}

export async function getActiveApprovedLocations() {
  return prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function resolveMemberLocation(
  latitude: number,
  longitude: number,
  accuracyMeters?: number | null
) {
  const sites = await getActiveApprovedLocations();

  // Day-based filtering in Asia/Kolkata timezone (IST)
  const now = new Date();
  
  // Create a date object adjusted to IST (UTC +5:30)
  const istOffset = 5 * 60 + 30; // total minutes for IST
  const utcOffset = now.getTimezoneOffset(); // in minutes (negative for UTC+xx)
  const istDate = new Date(now.getTime() + (istOffset + utcOffset) * 60 * 1000);
  
  const day = istDate.getDay();
  let allowedNames: string[] = [];

  // Tue (2), Thu (4), Sun (0) -> Kranti Nagar
  // Sat (6) -> Samta Nagar
  if (day === 0 || day === 2 || day === 4) {
    allowedNames = ["Kranti Nagar Satsung Bhawan"];
  } else if (day === 6) {
    allowedNames = ["Samta Nagar"];
  } else {
    // Mon (1), Wed (3), Fri (5) -> No centres active
    return null;
  }

  const filteredSites =
    allowedNames.length > 0
      ? sites.filter((s) => allowedNames.includes(s.name))
      : sites;

  return findMatchingApprovedSite(
    latitude,
    longitude,
    filteredSites,
    accuracyMeters
  );
}

export async function describeMemberLocationFailure(
  latitude: number,
  longitude: number,
  accuracyMeters?: number | null
) {
  return { error: "You are not at an approved location. Please go to the correct centre and try again." };
}
