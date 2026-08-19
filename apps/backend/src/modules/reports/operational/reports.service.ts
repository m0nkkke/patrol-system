import { Injectable } from '@nestjs/common';
import {
  CancelPatrolReportDto,
  CreatePatrolReportDto,
  FindPatrolReportsDto,
  SubmitPatrolReportDto,
  PatrolPeriod,
  PatrolReportStatus,
  PatrolReportType,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { FilesService, UploadedImageFile } from '../../files/files.service';
import { PatrolsService } from '../../patrols/patrols.service';
import { ShopsService } from '../../shops/shops.service';
import { UsersService } from '../../users/users.service';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { ReportOutboxService } from '../outbox/report-outbox.service';
import { ReportsRepository } from './reports.repository';

export type ControlReportResponse = {
  cancellationReason: string | null;
  cancelledAt: string | null;
  comment: string | null;
  createdAt: string;
  employee: { fullName: string | null; id: string };
  fields: Record<string, unknown>;
  files: Array<{
    createdAt: string;
    height: number | null;
    id: string;
    kind: string;
    mimeType: string;
    originalName: string | null;
    sizeBytes: number;
    url: string;
    width: number | null;
  }>;
  id: string;
  patrolId: string | null;
  period: PatrolPeriod | null;
  reportType: PatrolReportType;
  route: { id: string; name: string | null } | null;
  schedule: { id: string; name: string | null } | null;
  schemaVersion: string;
  shop: { id: string; name: string | null };
  status: PatrolReportStatus;
  submittedAt: string | null;
};

type PaginatedReports = {
  items: ControlReportResponse[];
  limit: number;
  page: number;
  total: number;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly filesService: FilesService,
    private readonly patrolsService: PatrolsService,
    private readonly reportOutboxService: ReportOutboxService,
    private readonly reportsRepository: ReportsRepository,
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
  ) {}

  async createDraft(dto: CreatePatrolReportDto, actor: AuthenticatedUser): Promise<PatrolReportEntity> {
    assertCanCreateMobileReport(actor, dto.shopId);
    await this.shopsService.findOne(dto.shopId);
    await this.usersService.assertAssignedToShop(actor.id, dto.shopId);

    const patrol =
      dto.patrolId === undefined ? undefined : await this.patrolsService.findOne(dto.patrolId);

    if (patrol !== undefined) {
      if (patrol.shopId !== dto.shopId || patrol.employeeId !== actor.id) {
        throw new DomainValidationError(
          'PATROL_REPORT_PATROL_FORBIDDEN',
          'Patrol report cannot be linked to this patrol',
        );
      }
    }

    const report = await this.reportsRepository.create({
      comment: dto.comment,
      employeeId: actor.id,
      fields: dto.fields ?? {},
      patrolId: patrol?.id ?? dto.patrolId,
      period: dto.period ?? patrol?.schedule?.period,
      reportType: dto.reportType,
      routeId: dto.routeId ?? patrol?.routeId,
      scheduleId: dto.scheduleId ?? patrol?.scheduleId,
      shopId: dto.shopId,
    });
    await this.reportOutboxService.emitReportEvent('report.draft_created', report, actor);

    return report;
  }

  async submit(
    id: string,
    dto: SubmitPatrolReportDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    const report = await this.findOne(id);
    assertCanModifyOwnReport(actor, report);

    if (report.status !== 'draft') {
      throw new DomainValidationError(
        'PATROL_REPORT_NOT_DRAFT',
        'Only draft patrol reports can be submitted',
      );
    }

    await this.reportsRepository.update(id, {
      comment: dto.comment ?? report.comment ?? undefined,
      fields: dto.fields ?? report.fields,
      status: 'submitted',
      submittedAt: new Date(),
    });

    const submittedReport = await this.findOne(id);
    await this.reportOutboxService.emitReportEvent('report.submitted', submittedReport, actor, {
      submittedAt: submittedReport.submittedAt?.toISOString() ?? null,
    });

    return submittedReport;
  }

  async cancel(
    id: string,
    dto: CancelPatrolReportDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    const report = await this.findOne(id);
    assertCanModifyOwnReport(actor, report);

    if (report.status === 'submitted') {
      throw new DomainValidationError(
        'PATROL_REPORT_ALREADY_SUBMITTED',
        'Submitted patrol report cannot be cancelled by mobile user',
      );
    }

    await this.reportsRepository.update(id, {
      cancellationReason: dto.reason,
      cancelledAt: new Date(),
      status: 'cancelled',
    });

    const cancelledReport = await this.findOne(id);
    await this.reportOutboxService.emitReportEvent('report.cancelled', cancelledReport, actor, {
      cancellationReason: dto.reason,
      cancelledAt: cancelledReport.cancelledAt?.toISOString() ?? null,
    });

    return cancelledReport;
  }

  async attachPhoto(
    id: string,
    file: UploadedImageFile | undefined,
    actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    if (file === undefined) {
      throw new DomainValidationError('FILE_REQUIRED', 'Report photo file is required');
    }

    const report = await this.findOne(id);
    assertCanModifyOwnReport(actor, report);

    if (report.status !== 'draft') {
      throw new DomainValidationError(
        'PATROL_REPORT_NOT_DRAFT',
        'Files can be attached only to draft patrol reports',
      );
    }

    const asset = await this.filesService.createImageAsset({
      file,
      kind: 'report_photo',
      ownerId: report.id,
      ownerType: 'patrol_report',
      uploadedBy: actor.id,
    });
    await this.reportsRepository.attachFile(report.id, asset, 'report_photo');
    await this.reportOutboxService.emitReportEvent('report.file_attached', report, actor, {
      fileId: asset.id,
      fileKind: 'report_photo',
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
    });

    return this.findOne(id);
  }

  async findOne(id: string): Promise<PatrolReportEntity> {
    const report = await this.reportsRepository.findById(id);

    if (report === null) {
      throw new EntityNotFoundError('PatrolReport', id);
    }

    return report;
  }

  async findOneForControl(id: string, actor: AuthenticatedUser): Promise<ControlReportResponse> {
    const report = await this.findOne(id);
    assertCanAccessControlReport(actor, report.shopId);

    return toControlReport(report);
  }

  async findForControl(
    query: FindPatrolReportsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedReports> {
    assertCanUseControlReports(actor);

    if (query.shopId !== undefined) {
      assertCanAccessControlReport(actor, query.shopId);
    }

    const allowedShopIds = actor.role === 'inspector' ? actor.shopIds ?? [] : undefined;
    const [items, total] = await this.reportsRepository.findMany(query, allowedShopIds);

    return {
      items: items.map(toControlReport),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findForControlExport(
    query: FindPatrolReportsDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity[]> {
    assertCanUseControlReports(actor);

    if (query.shopId !== undefined) {
      assertCanAccessControlReport(actor, query.shopId);
    }

    const allowedShopIds = actor.role === 'inspector' ? actor.shopIds ?? [] : undefined;
    const [items] = await this.reportsRepository.findMany(query, allowedShopIds, {
      paginate: false,
    });

    return items;
  }
}

function assertCanCreateMobileReport(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role !== 'security_guard' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_REPORT_FORBIDDEN',
      'User cannot create patrol reports for this shop',
    );
  }
}

function assertCanModifyOwnReport(actor: AuthenticatedUser, report: PatrolReportEntity): void {
  if (actor.role !== 'security_guard' || report.employeeId !== actor.id) {
    throw new DomainValidationError(
      'PATROL_REPORT_FORBIDDEN',
      'User cannot modify this patrol report',
    );
  }
}

function assertCanUseControlReports(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin' && actor.role !== 'inspector') {
    throw new DomainValidationError(
      'PATROL_REPORT_CONTROL_FORBIDDEN',
      'User cannot access control reports',
    );
  }
}

function assertCanAccessControlReport(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'inspector' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_REPORT_CONTROL_FORBIDDEN',
      'User cannot access control reports for this shop',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || (actor.shopIds?.includes(shopId) ?? false);
}

function toControlReport(report: PatrolReportEntity): ControlReportResponse {
  return {
    cancellationReason: report.cancellationReason ?? null,
    cancelledAt: report.cancelledAt?.toISOString() ?? null,
    comment: report.comment ?? null,
    createdAt: report.createdAt.toISOString(),
    employee: {
      fullName: report.employee?.fullName ?? null,
      id: report.employeeId,
    },
    fields: report.fields,
    files: (report.files ?? []).flatMap((reportFile) => {
      const file = reportFile.file;
      return file === undefined ? [] : [{
        createdAt: file.createdAt.toISOString(),
        height: file.height ?? null,
        id: file.id,
        kind: reportFile.kind,
        mimeType: file.mimeType,
        originalName: file.originalName ?? null,
        sizeBytes: file.sizeBytes,
        url: `/api/v1/files/${file.id}`,
        width: file.width ?? null,
      }];
    }),
    id: report.id,
    patrolId: report.patrolId ?? null,
    period: report.period ?? null,
    reportType: report.reportType,
    route: report.routeId == null ? null : {
      id: report.routeId,
      name: report.route?.name ?? null,
    },
    schedule: report.scheduleId == null ? null : {
      id: report.scheduleId,
      name: report.schedule?.name ?? null,
    },
    schemaVersion: report.schemaVersion,
    shop: {
      id: report.shopId,
      name: report.shop?.name ?? null,
    },
    status: report.status,
    submittedAt: report.submittedAt?.toISOString() ?? null,
  };
}
