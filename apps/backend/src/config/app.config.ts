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
};

export const validationSchema = Joi.object({
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
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
  PUSH_NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  PORT: Joi.number().port().default(3000),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_PORT: Joi.number().port().default(6379),
});

export const appConfig = (): AppConfig => {
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
  };
};

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function readBooleanEnv(name: string): boolean {
  return readEnv(name) === 'true';
}

function readNumberEnv(name: string): number {
  return Number(readEnv(name));
}
