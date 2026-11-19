import { ParkingBooking, Vehicle } from './types';

export function pickHighestBatteryVehicle(
  vehicles: Vehicle[],
  hubId: string,
  vehicleType?: string,
  minBatterySoc = 20,
): Vehicle | null {
  const candidates = vehicles.filter((v) => {
    if (v.hubId !== hubId || v.status !== 'AVAILABLE' || v.batterySoc < minBatterySoc) {
      return false;
    }
    if (vehicleType && vehicleType !== 'ALL' && v.type !== vehicleType) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.batterySoc - a.batterySoc);
  return candidates[0];
}

export function assignParkingBayCode(
  hubId: string,
  existingBookings: ParkingBooking[],
): string {
  const occupiedCodes = new Set(
    existingBookings
      .filter((b) => b.hubId === hubId && b.status === 'ACTIVE')
      .map((b) => b.bayCode),
  );
  const hubSuffix = hubId.replace('hub-', '').toUpperCase().slice(0, 3);
  for (let i = 1; i <= 30; i++) {
    const code = `P-${hubSuffix}-${String(i).padStart(2, '0')}`;
    if (!occupiedCodes.has(code)) {
      return code;
    }
  }
  return `P-${hubSuffix}-99`;
}
