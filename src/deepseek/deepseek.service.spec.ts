import { Test, TestingModule } from '@nestjs/testing';
import { DeepseekService } from './deepseek.service';

describe('DeepseekService', () => {
  let service: DeepseekService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeepseekService],
    }).compile();

    service = module.get<DeepseekService>(DeepseekService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
