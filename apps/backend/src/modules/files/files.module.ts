import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfig } from '../../config/app.config';
import { FileAssetEntity } from './entities/file-asset.entity';
import { FileAssetsRepository } from './file-assets.repository';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ImageProcessingService } from './processing/image-processing.service';
import { FILE_STORAGE } from './storage/file-storage.port';
import { LocalFileStorageService } from './storage/local-file-storage.service';
import { ObjectFileStorageService } from './storage/object-file-storage.service';

@Module({
  controllers: [FilesController],
  exports: [FilesService],
  imports: [TypeOrmModule.forFeature([FileAssetEntity])],
  providers: [
    FileAssetsRepository,
    FilesService,
    ImageProcessingService,
    LocalFileStorageService,
    ObjectFileStorageService,
    {
      inject: [ConfigService, LocalFileStorageService, ObjectFileStorageService],
      provide: FILE_STORAGE,
      useFactory: (
        configService: ConfigService<AppConfig, true>,
        localStorage: LocalFileStorageService,
        objectStorage: ObjectFileStorageService,
      ) =>
        configService.get('files.storageBackend', { infer: true }) === 'object'
          ? objectStorage
          : localStorage,
    },
  ],
})
export class FilesModule {}
