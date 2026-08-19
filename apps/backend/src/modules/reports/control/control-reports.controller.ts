import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FindPatrolReportsDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ReportsExportService } from '../export/reports-export.service';
import { ReportsService } from '../operational/reports.service';

@ApiTags('control-reports')
@ApiBearerAuth()
@Controller('control/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlReportsController {
  constructor(
    private readonly reportsExportService: ReportsExportService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get()
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control reports list' })
  findMany(
    @Query() query: FindPatrolReportsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ReportsService['findForControl']> {
    return this.reportsService.findForControl(query, actor);
  }

  @Get('export.csv')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control reports CSV export' })
  async exportCsv(
    @Query() query: FindPatrolReportsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportControlReportsCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control reports XLSX export' })
  async exportXlsx(
    @Query() query: FindPatrolReportsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportControlReportsXlsx(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get(':id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control report details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ReportsService['findOneForControl']> {
    return this.reportsService.findOneForControl(id, actor);
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
