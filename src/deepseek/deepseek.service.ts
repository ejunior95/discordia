import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
import { getCustomContent } from 'src/config/getCustomContent';
@Injectable()
export class DeepseekService {
    private aiInstance = new OpenAI({
        baseURL: process.env.DEEPSEEK_API_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
    });
    customContent: string = getCustomContent('deepseek');
    
    async execute() {
        try {
            const response = await this.aiInstance.chat.completions.create({
                model: "deepseek-v2",
                messages: [
                    { 
                        role: "system", 
                        content: this.customContent
                    }
                ],
                temperature: 0.7
              });
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Erro na chamada do Deepseek:', error);
            return error;
        };   
    };
}
