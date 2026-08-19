import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ManagementMetricsQueryDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ManagementMetricsService } from './management-metrics.service';
import { ReportsExportService } from '../export/reports-export.service';

@ApiTags('management-metrics')
@ApiBearerAuth()
@Controller('management/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementMetricsController {
  constructor(
    private readonly managementMetricsService: ManagementMetricsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOkResponse({ description: 'Aggregated management metrics without personal details' })
  getMetrics(
    @Query() query: ManagementMetricsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ManagementMetricsService['getMetrics']> {
    return this.managementMetricsService.getMetrics(query, actor);
  }

  @Get('export.csv')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management metrics CSV export' })
  async exportCsv(
    @Query() query: ManagementMetricsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementMetricsCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management metrics XLSX export' })
  async exportXlsx(
    @Query() query: ManagementMetricsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementMetricsXlsx(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }
}

function setDownloadHeaders(
  response: Response,
  contentType: string,
  filename: string,
  contentLength: number,
): void {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('Content-Length', String(contentLength));
}
