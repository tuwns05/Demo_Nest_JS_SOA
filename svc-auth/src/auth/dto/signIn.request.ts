import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInRequest {
    @ApiProperty({ example: 'admin', maxLength: 100, description: 'Tên tài khoản quản trị' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @Matches(/\S/, { message: 'Tài khoản không được chỉ chứa khoảng trắng' })
    user: string;
    @ApiProperty({ format: 'password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
