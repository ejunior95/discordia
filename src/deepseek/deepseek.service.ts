import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { getCustomContent } from 'src/config/getCustomContent';
@Injectable()
export class DeepseekService {
    apiUrl = process.env.DEEPSEEK_API_BASE_URL;
    apiKey = process.env.DEEPSEEK_API_KEY;
    httpClient = axios.create({ baseURL: this.apiUrl });
    customContent: string = getCustomContent('deepseek');
    
    async execute(question: string) {
        try {
            const response = await this.httpClient.post(
                'chat/completions',
                {
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
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Erro na chamada do Deepseek:', error);
            return error;
        };   
    };
}
