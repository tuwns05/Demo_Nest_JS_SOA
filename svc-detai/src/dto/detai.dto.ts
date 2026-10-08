import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDeTaiDto {
  @ApiProperty({ example: 'Quản lý sinh viên' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(200)
  tenDT!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moTa?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  giangVienHD?: string | null;
}

export class UpdateDeTaiDto extends PartialType(CreateDeTaiDto, {
  skipNullProperties: false,
}) {}
