import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ManagementScorecardsQueryDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ManagementScorecardsService } from './management-scorecards.service';
import { ReportsExportService } from '../export/reports-export.service';

@ApiTags('management-scorecards')
@ApiBearerAuth()
@Controller('management/scorecards/shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementScorecardsController {
  constructor(
    private readonly managementScorecardsService: ManagementScorecardsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOkResponse({ description: 'Aggregated shop scorecards without personal details' })
  getShopScorecards(
    @Query() query: ManagementScorecardsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ManagementScorecardsService['getShopScorecards']> {
    return this.managementScorecardsService.getShopScorecards(query, actor);
  }

  @Get('export.csv')
  @Roles('admin')
  @ApiOkResponse({ description: 'Shop scorecards CSV export' })
  async exportCsv(
    @Query() query: ManagementScorecardsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementShopScorecardsCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin')
  @ApiOkResponse({ description: 'Shop scorecards XLSX export' })
  async exportXlsx(
    @Query() query: ManagementScorecardsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportManagementShopScorecardsXlsx(query, actor);
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
