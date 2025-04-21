import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private s3: S3;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION');
    this.bucket = this.configService.get<string>('AWS_BUCKET_NAME') || '';

    if (!accessKeyId || !secretAccessKey || !this.bucket || !region) {
      throw new Error('Variaveis de ambiente AWS S3 estão faltando');
    }

    this.s3 = new S3({
      accessKeyId,
      secretAccessKey,
      region,
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'avatars'): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${uuid()}.${fileExtension}`;

    const uploadResult = await this.s3
      .upload({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
      .promise();

    return uploadResult.Location;
  }
}
