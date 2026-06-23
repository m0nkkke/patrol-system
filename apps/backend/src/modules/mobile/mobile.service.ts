import { Injectable } from '@nestjs/common';
import {
  BindRoutePointNfcDto,
  CreatePatrolEventDto,
  StartRouteSetupDto,
  StartMobilePatrolDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolEventEntity } from '../patrols/entities/patrol-event.entity';
import { PatrolEntity } from '../patrols/entities/patrol.entity';
import { PatrolSchedulesService } from '../patrols/patrol-schedules.service';
import { PatrolEventRecordStatus, PatrolsService } from '../patrols/patrols.service';
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
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolSchedulesService: PatrolSchedulesService,
    private readonly patrolsService: PatrolsService,
    private readonly shopsService: ShopsService,
  ) {}

  getProfile(user: AuthenticatedUser): MobileProfile {
    return {
      capabilities: {
        canRegisterRoutes: user.role === 'admin' || user.role === 'manager',
        canRunPatrols: user.role === 'employee',
      },
      user,
    };
  }

  startRouteSetup(shopId: string, dto: StartRouteSetupDto): ReturnType<ShopsService['startRouteSetup']> {
    return this.shopsService.startRouteSetup(shopId, dto);
  }

  getRouteSetup(shopId: string): ReturnType<ShopsService['getRouteSetup']> {
    return this.shopsService.getRouteSetup(shopId);
  }

  getRoute(user: AuthenticatedUser): ReturnType<PatrolPointsService['findByShop']> {
    const shopId = requireUserShopId(user);

    return this.patrolPointsService.findByShop(shopId);
  }

  getActivePatrol(user: AuthenticatedUser): Promise<PatrolEntity | null> {
    return this.patrolsService.findActiveByEmployee(user.id);
  }

  getAvailablePatrolSchedules(
    user: AuthenticatedUser,
  ): ReturnType<PatrolSchedulesService['findAvailableByShop']> {
    const shopId = requireUserShopId(user);

    return this.patrolSchedulesService.findAvailableByShop(shopId, user);
  }

  startPatrol(user: AuthenticatedUser, dto: StartMobilePatrolDto): Promise<PatrolEntity> {
    const shopId = requireUserShopId(user);

    return this.patrolsService.start({
      employeeId: user.id,
      scheduleId: dto.scheduleId,
      shopId,
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
      const result = await this.patrolsService.recordEventWithStatus(patrolId, syncEvent, ipAddress, {
        clientLocalId: syncEvent.localId,
      });

      items.push({
        localId: syncEvent.localId,
        serverId: result.event.id,
        status: result.status,
      });
    }

    return { items };
  }

  async scanNextRoutePoint(
    shopId: string,
    dto: BindRoutePointNfcDto,
  ): ReturnType<ShopsService['bindRoutePointNfc']> {
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
