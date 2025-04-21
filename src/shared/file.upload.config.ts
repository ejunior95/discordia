import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
  fileFilter: (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          'Tipo de arquivo inválido. Somente JPG, PNG e WEBP são permitidos.',
        ),
        false,
      );
    }
  },
};
