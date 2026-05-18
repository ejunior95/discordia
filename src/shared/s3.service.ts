import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !bucket || !region) {
      throw new Error('Variáveis de ambiente AWS S3 estão faltando');
    }

    this.bucket = bucket;
    this.region = region;
    this.s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'avatars',
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${uuid()}.${fileExtension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
