import { Injectable } from '@nestjs/common';
import { PatrolIncidentType, PatrolReportStatus, PatrolReportType } from '@patrol/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolReportEntity } from '../entities/patrol-report.entity';

type OverviewStatsRaw = {
  cancelledPatrols: string | number;
  completedPatrols: string | number;
  incidentCount: string | number;
  overduePatrols: string | number;
  totalPatrols: string | number;
};

type ReportSummaryRaw = {
  count: string | number;
  reportType: PatrolReportType;
  status: PatrolReportStatus;
};

@Injectable()
export class ControlShopOverviewRepository {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(PatrolEntity)
    private readonly patrols: Repository<PatrolEntity>,
    @InjectRepository(PatrolIncidentEntity)
    private readonly incidents: Repository<PatrolIncidentEntity>,
    @InjectRepository(PatrolReportEntity)
    private readonly reports: Repository<PatrolReportEntity>,
  ) {}

  findShopById(shopId: string): Promise<ShopEntity | null> {
    return this.shops.findOne({ relations: { region: true }, where: { id: shopId } });
  }

  findAssignedStaff(shopId: string): Promise<UserEntity[]> {
    return this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.shop', 'primaryShop')
      .leftJoinAndSelect('user.shops', 'assignedShop')
      .where('user.is_active = TRUE')
      .andWhere('(user.shop_id = :shopId OR assignedShop.id = :shopId)', { shopId })
      .orderBy('user.role', 'ASC')
      .addOrderBy('user.fullName', 'ASC')
      .getMany();
  }

  findRecentPatrols(shopId: string, limit: number): Promise<PatrolEntity[]> {
    return this.patrols
      .createQueryBuilder('patrol')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.route', 'route')
      .leftJoinAndSelect('patrol.schedule', 'schedule')
      .where('patrol.shop_id = :shopId', { shopId })
      .orderBy('patrol.startedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('patrol.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  findRecentIncidents(shopId: string, limit: number): Promise<PatrolIncidentEntity[]> {
    return this.incidents
      .createQueryBuilder('incident')
      .innerJoinAndSelect('incident.patrol', 'patrol')
      .leftJoinAndSelect('incident.patrolEvent', 'event')
      .leftJoinAndSelect('incident.fromPatrolPoint', 'fromPoint')
      .leftJoinAndSelect('incident.toPatrolPoint', 'toPoint')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.route', 'route')
      .leftJoinAndSelect('patrol.schedule', 'schedule')
      .where('incident.shop_id = :shopId', { shopId })
      .orderBy('incident.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  findRecentReports(shopId: string, limit: number): Promise<PatrolReportEntity[]> {
    return this.reports
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.employee', 'employee')
      .leftJoinAndSelect('report.files', 'reportFile')
      .leftJoinAndSelect('reportFile.file', 'file')
      .where('report.shop_id = :shopId', { shopId })
      .orderBy('report.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getOverviewStats(shopId: string, from: Date): Promise<OverviewStatsRaw> {
    const [raw] = await this.patrols.query<OverviewStatsRaw[]>(
      `
      SELECT
        COUNT(*) AS "totalPatrols",
        COUNT(*) FILTER (WHERE status = 'completed') AS "completedPatrols",
        COUNT(*) FILTER (WHERE status = 'overdue') AS "overduePatrols",
        COUNT(*) FILTER (WHERE status = 'cancelled') AS "cancelledPatrols",
        (
          SELECT COUNT(*)
          FROM patrol_incidents incident
          WHERE incident.shop_id = $1
            AND incident.created_at >= $2
        ) AS "incidentCount"
      FROM patrols
      WHERE shop_id = $1
        AND created_at >= $2
      `,
      [shopId, from],
    );

    return raw ?? {
      cancelledPatrols: 0,
      completedPatrols: 0,
      incidentCount: 0,
      overduePatrols: 0,
      totalPatrols: 0,
    };
  }

  getReportSummary(shopId: string, from: Date): Promise<ReportSummaryRaw[]> {
    return this.reports.query<ReportSummaryRaw[]>(
      `
      SELECT
        report_type AS "reportType",
        status,
        COUNT(*) AS count
      FROM patrol_reports
      WHERE shop_id = $1
        AND created_at >= $2
      GROUP BY report_type, status
      ORDER BY report_type ASC, status ASC
      `,
      [shopId, from],
    );
  }
}

export function isCriticalIncidentType(type: PatrolIncidentType): boolean {
  return (
    type === PatrolIncidentType.MISSED_POINT ||
    type === PatrolIncidentType.PATROL_OVERDUE ||
    type === PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST
  );
}
