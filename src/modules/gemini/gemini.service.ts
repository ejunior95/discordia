import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";
import { getCustomContent } from 'src/config/getCustomContent';

@Injectable()
export class GeminiService {
  private aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  customContent: string = getCustomContent('gemini');

  async execute(question: string) {
    try {
      const fullPrompt = `${this.customContent} Dito isso, minha pergunta é ${question}`
      const { text } = await this.aiInstance.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
            {
                role: "user",
                parts: [ { text: fullPrompt } ]
            },
        ],
      });
      return text;
    } catch (error) {
      console.error('Erro na chamada do Gemini:', error);
      return error;
    };
  };
}