
import {
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: any) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = {
      statusCode: status,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
          : exception instanceof HttpException
            ? exception.getResponse()
            : 'Lỗi không xác định',
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : 'Http Exception',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(payload, 'HttpExceptionFilter');
    }

    response.status(status).json(payload);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Authentication API')
    .setDescription('API đăng nhập và xác thực')
    .setVersion('1.0')
    .addTag('auth')
    .addBearerAuth()
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
