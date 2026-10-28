import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStudentAccountDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  maSV: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  initialPassword: string;
}
