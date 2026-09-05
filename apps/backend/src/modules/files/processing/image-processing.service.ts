import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type sharpFactory from 'sharp';

import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { AppConfig } from '../../../config/app.config';

// sharp 0.35 is CommonJS at runtime in the current backend build.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const sharp: typeof sharpFactory = require('sharp');

export type ProcessedImage = {
  buffer: Buffer;
  height?: number;
  mimeType: string;
  width?: number;
};

@Injectable()
export class ImageProcessingService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async compress(buffer: Buffer): Promise<ProcessedImage> {
    const image = sharp(buffer, { failOn: 'error' });
    const metadata = await image.metadata();

    if (metadata.format === undefined) {
      throw new DomainValidationError('FILE_INVALID_IMAGE', 'Uploaded file is not a supported image');
    }

    const maxWidth = this.configService.get('files.imageMaxWidth', { infer: true });
    const quality = this.configService.get('files.imageQuality', { infer: true });
    const processedBuffer = await image
      .rotate()
      .resize({ fit: 'inside', width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      height: processedMetadata.height,
      mimeType: 'image/webp',
      width: processedMetadata.width,
    };
  }
}
