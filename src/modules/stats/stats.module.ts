import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Stats } from '../../entities/stats.entity';
import { Round } from '../../entities/round.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stats, Round])],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService, TypeOrmModule],
})
export class StatsModule {}
