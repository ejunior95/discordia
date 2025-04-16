import { Test, TestingModule } from '@nestjs/testing';
import { GrokController } from './grok.controller';

describe('GrokController', () => {
  let controller: GrokController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrokController],
    }).compile();

    controller = module.get<GrokController>(GrokController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
