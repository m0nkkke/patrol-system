import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthSessionsModule } from '../auth/auth-sessions.module';
import { ShopsModule } from '../shops/shops.module';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Global()
@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [AuthSessionsModule, ShopsModule, TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersRepository, UsersService],
})
export class UsersModule {}
