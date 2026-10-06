import {
    Controller,
    Body,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards
} from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SignInRequest } from './dto/signIn.request.js';
import { SignInResponse } from './dto/signIn.reponse.js';
import { Public } from './decorators/public.decorator.js';


@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }
    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    signIn(@Body() signInDto: SignInRequest): Promise<SignInResponse> {
        return this.authService.signIn(
            signInDto.username,
            signInDto.password
        );
    }
    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(): string {
        return 'Hello World';
    }
}
