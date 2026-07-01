import { PatrolIncidentType } from '../enums/patrol-incident-type';
import { PatrolStatus } from '../enums/patrol-status';
import { RouteStatus } from '../enums/route-status';
import { UserRole } from '../enums/user-role';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MobileUser {
  id: string;
  fullName: string;
  role: UserRole;
  shopId?: string;
  username: string;
}

export interface MobileCapabilities {
  canRegisterRoutes: boolean;
  canRunPatrols: boolean;
}

export interface MobileMeResponse {
  user: MobileUser;
  capabilities: MobileCapabilities;
}

export interface CreatedUser {
  id: string;
  fullName: string;
  role: UserRole;
  shopId?: string;
  username: string;
  accessKey?: string;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  fullName: string;
  role: UserRole;
  username: string;
  shopId?: string;
  shopIds?: string[];
  shops?: Shop[];
  isActive: boolean;
  accessKey?: string;
  lastLoginAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Shop {
  id: string;
  name: string;
  address?: string;
  externalId?: string;
  timezone: string;
  isActive: boolean;
  routeStatus: RouteStatus;
  routeExpectedPoints: number;
  routeRegisteredPoints: number;
}

export interface NfcTag {
  id: string;
  uid: string;
  isActive: boolean;
}

export interface RoutePoint {
  id: string;
  shopId: string;
  nfcTagId?: string;
  nfcTag?: NfcTag;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PatrolEvent {
  id: string;
  patrolPointId: string;
  nfcUid: string;
  scannedAt: string;
  receivedAt?: string;
  isSuspicious?: boolean;
  suspicionReason?: string;
  lateSync?: boolean;
  pointDeactivatedAfterScan?: boolean;
}

export interface PatrolEmployee {
  id: string;
  fullName: string;
}

export interface PatrolShop {
  id: string;
  name: string;
  timezone?: string;
}

export interface Patrol {
  id: string;
  shopId: string;
  employeeId: string;
  employee?: PatrolEmployee;
  shop?: PatrolShop;
  status: PatrolStatus;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  dueAt?: string;
  notes?: string;
  completionReport?: string;
  cancellationReason?: string;
  totalPoints: number;
  scannedPoints: number;
  events?: PatrolEvent[];
  schedule?: PatrolSchedule;
}

export interface PatrolSchedule {
  id: string;
  shopId: string;
  name: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailablePatrolSchedule extends PatrolSchedule {
  isAvailable: boolean;
  dueAt?: string;
  nextStartAt?: string;
  nextWeekday?: number;
}

export interface IncidentPoint {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PatrolIncident {
  id: string;
  type: PatrolIncidentType;
  message: string;
  createdAt: string;
  patrolId: string;
  shopId: string;
  expectedSeconds?: number;
  actualSeconds?: number;
  shop?: { id: string; name: string };
  patrol?: { id: string; employee?: PatrolEmployee; shop?: PatrolShop };
  fromPatrolPoint?: IncidentPoint;
  toPatrolPoint?: IncidentPoint;
}

export interface RouteSetupState {
  shopId: string;
  expectedPoints: number;
  registeredPoints: number;
  nextSortOrder?: number;
  routeStatus: RouteStatus;
  points: RoutePoint[];
}
