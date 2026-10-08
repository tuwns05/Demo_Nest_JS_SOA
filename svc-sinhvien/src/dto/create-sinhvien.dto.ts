import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateSinhVienDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  maSV: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  hoTen: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lop: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  matKhau: string;
}
