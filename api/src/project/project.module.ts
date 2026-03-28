import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';
import { GitHubService } from './github.service';
import { PrismaService } from '../prisma.service';
import { AiModule } from '../ai/ai.module';
import { CreditService } from '../credit/credit.service';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [ProjectController],
  providers: [ProjectService, DeployService, GitHubService, PrismaService, CreditService],
  exports: [ProjectService, DeployService, GitHubService],
})
export class ProjectModule {}
