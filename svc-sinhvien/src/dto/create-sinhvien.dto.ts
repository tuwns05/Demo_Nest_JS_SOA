import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
} from 'class-validator';

export class CreateSinhVienDto {
    @IsString()
    @IsNotEmpty()
    maSV: string;

    @IsString()
    @IsNotEmpty()
    hoTen: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    lop: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    matKhau: string;
}