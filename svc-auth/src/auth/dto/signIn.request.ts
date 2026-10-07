import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInRequest {
    @ApiProperty({ example: 'demo' })
    @IsString()
    @IsNotEmpty()
    username: string;
    @ApiProperty({ format: 'password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
