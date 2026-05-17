import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  Equals,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UserSocialsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  github?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  linkedin?: string;
}

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
};

export class CreateUserDto {
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @Transform(toBoolean)
  @IsBoolean({ message: 'É necessário aceitar os termos de uso' })
  @Equals(true, { message: 'É necessário aceitar os termos de uso' })
  acceptTerms: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(280, { message: 'A bio deve ter no máximo 280 caracteres' })
  bio?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserSocialsDto)
  socials?: UserSocialsDto;
}
