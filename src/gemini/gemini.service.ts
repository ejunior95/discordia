import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";

@Injectable()
export class GeminiService {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    async execute() {
        try {
            const { text } = await this.aiInstance.models.generateContent({
                model: "gemini-2.0-flash",
                contents: "Explain how AI works",
            });
            return text;
        } catch (error) {
            console.error(error);
            return error;
        };        
    };

}
