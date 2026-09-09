import type {
  LoginResponse as SharedLoginResponse,
  MobileCapabilities as SharedMobileCapabilities,
  MobileUser as SharedMobileUser,
  Shop as SharedShop,
} from '@patrol/shared';

export type {
  AdminUser,
  AvailablePatrolSchedule,
  CreatedUser,
  NfcTag,
  Paginated,
  Patrol,
  PatrolEmployee,
  PatrolEvent,
  PatrolIncident,
  PatrolRoute,
  PatrolSchedule,
  RoutePoint,
  RouteSetupState,
  Shop,
} from '@patrol/shared';

export type LoginResponse = SharedLoginResponse;
export type MobileCapabilities = SharedMobileCapabilities;
export type MobileUser = SharedMobileUser & {
  authorizationFullName?: string;
  authorizationId?: string;
  shop?: SharedShop;
  shopIds?: string[];
  shops?: SharedShop[];
};
export type MobileMeResponse = {
  capabilities: MobileCapabilities;
  user: MobileUser;
};
export type UniversalRouteSetterLoginResponse = LoginResponse & {
  authorizationFullName: string;
  authorizationId: string;
};
