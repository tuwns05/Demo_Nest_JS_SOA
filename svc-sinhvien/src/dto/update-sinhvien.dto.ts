import {
    IsEmail,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateSinhVienDto {
    @IsOptional()
    @IsString()
    hoTen?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    lop?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    matKhau?: string;
}