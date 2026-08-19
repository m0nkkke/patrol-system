import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ARCHIVE_RESOURCE_TYPES, ArchiveResourceType, ListArchiveQueryDto } from '@patrol/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ArchiveService } from './archive.service';

@ApiTags('archive')
@ApiBearerAuth()
@Controller('archive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get(':resourceType')
  @ApiOkResponse({ description: 'Archived resources list' })
  findArchived(
    @Param('resourceType') resourceType: ArchiveResourceType,
    @Query() query: ListArchiveQueryDto,
  ): ReturnType<ArchiveService['findArchived']> {
    assertResourceType(resourceType);

    return this.archiveService.findArchived(resourceType, query);
  }

  @Post(':resourceType/:id')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Resource archived' })
  archive(
    @Param('resourceType') resourceType: ArchiveResourceType,
    @Param('id', ParseUUIDPipe) id: string,
  ): ReturnType<ArchiveService['archive']> {
    assertResourceType(resourceType);

    return this.archiveService.archive(resourceType, id);
  }

  @Post(':resourceType/:id/restore')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Resource restored from archive' })
  restore(
    @Param('resourceType') resourceType: ArchiveResourceType,
    @Param('id', ParseUUIDPipe) id: string,
  ): ReturnType<ArchiveService['restore']> {
    assertResourceType(resourceType);

    return this.archiveService.restore(resourceType, id);
  }
}

function assertResourceType(resourceType: string): asserts resourceType is ArchiveResourceType {
  if (!ARCHIVE_RESOURCE_TYPES.includes(resourceType as ArchiveResourceType)) {
    throw new BadRequestException(`Unsupported archive resource type: ${resourceType}`);
  }
}
