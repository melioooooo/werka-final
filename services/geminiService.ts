import { GoogleGenAI } from "@google/genai";
import { FlowerType } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateBouquetImage = async (flowers: FlowerType[]): Promise<string> => {
  if (!API_KEY) {
    console.warn("API Key is missing. Using fallback image.");
    // Return a generated SVG placeholder
    const svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#fef3c7"/>
        <circle cx="256" cy="256" r="200" fill="#fde68a"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="24" fill="#92400e">
          No API Key Detected
        </text>
        <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="#b45309">
          (Check console)
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Count flowers for better prompt
  const counts = flowers.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const flowerDescription = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');

  const prompt = `
    A stunning, high-resolution pixel art masterpiece of a hand-tied flower bouquet sitting on a rustic wooden table.
    The bouquet contains: ${flowerDescription}.
    The lighting is warm and golden hour style, casting soft shadows. 
    The art style is reminiscent of 16-bit or 32-bit RPGs but with high fidelity and vibrant colors.
    A cozy, cottagecore aesthetic.
  `;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No images returned from Gemini");
    }
  } catch (error) {
    console.error("Failed to generate bouquet:", error);
    // Fallback for development or error cases
    return "https://picsum.photos/512/512?grayscale";
  }
};