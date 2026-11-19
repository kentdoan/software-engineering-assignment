import { Hub } from './types';

/**
 * Calculates great-circle distance in kilometers between two GPS coordinates using Haversine formula.
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 100) / 100;
}

/**
 * Estimates trip distance between origin and destination hubs (minimum 1.2 km for same-hub loops).
 */
export function estimateTripDistanceKm(originHub: Hub | undefined, destHub: Hub | undefined): number {
  if (!originHub || !destHub || originHub.id === destHub.id) {
    return 1.2;
  }
  const dist = calculateHaversineKm(
    originHub.latitude,
    originHub.longitude,
    destHub.latitude,
    destHub.longitude,
  );
  return Math.round(Math.max(1.2, dist) * 10) / 10;
}
