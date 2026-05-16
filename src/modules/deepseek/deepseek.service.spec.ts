import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepseekService } from './deepseek.service';

const mockCreate = jest.fn();

interface DeepseekCreateRequest {
  max_tokens: number;
  temperature: number;
  messages: { content: string }[];
}

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('DeepseekService', () => {
  let service: DeepseekService;
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_API_BASE_URL: 'https://deepseek.test/v1',
        DEEPSEEK_MODEL: 'deepseek-test',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    mockCreate.mockReset();
    configService.get.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeepseekService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<DeepseekService>(DeepseekService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('retries hangman when Deepseek returns empty content because of token length', async () => {
    mockCreate
      .mockResolvedValueOnce({
        choices: [{ finish_reason: 'length', message: { content: '' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ finish_reason: 'stop', message: { content: 'A' } }],
      });

    const result = await service.execute(
      'hangman-guesser',
      'Escolha uma letra.',
      [],
    );

    expect(result).toEqual({ response: 'A' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    const calls = mockCreate.mock.calls as unknown as Array<
      [DeepseekCreateRequest]
    >;
    const retryRequest = calls[1][0];
    expect(retryRequest).toMatchObject({
      max_tokens: 256,
      temperature: 0.2,
    });
    expect(retryRequest.messages.at(-1)?.content).toContain(
      'UMA letra maiúscula',
    );
  });

  it('does not retry non-hangman empty responses', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ finish_reason: 'length', message: { content: '' } }],
    });

    await expect(service.execute('chat', 'Pergunta', [])).rejects.toThrow(
      'Erro na requisição para o Deepseek.',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
