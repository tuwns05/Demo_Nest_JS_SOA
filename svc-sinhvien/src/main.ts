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
  app.setGlobalPrefix('sinhvien');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('API sinh viên')
    .setDescription('Nền tảng dịch vụ sinh viên; hiện cung cấp kiểm tra kết nối cơ sở dữ liệu.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
