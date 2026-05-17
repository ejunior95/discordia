import { Expose, Transform } from 'class-transformer';

export class UserSocialsResponseDto {
  @Expose()
  twitter?: string;

  @Expose()
  github?: string;

  @Expose()
  linkedin?: string;
}

export class UserResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  avatar?: string;

  @Expose()
  bio?: string;

  @Expose()
  socials?: UserSocialsResponseDto;

  @Expose({ name: 'terms_accepted_at' })
  termsAcceptedAt?: Date;

  @Expose({ name: 'created_at' })
  createdAt: Date;
}
