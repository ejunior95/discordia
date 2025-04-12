import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { getCustomContent } from 'src/config/getCustomContent';
@Injectable()
export class DeepseekService {
    constructor (
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}
    customContent: string = getCustomContent('deepseek');
    
    async execute(question: string) {
        try {
            const response = await lastValueFrom(
                this.httpService.request({
                    baseURL: this.configService.get('DEEPSEEK_API_BASE_URL'),
                    method: 'POST',
                    url: 'chat/completions',
                    data: {
                        model: 'deepseek-chat',
                        messages: [
                            { 
                                role: 'system', 
                                content: this.customContent 
                            },
                            { 
                                role: 'user', 
                                content: question 
                            }
                        ],
                        temperature: 0.7
                    },
                    headers: {
                        Authorization: `Bearer ${this.configService.get('DEEPSEEK_API_KEY')}`,
                        Accept: 'application/json'
                    }
                })
            )
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Erro na chamada do Deepseek:', error);
            return error;
        };   
    };
}
