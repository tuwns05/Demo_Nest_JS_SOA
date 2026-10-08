import {
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { isAxiosError } from 'axios';

class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: any) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : isAxiosError(exception)
          ? (exception.response?.status ?? HttpStatus.SERVICE_UNAVAILABLE)
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = {
      statusCode: status,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
          : exception instanceof HttpException
            ? exception.getResponse()
            : isAxiosError(exception)
              ? 'Không lấy được dữ liệu từ service sinh viên hoặc đề tài'
              : 'Lỗi không xác định',
      error:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal Server Error'
          : 'Http Exception',
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
  app.setGlobalPrefix('dangky');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('API đăng ký')
    .setDescription(
      'CRUD đăng ký, kiểm tra sinh viên và đề tài qua HTTP, yêu cầu Bearer JWT; health công khai.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PORT ?? 3003);
}

await bootstrap();
