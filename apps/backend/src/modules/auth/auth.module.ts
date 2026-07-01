import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AuthSessionsModule } from './auth-sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  imports: [AuthSessionsModule, UsersModule],
  providers: [AuthService],
})
export class AuthModule {}
