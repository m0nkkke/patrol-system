import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector', 'security_guard')
  @Header('Cache-Control', 'private, max-age=86400')
  @ApiOkResponse({ description: 'Protected file stream' })
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { asset, file } = await this.filesService.read(id);
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', String(file.sizeBytes ?? asset.sizeBytes));

    return new StreamableFile(file.stream);
  }
}
