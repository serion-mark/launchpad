import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, DeployService, PrismaService],
  exports: [ProjectService, DeployService],
})
export class ProjectModule {}
