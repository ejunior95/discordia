import { Injectable } from '@nestjs/common';
import OpenAI from "openai";
@Injectable()
export class ChatGptService {
    aiInstance = new OpenAI();
    
    async execute() {
        try {
            const { output_text } = await this.aiInstance.responses.create({
                model: "gpt-4o",
                input: "Write a one-sentence bedtime story about a unicorn."
            });
            return output_text;
        } catch (error) {
            console.error(error);
            return error;
        };     
    };
}
