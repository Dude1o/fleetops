import { DriverStatus } from '../../../generated/prisma/client';

export const DRIVER_STATUS_TRANSITIONS: Record<DriverStatus, DriverStatus[]> = {
  [DriverStatus.OFFLINE]: [DriverStatus.AVAILABLE],
  [DriverStatus.AVAILABLE]: [DriverStatus.BUSY, DriverStatus.OFFLINE],
  [DriverStatus.BUSY]: [DriverStatus.AVAILABLE, DriverStatus.OFFLINE],
  [DriverStatus.SUSPENDED]: [],
};
