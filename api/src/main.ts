import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://foundry.ai.kr',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
  });
  app.use(json({ limit: '10mb' })); // AI 회의실 첨부파일 대응
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Foundry API running on port ${port}`);
}
bootstrap();
