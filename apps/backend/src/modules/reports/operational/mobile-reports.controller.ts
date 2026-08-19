import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CancelPatrolReportDto, CreatePatrolReportDto, SubmitPatrolReportDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UploadedImageFile } from '../../files/files.service';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { ReportsService } from './reports.service';

@ApiTags('mobile-reports')
@ApiBearerAuth()
@Controller('mobile/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MobileReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles('security_guard')
  @ApiCreatedResponse({ description: 'Patrol report draft created' })
  createDraft(
    @Body() dto: CreatePatrolReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    return this.reportsService.createDraft(dto, actor);
  }

  @Post(':id/files')
  @Roles('security_guard')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      properties: {
        file: { format: 'binary', type: 'string' },
      },
      required: ['file'],
      type: 'object',
    },
  })
  @ApiCreatedResponse({ description: 'Report photo attached' })
  attachPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImageFile,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    return this.reportsService.attachPhoto(id, file, actor);
  }

  @Post(':id/submit')
  @Roles('security_guard')
  @ApiOkResponse({ description: 'Patrol report submitted' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPatrolReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    return this.reportsService.submit(id, dto, actor);
  }

  @Post(':id/cancel')
  @Roles('security_guard')
  @ApiOkResponse({ description: 'Patrol report cancelled' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPatrolReportDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolReportEntity> {
    return this.reportsService.cancel(id, dto, actor);
  }
}
