import { Test, TestingModule } from '@nestjs/testing';
import { GrokService } from './grok.service';

describe('GrokService', () => {
  let service: GrokService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrokService],
    }).compile();

    service = module.get<GrokService>(GrokService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
