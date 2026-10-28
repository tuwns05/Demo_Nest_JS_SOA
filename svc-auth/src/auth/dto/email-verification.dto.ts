import { IsEmail, IsNotEmpty, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class AdminEmailDto {
  @IsEmail()
  @MaxLength(100)
  email: string;
}

export class CompleteAdminRegistrationDto extends AdminEmailDto {
  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class VerificationCodeDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class CompleteGoogleLinkDto extends VerificationCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  credential: string;
}

