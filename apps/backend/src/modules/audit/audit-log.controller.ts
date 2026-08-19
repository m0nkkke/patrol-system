import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FindAuditLogDto } from '@patrol/shared';
import { Response } from 'express';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditLogService } from './audit-log.service';
import { AuditLogExportService } from './export/audit-log-export.service';

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogExportService: AuditLogExportService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOkResponse({ description: 'Audit log list' })
  findMany(
    @Query() query: FindAuditLogDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<AuditLogService['findMany']> {
    return this.auditLogService.findMany(query, actor);
  }

  @Get('export.csv')
  @Roles('admin')
  @ApiOkResponse({ description: 'Audit log CSV export' })
  async exportCsv(
    @Query() query: FindAuditLogDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.auditLogExportService.exportCsv(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get('export.xlsx')
  @Roles('admin')
  @ApiOkResponse({ description: 'Audit log XLSX export' })
  async exportXlsx(
    @Query() query: FindAuditLogDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.auditLogExportService.exportXlsx(query, actor);
    setDownloadHeaders(response, file.contentType, file.filename, file.buffer.length);

    return new StreamableFile(file.buffer);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOkResponse({ description: 'Audit log details' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<AuditLogService['findOne']> {
    return this.auditLogService.findOne(String(id), actor);
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
