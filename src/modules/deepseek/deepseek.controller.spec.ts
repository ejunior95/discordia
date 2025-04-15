import { Test, TestingModule } from '@nestjs/testing';
import { DeepseekController } from './deepseek.controller';

describe('DeepseekController', () => {
  let controller: DeepseekController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeepseekController],
    }).compile();

    controller = module.get<DeepseekController>(DeepseekController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
