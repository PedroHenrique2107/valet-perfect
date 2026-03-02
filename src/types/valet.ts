// ValetTrack Type Definitions

export type VehicleStatus = 'parked' | 'requested' | 'in_transit' | 'delivered' | 'reserved';
export type ContractType = "hourly" | "daily" | "monthly" | "agreement";

export type AttendantStatus = "online" | "offline" | "lunch" | "dinner" | "commuting";

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'monthly';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  year: number;
  status: VehicleStatus;
  entryTime: Date;
  requestedAt?: Date;
  exitTime?: Date;
  spotId: string;
  attendantId: string;
  clientName: string;
  clientPhone: string;
  observations?: string;
  photos?: string[];
  fuelLevel?: number;
  mileage?: number;
  contractType?: ContractType;
  unitName?: string;
  spotHistory?: SpotHistoryEntry[];
  inspection?: VehicleInspection;
  pricing?: VehiclePricingSnapshot;
  prepaidPaid?: boolean;
}

export interface SpotHistoryEntry {
  spotId: string;
  changedAt: Date;
  changedBy: string;
}

export interface VehicleInspection {
  leftSide: boolean;
  rightSide: boolean;
  frontBumper: boolean;
  rearBumper: boolean;
  wheels: boolean;
  mirrors: boolean;
  roof: boolean;
  windows: boolean;
  interior: boolean;
  completedAt: Date;
}

export interface VehiclePricingSnapshot {
  tableName: string;
  dailyRate: number;
  agreementLabel?: string;
  courtesyApplied?: string;
}

export interface Attendant {
  id: string;
  name: string;
  photo: string;
  status: AttendantStatus;
  phone: string;
  vehiclesHandled: number;
  vehiclesHandledToday: number;
  avgServiceTime: number; // in seconds
  rating: number;
  currentVehicleId?: string;
  shift: 'morning' | 'afternoon' | 'night';
  isOnline: boolean;
  parkingId: string;
  parkingName: string;
  workPeriodStart: string;
  workPeriodEnd: string;
  maxWorkHours: number;
  startedAt?: Date;
  accumulatedWorkMinutes: number;
}

export interface ParkingSpot {
  id: string;
  code: string;
  floor: number;
  section: string;
  type: 'regular' | 'vip' | 'accessible' | 'electric' | 'motorcycle';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  vehicleId?: string;
}

export interface Transaction {
  id: string;
  vehicleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
  receiptNumber: string;
  duration: number; // in minutes
}

export interface DashboardStats {
  totalVehicles: number;
  availableSpots: number;
  occupancyRate: number;
  todayRevenue: number;
  avgStayDuration: number;
  activeAttendants: number;
  vehiclesWaiting: number;
  avgWaitTime: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
}

export interface OccupancyData {
  hour: string;
  occupancy: number;
}

export interface Activity {
  id: string;
  type: "entry" | "exit" | "payment" | "alert" | "request";
  title: string;
  description: string;
  time: string;
  plate?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  vehicles: string[];
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  totalVisits: number;
  totalSpent: number;
  cashback: number;
  createdAt: Date;
}
