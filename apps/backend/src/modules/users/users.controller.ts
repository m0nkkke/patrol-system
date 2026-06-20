import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto, PaginationDto } from '@patrol/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiCreatedResponse({ description: 'User created' })
  create(@Body() dto: CreateUserDto): ReturnType<UsersService['create']> {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Active users list' })
  findAll(@Query() pagination: PaginationDto): ReturnType<UsersService['findAll']> {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'User details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): ReturnType<UsersService['findOne']> {
    return this.usersService.findOne(id);
  }
}
