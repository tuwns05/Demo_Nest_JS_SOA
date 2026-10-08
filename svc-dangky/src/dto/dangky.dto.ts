import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDangKyDto {
  @ApiProperty({ example: 'SV001' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(20)
  maSV!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  maDT!: number;

  @ApiPropertyOptional({ example: '2026-10-09', nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  ngayDangKy?: string | null;

  @ApiPropertyOptional({ example: 'Chờ duyệt', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trangThai?: string | null;
}

export class UpdateDangKyDto extends PartialType(CreateDangKyDto, {
  skipNullProperties: false,
}) {}
