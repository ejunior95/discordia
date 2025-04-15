import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
import { getCustomContent } from 'src/config/getCustomContent';
@Injectable()
export class ChatGptService {
    private aiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    customContent: string = getCustomContent('chat-gpt');
    
    async execute(question: string) {
        try {
            const response = await this.aiInstance.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: this.customContent
                  },
                  {
                    role: 'user',
                    content: question
                  },
                ],
                temperature: 0.7
              });
            
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Erro na chamada da OpenAI:', error);
            return error;
        };     
    };
}
