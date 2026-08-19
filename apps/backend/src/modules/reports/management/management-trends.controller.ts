import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ManagementTrendsQueryDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ManagementTrendsService } from './management-trends.service';
import { ReportsExportService } from '../export/reports-export.service';

@ApiTags('management-trends')
@ApiBearerAuth()
@Controller('management/metrics/trends')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementTrendsController {
  constructor(
    private readonly managementTrendsService: ManagementTrendsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOkResponse({ description: 'Management metrics trend without personal details' })
  getTrends(
    @Query() query: ManagementTrendsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ManagementTrendsService['getTrends']> {
    return this.managementTrendsService.getTrends(query, actor);
  }

  @Get('export.csv')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management trends CSV export' })
  async exportCsv(
    @Query() query: ManagementTrendsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementTrendsCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management trends XLSX export' })
  async exportXlsx(
    @Query() query: ManagementTrendsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementTrendsXlsx(query, actor);
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
