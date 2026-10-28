import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleCredentialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  credential: string;
}
