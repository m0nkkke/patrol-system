import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';

type CreatePatrolScheduleRecord = {
  endTime: string;
  isActive: boolean;
  name: string;
  shopId: string;
  startTime: string;
  weekdays: number[];
};

type UpdatePatrolScheduleRecord = Partial<Omit<CreatePatrolScheduleRecord, 'shopId'>>;

@Injectable()
export class PatrolSchedulesRepository {
  constructor(
    @InjectRepository(PatrolScheduleEntity)
    private readonly schedules: Repository<PatrolScheduleEntity>,
  ) {}

  create(data: CreatePatrolScheduleRecord): Promise<PatrolScheduleEntity> {
    return this.schedules.save(this.schedules.create(data));
  }

  findById(id: string): Promise<PatrolScheduleEntity | null> {
    return this.schedules.findOne({ relations: { shop: true }, where: { id } });
  }

  findByShop(shopId: string): Promise<PatrolScheduleEntity[]> {
    return this.schedules.find({
      order: { startTime: 'ASC', name: 'ASC' },
      where: { shopId },
    });
  }

  findActiveByShopAndLocalTime(
    shopId: string,
    weekday: number,
    localTime: string,
  ): Promise<PatrolScheduleEntity[]> {
    return this.schedules
      .createQueryBuilder('schedule')
      .where('schedule.shop_id = :shopId', { shopId })
      .andWhere('schedule.is_active = TRUE')
      .andWhere(':weekday = ANY(schedule.weekdays)', { weekday })
      .andWhere('schedule.start_time <= :localTime', { localTime })
      .andWhere('schedule.end_time > :localTime', { localTime })
      .orderBy('schedule.startTime', 'ASC')
      .getMany();
  }

  findOverlapping(
    shopId: string,
    weekdays: number[],
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<PatrolScheduleEntity | null> {
    const builder = this.schedules
      .createQueryBuilder('schedule')
      .where('schedule.shop_id = :shopId', { shopId })
      .andWhere('schedule.is_active = TRUE')
      .andWhere('schedule.weekdays && :weekdays', { weekdays })
      .andWhere('schedule.start_time < :endTime', { endTime })
      .andWhere('schedule.end_time > :startTime', { startTime });

    if (excludeId !== undefined) {
      builder.andWhere({ id: Not(excludeId) });
    }

    return builder.getOne();
  }

  async update(id: string, data: UpdatePatrolScheduleRecord): Promise<void> {
    await this.schedules.update(id, data);
  }
}
