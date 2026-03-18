import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Get()
  list(@Req() req: any) {
    return this.projectService.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() body: {
    name: string;
    description?: string;
    template: string;
    theme?: string;
    features?: any;
  }) {
    return this.projectService.create(req.user.userId, body);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getById(id, req.user.userId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: {
    name?: string;
    description?: string;
    theme?: string;
    features?: any;
    status?: string;
    chatHistory?: any;
    generatedCode?: any;
    subdomain?: string;
    deployedUrl?: string;
  }) {
    return this.projectService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.projectService.remove(id, req.user.userId);
  }
}
