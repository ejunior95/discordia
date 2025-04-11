import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from "@google/genai";
import { getCustomContent } from 'src/config/getCustomContent';

@Injectable()
export class GeminiService {
  private aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  customContent: string = getCustomContent('gemini');

  async execute() {
    try {
      const { text } = await this.aiInstance.models.generateContent({
        model: "gemini-flash-thinking",
        contents: [
            {
                role: "system",
                parts: [ { text: this.customContent } ]
            }
        ],
      });
      return text;
    } catch (error) {
      console.error('Erro na chamada do Gemini:', error);
      return error;
    };
  };
}