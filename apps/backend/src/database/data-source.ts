import 'reflect-metadata';

import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

config();

const sourceExtension = __filename.endsWith('.js') ? 'js' : 'ts';

export default new DataSource({
  database: readEnv('DATABASE_NAME'),
  entities: [join(__dirname, '..', `**/*.entity.${sourceExtension}`)],
  host: readEnv('DATABASE_HOST'),
  migrations: [join(__dirname, 'migrations', `*.${sourceExtension}`)],
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
