import { Vehicle } from './types';

export function calculateRentalFare(durationMinutes: number, vehicleType?: string): number {
  const baseFare = vehicleType === 'E_MOTORBIKE' ? 5000 : 3000;
  const perMinute = vehicleType === 'E_MOTORBIKE' ? 800 : 500;
  return baseFare + Math.max(1, durationMinutes) * perMinute;
}

export function pickReturnBayCode(hubId: string, vehicles: Vehicle[]): string {
  const usedBays = new Set(
    vehicles
      .filter((v) => v.hubId === hubId && v.bayCode)
      .map((v) => v.bayCode as string),
  );
  const hubPrefix = hubId.replace('hub-', '').toUpperCase().slice(0, 3);
  for (let i = 1; i <= 40; i++) {
    const candidate = `D-${hubPrefix}-${String(i).padStart(2, '0')}`;
    if (!usedBays.has(candidate)) {
      return candidate;
    }
  }
  return `D-${hubPrefix}-40`;
}
