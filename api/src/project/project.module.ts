import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';
import { PrismaService } from '../prisma.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [ProjectController],
  providers: [ProjectService, DeployService, PrismaService],
  exports: [ProjectService, DeployService],
})
export class ProjectModule {}
