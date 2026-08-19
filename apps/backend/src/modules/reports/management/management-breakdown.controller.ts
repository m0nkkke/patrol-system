import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ManagementBreakdownQueryDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ManagementBreakdownService } from './management-breakdown.service';
import { ReportsExportService } from '../export/reports-export.service';

@ApiTags('management-breakdown')
@ApiBearerAuth()
@Controller('management/metrics/breakdown')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementBreakdownController {
  constructor(
    private readonly managementBreakdownService: ManagementBreakdownService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOkResponse({ description: 'Management metrics breakdown without personal details' })
  getBreakdown(
    @Query() query: ManagementBreakdownQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ManagementBreakdownService['getBreakdown']> {
    return this.managementBreakdownService.getBreakdown(query, actor);
  }

  @Get('export.csv')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management breakdown CSV export' })
  async exportCsv(
    @Query() query: ManagementBreakdownQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementBreakdownCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin')
  @ApiOkResponse({ description: 'Management breakdown XLSX export' })
  async exportXlsx(
    @Query() query: ManagementBreakdownQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementBreakdownXlsx(query, actor);
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
