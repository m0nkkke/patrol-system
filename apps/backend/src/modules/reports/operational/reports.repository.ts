import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindPatrolReportsDto,
  PatrolPeriod,
  PatrolReportStatus,
  PatrolReportType,
} from '@patrol/shared';
import { Repository } from 'typeorm';

import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { PatrolReportFileEntity } from '../entities/patrol-report-file.entity';
import { PatrolReportEntity } from '../entities/patrol-report.entity';

type CreatePatrolReportRecord = {
  comment?: string;
  employeeId: string;
  fields: Record<string, unknown>;
  patrolId?: string;
  period?: PatrolPeriod;
  reportType: PatrolReportType;
  routeId?: string;
  scheduleId?: string;
  shopId: string;
};

type UpdatePatrolReportRecord = {
  cancellationReason?: string;
  cancelledAt?: Date;
  comment?: string;
  fields?: Record<string, unknown>;
  status?: PatrolReportStatus;
  submittedAt?: Date;
};

@Injectable()
export class ReportsRepository {
  constructor(
    @InjectRepository(PatrolReportEntity)
    private readonly reports: Repository<PatrolReportEntity>,
    @InjectRepository(PatrolReportFileEntity)
    private readonly reportFiles: Repository<PatrolReportFileEntity>,
  ) {}

  create(data: CreatePatrolReportRecord): Promise<PatrolReportEntity> {
    return this.reports.save(this.reports.create(data));
  }

  findById(id: string): Promise<PatrolReportEntity | null> {
    return this.reports.findOne({
      relations: {
        employee: true,
        files: { file: true },
        patrol: true,
        route: true,
        schedule: true,
        shop: true,
      },
      where: { id },
    });
  }

  async update(id: string, data: UpdatePatrolReportRecord): Promise<void> {
    await this.reports.save({ id, ...data });
  }

  async attachFile(reportId: string, file: FileAssetEntity, kind: string): Promise<PatrolReportFileEntity> {
    return this.reportFiles.save(
      this.reportFiles.create({
        file,
        fileId: file.id,
        kind,
        reportId,
      }),
    );
  }

  findMany(
    query: FindPatrolReportsDto,
    allowedShopIds?: string[],
    options: { paginate: boolean } = { paginate: true },
  ): Promise<[PatrolReportEntity[], number]> {
    const builder = this.reports
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.shop', 'shop')
      .leftJoinAndSelect('report.employee', 'employee')
      .leftJoinAndSelect('report.files', 'reportFile')
      .leftJoinAndSelect('reportFile.file', 'file');

    if (allowedShopIds !== undefined) {
      if (allowedShopIds.length === 0) {
        builder.andWhere('1 = 0');
      } else {
        builder.andWhere('report.shop_id IN (:...allowedShopIds)', { allowedShopIds });
      }
    }

    if (query.shopId !== undefined) {
      builder.andWhere('report.shop_id = :shopId', { shopId: query.shopId });
    }

    if (query.employeeId !== undefined) {
      builder.andWhere('report.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.patrolId !== undefined) {
      builder.andWhere('report.patrol_id = :patrolId', { patrolId: query.patrolId });
    }

    if (query.reportType !== undefined) {
      builder.andWhere('report.report_type = :reportType', { reportType: query.reportType });
    }

    if (query.status !== undefined) {
      builder.andWhere('report.status = :status', { status: query.status });
    }

    if (query.period !== undefined) {
      builder.andWhere('report.period = :period', { period: query.period });
    }

    if (query.from !== undefined) {
      builder.andWhere('report.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to !== undefined) {
      builder.andWhere('report.created_at <= :to', { to: new Date(query.to) });
    }

    if (query.search !== undefined) {
      builder.andWhere(
        '(report.comment ILIKE :search OR employee.full_name ILIKE :search OR shop.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const sort = query.sort ?? 'createdAt:desc';
    const [field, direction] = sort.split(':') as ['createdAt' | 'submittedAt', 'asc' | 'desc'];
    const sortColumn = field === 'submittedAt' ? 'report.submittedAt' : 'report.createdAt';
    builder.orderBy(sortColumn, direction.toUpperCase() as 'ASC' | 'DESC');
    if (options.paginate) {
      builder.skip((query.page - 1) * query.limit).take(query.limit);
    }

    return builder.getManyAndCount();
  }
}
