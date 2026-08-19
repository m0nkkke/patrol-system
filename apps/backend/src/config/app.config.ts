import * as Joi from 'joi';

export type AppConfig = {
  apiPrefix: string;
  corsOrigins: string[];
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
  };
  files: {
    imageMaxWidth: number;
    imageQuality: number;
    localRoot: string;
    maxUploadSizeMb: number;
    storageBackend: 'local' | 'object';
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtlSeconds: number;
  };
  nodeEnv: string;
  notifications: {
    expoAccessToken?: string;
    expoPushEndpoint: string;
    pushEnabled: boolean;
  };
  port: number;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  reportingCore: {
    apiKey?: string;
    batchSize: number;
    publishEnabled: boolean;
    publishIntervalMs: number;
    transport: 'disabled' | 'http';
    url?: string;
  };
  swagger: {
    basicAuthEnabled: boolean;
    basicAuthPassword?: string;
    basicAuthUser?: string;
    enabled: boolean;
  };
};

export const validationSchema = Joi.object({
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_USER: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(64).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().positive().default(604800),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  EXPO_PUSH_ACCESS_TOKEN: Joi.string().allow('').optional(),
  EXPO_PUSH_ENDPOINT: Joi.string().uri().default('https://exp.host/--/api/v2/push/send'),
  FILE_IMAGE_MAX_WIDTH: Joi.number().integer().min(320).max(4096).default(1600),
  FILE_IMAGE_QUALITY: Joi.number().integer().min(1).max(100).default(80),
  FILE_STORAGE_BACKEND: Joi.string().valid('local', 'object').default('local'),
  FILE_STORAGE_LOCAL_ROOT: Joi.string().default('./storage'),
  FILE_UPLOAD_MAX_SIZE_MB: Joi.number().integer().min(1).max(100).default(10),
  PUSH_NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  PORT: Joi.number().port().default(3000),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_PORT: Joi.number().port().default(6379),
  REPORTING_CORE_API_KEY: Joi.string().allow('').optional(),
  REPORTING_CORE_PUBLISH_ENABLED: Joi.boolean().default(false),
  REPORTING_CORE_TRANSPORT: Joi.string().valid('disabled', 'http').default('disabled'),
  REPORTING_CORE_URL: Joi.string().uri().allow('').optional(),
  REPORTING_OUTBOX_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(50),
  REPORTING_OUTBOX_PUBLISH_INTERVAL_MS: Joi.number().integer().min(1000).default(30000),
  SWAGGER_BASIC_AUTH_ENABLED: Joi.boolean().default(false),
  SWAGGER_BASIC_AUTH_PASSWORD: Joi.when('SWAGGER_BASIC_AUTH_ENABLED', {
    is: true,
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  SWAGGER_BASIC_AUTH_USER: Joi.when('SWAGGER_BASIC_AUTH_ENABLED', {
    is: true,
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  SWAGGER_ENABLED: Joi.boolean().optional(),
});

export const appConfig = (): AppConfig => {
  const nodeEnv = readEnv('NODE_ENV');
  const corsOrigins = readEnv('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    apiPrefix: readEnv('API_PREFIX'),
    corsOrigins,
    database: {
      host: readEnv('DATABASE_HOST'),
      name: readEnv('DATABASE_NAME'),
      password: readEnv('DATABASE_PASSWORD'),
      port: readNumberEnv('DATABASE_PORT'),
      ssl: readBooleanEnv('DATABASE_SSL'),
      username: readEnv('DATABASE_USER'),
    },
    jwt: {
      accessSecret: readEnv('JWT_ACCESS_SECRET'),
      accessTtl: readEnv('JWT_ACCESS_TTL'),
      refreshSecret: readEnv('JWT_REFRESH_SECRET'),
      refreshTtlSeconds: readNumberEnv('JWT_REFRESH_TTL_SECONDS'),
    },
    files: {
      imageMaxWidth: readNumberEnv('FILE_IMAGE_MAX_WIDTH', 1600),
      imageQuality: readNumberEnv('FILE_IMAGE_QUALITY', 80),
      localRoot: readEnv('FILE_STORAGE_LOCAL_ROOT', './storage'),
      maxUploadSizeMb: readNumberEnv('FILE_UPLOAD_MAX_SIZE_MB', 10),
      storageBackend: readEnv('FILE_STORAGE_BACKEND', 'local') as 'local' | 'object',
    },
    nodeEnv: readEnv('NODE_ENV'),
    notifications: {
      expoAccessToken: readOptionalEnv('EXPO_PUSH_ACCESS_TOKEN'),
      expoPushEndpoint: readEnv('EXPO_PUSH_ENDPOINT'),
      pushEnabled: readBooleanEnv('PUSH_NOTIFICATIONS_ENABLED'),
    },
    port: readNumberEnv('PORT'),
    redis: {
      host: readEnv('REDIS_HOST'),
      password: readOptionalEnv('REDIS_PASSWORD'),
      port: readNumberEnv('REDIS_PORT'),
    },
    reportingCore: {
      apiKey: readOptionalEnv('REPORTING_CORE_API_KEY'),
      batchSize: readNumberEnv('REPORTING_OUTBOX_BATCH_SIZE', 50),
      publishEnabled: readBooleanEnv('REPORTING_CORE_PUBLISH_ENABLED'),
      publishIntervalMs: readNumberEnv('REPORTING_OUTBOX_PUBLISH_INTERVAL_MS', 30000),
      transport: readEnv('REPORTING_CORE_TRANSPORT', 'disabled') as 'disabled' | 'http',
      url: readOptionalEnv('REPORTING_CORE_URL'),
    },
    swagger: {
      basicAuthEnabled: readBooleanEnv('SWAGGER_BASIC_AUTH_ENABLED'),
      basicAuthPassword: readOptionalEnv('SWAGGER_BASIC_AUTH_PASSWORD'),
      basicAuthUser: readOptionalEnv('SWAGGER_BASIC_AUTH_USER'),
      enabled: readOptionalBooleanEnv('SWAGGER_ENABLED') ?? nodeEnv !== 'production',
    },
  };
};

function readEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function readBooleanEnv(name: string): boolean {
  return readEnv(name) === 'true';
}

function readOptionalBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value === 'true';
}

function readNumberEnv(name: string, fallback = 0): number {
  return Number(readEnv(name, String(fallback)));
}
