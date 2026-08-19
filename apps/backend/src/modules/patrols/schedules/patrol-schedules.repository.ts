import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PatrolPeriod } from '@patrol/shared';
import { Not, Repository } from 'typeorm';

import { PatrolScheduleEntity } from '../entities/patrol-schedule.entity';

type CreatePatrolScheduleRecord = {
  earlyStartMinutes: number;
  endTime: string;
  isActive: boolean;
  name: string;
  period: PatrolPeriod;
  routeId?: string;
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
    return this.schedules.findOne({ relations: { route: true, shop: true }, where: { id } });
  }

  findByShop(shopId: string): Promise<PatrolScheduleEntity[]> {
    return this.schedules.find({
      order: { isActive: 'DESC', period: 'ASC', startTime: 'ASC', name: 'ASC' },
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
      .andWhere(
        `CASE
          WHEN schedule.early_start_minutes >= EXTRACT(EPOCH FROM schedule.start_time) / 60 THEN TIME '00:00'
          ELSE schedule.start_time - MAKE_INTERVAL(mins => schedule.early_start_minutes)
        END < :endTime`,
        { endTime },
      )
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
