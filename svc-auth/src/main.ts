
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3004);

  const url = new URL(await app.getUrl());
  if (url.hostname === '[::]' || url.hostname === '0.0.0.0') {
    url.hostname = 'localhost';
  }
  Logger.log(`Application: ${url.href}`, 'Bootstrap');
  Logger.log(`Swagger: ${new URL('api', url).href}`, 'Bootstrap');
}
await bootstrap();
