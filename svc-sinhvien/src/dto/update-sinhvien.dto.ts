import {
  IsEmail,
  IsNotEmpty,
  ValidateIf,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateSinhVienDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  hoTen?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lop?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  matKhau?: string;
}
