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
import { FindPatrolIncidentsDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ControlIncidentsService } from './control-incidents.service';
import { ReportsExportService } from '../export/reports-export.service';

@ApiTags('control-incidents')
@ApiBearerAuth()
@Controller('control/incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlIncidentsController {
  constructor(
    private readonly controlIncidentsService: ControlIncidentsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get()
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control incidents list' })
  findMany(
    @Query() query: FindPatrolIncidentsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ControlIncidentsService['findMany']> {
    return this.controlIncidentsService.findMany(query, actor);
  }

  @Get('export.csv')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control incidents CSV export' })
  async exportCsv(
    @Query() query: FindPatrolIncidentsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportControlIncidentsCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control incidents XLSX export' })
  async exportXlsx(
    @Query() query: FindPatrolIncidentsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reportsExportService.exportControlIncidentsXlsx(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get(':id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control incident details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ControlIncidentsService['findOne']> {
    return this.controlIncidentsService.findOne(id, actor);
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
