import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AssignUserShopsDto, CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '@patrol/shared';

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
  findAll(@Query() query: ListUsersQueryDto): ReturnType<UsersService['findAll']> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'User details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): ReturnType<UsersService['findOne']> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'User updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): ReturnType<UsersService['update']> {
    return this.usersService.update(id, dto);
  }

  @Post(':id/access-key/rotate')
  @HttpCode(200)
  @ApiOkResponse({ description: 'User access key rotated' })
  rotateAccessKey(@Param('id', ParseUUIDPipe) id: string): ReturnType<UsersService['rotateAccessKey']> {
    return this.usersService.rotateAccessKey(id);
  }

  @Put(':id/shops')
  @ApiOkResponse({ description: 'User shop assignments replaced' })
  assignShops(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignUserShopsDto,
  ): ReturnType<UsersService['assignShops']> {
    return this.usersService.assignShops(id, dto);
  }
}
