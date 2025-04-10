import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
@Injectable()
export class DeepseekService {
    aiInstance = new OpenAI({
        baseURL: process.env.DEEPSEEK_API_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
    });
    
    async execute() {
        try {
            const response = await this.aiInstance.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: "You are a helpful assistant."
                    }
                ],
                model: "deepseek-chat",
              });
            return response.choices[0].message.content;
        } catch (error) {
            console.error(error);
            return error;
        };   
    };
}
