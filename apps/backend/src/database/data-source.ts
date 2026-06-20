import 'reflect-metadata';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export default new DataSource({
  database: readEnv('DATABASE_NAME'),
  entities: ['src/**/*.entity.ts'],
  host: readEnv('DATABASE_HOST'),
  migrations: ['src/database/migrations/*.ts'],
  password: readEnv('DATABASE_PASSWORD'),
  port: Number(readEnv('DATABASE_PORT')),
  ssl: readEnv('DATABASE_SSL') === 'true',
  synchronize: false,
  type: 'postgres',
  username: readEnv('DATABASE_USER'),
});

function readEnv(name: string): string {
  return process.env[name] ?? '';
}
