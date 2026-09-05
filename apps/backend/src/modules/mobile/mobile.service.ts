import { Injectable } from '@nestjs/common';
import {
  BindRoutePointNfcDto,
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  MobileSchedulePlanDto,
  MobileSchedulePlanQueryDto,
  NfcWaitStateDto,
  RegisterDevicePushTokenDto,
  ReportMissedPointAttemptDto,
  StartRouteSetupDto,
  StartMobilePatrolDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { DevicePushTokenEntity } from '../notifications/entities/device-push-token.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolEventEntity } from '../patrols/entities/patrol-event.entity';
import { PatrolEntity } from '../patrols/entities/patrol.entity';
import { PatrolSchedulesService } from '../patrols/schedules/patrol-schedules.service';
import { PatrolEventRecordStatus, PatrolsService } from '../patrols/patrols.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { ShopsService } from '../shops/shops.service';

type MobileProfile = {
  capabilities: {
    canRegisterRoutes: boolean;
    canRunPatrols: boolean;
  };
  user: AuthenticatedUser;
};

type SyncPatrolEventResult = {
  localId: string;
  serverId: string;
  status: PatrolEventRecordStatus;
};

type SyncPatrolEventsResult = SyncPatrolEventsResultDto;

@Injectable()
export class MobileService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolSchedulesService: PatrolSchedulesService,
    private readonly patrolsService: PatrolsService,
    private readonly shopsService: ShopsService,
  ) {}

  getProfile(user: AuthenticatedUser): MobileProfile {
    return {
      capabilities: {
        canRegisterRoutes:
          user.role === 'admin' ||
          user.role === 'route_setter' ||
          user.role === 'local_route_setter',
        canRunPatrols: user.role === 'security_guard',
      },
      user,
    };
  }

  registerDevicePushToken(
    user: AuthenticatedUser,
    dto: RegisterDevicePushTokenDto,
  ): Promise<DevicePushTokenEntity> {
    return this.notificationsService.registerDevicePushToken(user.id, dto);
  }

  async startRouteSetup(
    user: AuthenticatedUser,
    shopId: string,
    dto: StartRouteSetupDto,
  ): ReturnType<ShopsService['startRouteSetup']> {
    assertRouteSetterCanUseShop(user, shopId);
    return this.shopsService.startRouteSetup(shopId, dto);
  }

  async getRouteSetup(
    user: AuthenticatedUser,
    shopId: string,
  ): ReturnType<ShopsService['getRouteSetup']> {
    assertRouteSetterCanUseShop(user, shopId);
    return this.shopsService.getRouteSetup(shopId);
  }

  async resetRouteSetup(
    user: AuthenticatedUser,
    shopId: string,
  ): ReturnType<ShopsService['resetRouteSetup']> {
    assertRouteSetterCanUseShop(user, shopId);
    return this.shopsService.resetRouteSetup(shopId);
  }

  getAssignedShops(user: AuthenticatedUser): ShopEntity[] {
    const shops = user.shops ?? (user.shop === undefined ? [] : [user.shop]);

    return shops.filter((shop) => shop.isActive);
  }

  getRoute(user: AuthenticatedUser): ReturnType<PatrolPointsService['findByShop']> {
    const shopId = requireUserShopId(user);

    return this.getRouteForShop(user, shopId);
  }

  getRouteForShop(
    user: AuthenticatedUser,
    shopId: string,
  ): ReturnType<PatrolPointsService['findByShop']> {
    assertUserCanUseShop(user, shopId);

    return this.patrolPointsService.findByShop(shopId);
  }

  async getSchedulePlan(
    user: AuthenticatedUser,
    query: MobileSchedulePlanQueryDto,
  ): Promise<MobileSchedulePlanDto> {
    const days = query.days ?? 7;

    if (query.shopId !== undefined) {
      assertUserCanUseShop(user, query.shopId);

      return this.patrolSchedulesService.getMobileSchedulePlanForShop(query.shopId, user, days);
    }

    const shops = this.getAssignedShops(user);
    const plans = await Promise.all(
      shops.map((shop) =>
        this.patrolSchedulesService.getMobileSchedulePlanForShop(shop.id, user, days),
      ),
    );
    const items = plans
      .flatMap((plan) => plan.items)
      .sort((left, right) => {
        const plannedStart = left.plannedStartAt.getTime() - right.plannedStartAt.getTime();
        if (plannedStart !== 0) {
          return plannedStart;
        }

        return left.shopName.localeCompare(right.shopName);
      });

    return {
      days: Math.min(Math.max(days, 1), 31),
      generatedAt: new Date(),
      items,
    };
  }

  getActivePatrol(user: AuthenticatedUser): Promise<PatrolEntity | null> {
    return this.patrolsService.findActiveByEmployee(user.id);
  }

  async getActivePatrolNfcWaitState(user: AuthenticatedUser): Promise<NfcWaitStateDto | null> {
    const patrol = await this.patrolsService.findActiveByEmployee(user.id);

    if (patrol === null) {
      return null;
    }

    return this.patrolsService.getNfcWaitState(patrol.id, user);
  }

  getPatrolNfcWaitState(user: AuthenticatedUser, patrolId: string): Promise<NfcWaitStateDto> {
    return this.patrolsService.getNfcWaitState(patrolId, user);
  }

  getAvailablePatrolSchedules(
    user: AuthenticatedUser,
  ): ReturnType<PatrolSchedulesService['findAvailableByShop']> {
    const shopId = requireUserShopId(user);

    return this.getAvailablePatrolSchedulesForShop(user, shopId);
  }

  getAvailablePatrolSchedulesForShop(
    user: AuthenticatedUser,
    shopId: string,
  ): ReturnType<PatrolSchedulesService['findAvailableByShop']> {
    assertUserCanUseShop(user, shopId);

    return this.patrolSchedulesService.findAvailableByShop(shopId, user);
  }

  async startPatrol(user: AuthenticatedUser, dto: StartMobilePatrolDto): Promise<PatrolEntity> {
    assertUserCanUseShop(user, dto.shopId);

    return this.patrolsService.start({
      employeeId: user.id,
      scheduleId: dto.scheduleId,
      shopId: dto.shopId,
    });
  }

  async recordPatrolEvent(
    user: AuthenticatedUser,
    patrolId: string,
    dto: CreatePatrolEventDto,
    ipAddress?: string,
  ): Promise<PatrolEventEntity> {
    const patrol = await this.patrolsService.findOne(patrolId);

    if (patrol.employeeId !== user.id) {
      throw new DomainValidationError(
        'MOBILE_PATROL_FORBIDDEN',
        'Patrol does not belong to current mobile user',
      );
    }

    return this.patrolsService.recordEvent(patrolId, dto, ipAddress);
  }

  async completePatrol(
    user: AuthenticatedUser,
    patrolId: string,
    dto: CompletePatrolDto,
  ): Promise<PatrolEntity> {
    await this.assertPatrolBelongsToUser(user, patrolId);

    return this.patrolsService.complete(patrolId, dto);
  }

  async cancelPatrol(
    user: AuthenticatedUser,
    patrolId: string,
    dto: CancelPatrolDto,
  ): Promise<PatrolEntity> {
    await this.assertPatrolBelongsToUser(user, patrolId);

    return this.patrolsService.cancel(patrolId, dto);
  }

  async reportMissedPointAttempt(
    user: AuthenticatedUser,
    patrolId: string,
    dto: ReportMissedPointAttemptDto,
  ): Promise<void> {
    await this.assertPatrolBelongsToUser(user, patrolId);

    await this.patrolsService.recordMissedPointAttempt(patrolId, dto);
  }

  async syncPatrolEvents(
    user: AuthenticatedUser,
    patrolId: string,
    dto: SyncPatrolEventsDto,
    ipAddress?: string,
  ): Promise<SyncPatrolEventsResult> {
    const patrol = await this.patrolsService.findOne(patrolId);

    if (patrol.employeeId !== user.id) {
      throw new DomainValidationError(
        'MOBILE_PATROL_FORBIDDEN',
        'Patrol does not belong to current mobile user',
      );
    }

    const items: SyncPatrolEventResult[] = [];

    for (const syncEvent of dto.events) {
      const result = await this.patrolsService.recordEventWithStatus(
        patrolId,
        syncEvent,
        ipAddress,
        {
          clientLocalId: syncEvent.localId,
        },
      );

      items.push({
        localId: syncEvent.localId,
        serverId: result.event.id,
        status: result.status,
      });
    }

    return { items };
  }

  async scanNextRoutePoint(
    user: AuthenticatedUser,
    shopId: string,
    dto: BindRoutePointNfcDto,
  ): ReturnType<ShopsService['bindRoutePointNfc']> {
    assertRouteSetterCanUseShop(user, shopId);
    const state = await this.shopsService.getRouteSetup(shopId);

    if (state.expectedPoints === 0) {
      throw new DomainValidationError(
        'ROUTE_SETUP_NOT_STARTED',
        'Route setup must be started before scanning NFC tags',
      );
    }

    if (state.nextSortOrder === undefined) {
      throw new DomainValidationError(
        'ROUTE_SETUP_ALREADY_COMPLETE',
        'All route points are already registered',
      );
    }

    return this.shopsService.bindRoutePointNfc(shopId, state.nextSortOrder, dto);
  }

  private async assertPatrolBelongsToUser(
    user: AuthenticatedUser,
    patrolId: string,
  ): Promise<PatrolEntity> {
    const patrol = await this.patrolsService.findOne(patrolId);

    if (patrol.employeeId !== user.id) {
      throw new DomainValidationError(
        'MOBILE_PATROL_FORBIDDEN',
        'Patrol does not belong to current mobile user',
      );
    }

    return patrol;
  }
}

function requireUserShopId(user: AuthenticatedUser): string {
  if (user.shopId === undefined) {
    throw new DomainValidationError(
      'MOBILE_USER_SHOP_REQUIRED',
      'Mobile user must be assigned to a shop',
    );
  }

  return user.shopId;
}

function assertUserCanUseShop(user: AuthenticatedUser, shopId: string): void {
  if (user.shopId === shopId || user.shopIds?.includes(shopId) === true) {
    return;
  }

  throw new DomainValidationError(
    'MOBILE_SHOP_FORBIDDEN',
    'Selected shop is not assigned to current mobile user',
  );
}

function assertRouteSetterCanUseShop(user: AuthenticatedUser, shopId: string): void {
  if (user.role === 'admin' || user.role === 'route_setter') return;
  if (
    user.role === 'local_route_setter' &&
    (user.shopId === shopId || user.shopIds?.includes(shopId) === true)
  ) {
    return;
  }

  throw new DomainValidationError(
    'MOBILE_ROUTE_SETUP_FORBIDDEN',
    'Route setter cannot configure this shop',
  );
}
