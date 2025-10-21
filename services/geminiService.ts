import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Sends an image and a text prompt to the Gemini API for editing.
 * @param base64Image The base64-encoded image data (without the data URL prefix).
 * @param mimeType The MIME type of the image (e.g., 'image/png').
 * @param prompt The text command for the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const editImageWithNanoBanana = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = response.candidates?.[0];

        if (candidate && candidate.content && Array.isArray(candidate.content.parts)) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    const newBase64 = part.inlineData.data;
                    const newMimeType = part.inlineData.mimeType;
                    return `data:${newMimeType};base64,${newBase64}`;
                }
            }
        }
        
        // If we reach here, no image data was found. Provide a more specific error.
        const finishReason = candidate?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
             throw new Error(`Image generation failed. Reason: ${finishReason}. This can happen if the prompt violates safety policies.`);
        }
        
        throw new Error("No image data found in the AI's response. The model may have refused the request.");

    } catch (error) {
        console.error("Error editing image with Gemini:", error);
        
        let userFriendlyError = "Failed to edit image due to an unexpected issue. Please try again later.";

        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('api key not valid')) {
                userFriendlyError = 'There is an issue with the API configuration. The provided API key is invalid.';
            } else if (errorMessage.includes('safety')) {
                userFriendlyError = 'Your request could not be processed due to safety policies. Please modify your prompt and try again.';
            } else if (errorMessage.includes('no image data found')) {
                userFriendlyError = "The AI couldn't generate an image for this request. Try rephrasing your prompt or using a different image.";
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                userFriendlyError = "A network error occurred. Please check your internet connection and try again.";
            } else {
                userFriendlyError = error.message;
            }
        }
        
        throw new Error(userFriendlyError);
    }
};


/**
 * Generates creative prompt suggestions for an image.
 * @param base64Image The base64-encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to an array of string suggestions.
 */
export const getPromptSuggestions = async (
    base64Image: string,
    mimeType: string
): Promise<string[]> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: `Based on this image, suggest 3 creative and interesting prompts for an AI image editor. The prompts should be short (5-10 words), actionable, and inspiring. Return the suggestions as a valid JSON array of strings. Example: ["Add a magical glow", "Turn it into a watercolor painting", "Change the season to winter"]`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const suggestions = JSON.parse(jsonText);

        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions;
        } else {
            throw new Error("AI response was not in the expected format (array of strings).");
        }

    } catch (error) {
        console.error("Error getting prompt suggestions:", error);
        
        let userFriendlyError = "Failed to generate AI suggestions. Please try again.";

        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('api key not valid')) {
                userFriendlyError = 'Could not get suggestions due to an API configuration issue.';
            } else if (errorMessage.includes('safety')) {
                userFriendlyError = 'Suggestions could not be generated for this image due to safety policies.';
            } else if (errorMessage.includes('expected format')) {
                userFriendlyError = "The AI returned an unexpected response for suggestions. Please try again.";
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                userFriendlyError = "Network error while fetching suggestions. Please check your connection.";
            } else if (error.message) {
                userFriendlyError = error.message;
            }
        }
    
        throw new Error(userFriendlyError);
    }
};