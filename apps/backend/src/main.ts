import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), { bufferLogs: true });
  const configService = app.get(ConfigService<AppConfig, true>);
  const apiPrefix = configService.get('apiPrefix', { infer: true });
  const corsOrigins = configService.get('corsOrigins', { infer: true });
  const nodeEnv = configService.get('nodeEnv', { infer: true });
  const swagger = configService.get('swagger', { infer: true });

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (swagger.enabled) {
    if (nodeEnv === 'production' && !swagger.basicAuthEnabled) {
      throw new Error('Swagger must be protected with basic auth when enabled in production');
    }

    const swaggerPath = `${normalizePath(apiPrefix)}/docs`;

    if (swagger.basicAuthEnabled) {
      const username = swagger.basicAuthUser;
      const password = swagger.basicAuthPassword;

      if (!username || !password) {
        throw new Error('Swagger basic auth credentials are required when basic auth is enabled');
      }

      app.use(swaggerPath, createBasicAuthMiddleware(username, password));
      app.use(`${swaggerPath}-json`, createBasicAuthMiddleware(username, password));
      app.use(`${swaggerPath}-yaml`, createBasicAuthMiddleware(username, password));
    }

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Patrol System API')
      .setDescription('Digital patrol control backend API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(configService.get('port', { infer: true }));
}

function normalizePath(path: string): string {
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function createBasicAuthMiddleware(username: string, password: string) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Basic ')) {
      requestBasicAuth(response);
      return;
    }

    const credentials = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = credentials.indexOf(':');

    if (separatorIndex === -1) {
      requestBasicAuth(response);
      return;
    }

    const providedUsername = credentials.slice(0, separatorIndex);
    const providedPassword = credentials.slice(separatorIndex + 1);

    if (
      !constantTimeEquals(providedUsername, username) ||
      !constantTimeEquals(providedPassword, password)
    ) {
      requestBasicAuth(response);
      return;
    }

    next();
  };
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function requestBasicAuth(response: Response): void {
  response.setHeader('WWW-Authenticate', 'Basic realm="Patrol API docs"');
  response.status(401).send('Authentication required');
}

void bootstrap();
