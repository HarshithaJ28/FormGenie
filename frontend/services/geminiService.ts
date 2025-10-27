import { GoogleGenAI, Type, Chat } from "@google/genai";
import { Question, QuestionType } from '../types';

// Use environment variables for API key (Vite format)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will not work.");
  console.warn("Please add VITE_GEMINI_API_KEY=your_api_key to your .env.local file");
}

console.log('🔑 Gemini Service API Key status:', API_KEY ? '✅ Configured' : '❌ Missing');
const ai = new GoogleGenAI({ apiKey: API_KEY || "YOUR_API_KEY_HERE" });

const surveyQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        questionText: {
            type: Type.STRING,
            description: "The text of the survey question."
        },
        type: {
            type: Type.STRING,
            enum: [QuestionType.MULTIPLE_CHOICE, QuestionType.SHORT_ANSWER, QuestionType.RATING],
            description: "The type of the question."
        },
        options: {
            type: Type.ARRAY,
            description: "An array of possible answers. Only for MULTIPLE_CHOICE type.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ["questionText", "type"]
};

// Backend-style FormData interface for integration
interface BackendFormData {
    title: string;
    description?: string;
    questions: BackendQuestion[];
}

interface BackendQuestion {
    type: 'multiple_choice' | 'checkbox' | 'short_answer' | 'long_answer';
    text: string;
    options?: string[];
    is_required?: boolean;
}

// Enhanced schema using backend's approach
const backendFormSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: 'A concise title for the form.',
        },
        description: {
            type: Type.STRING,
            description: 'An optional brief description or instructions for the form.',
        },
        questions: {
            type: Type.ARRAY,
            description: 'A list of all questions identified in the text.',
            items: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        description: "The type of question. Must be one of: 'multiple_choice', 'checkbox', 'short_answer', 'long_answer'.",
                        enum: ['multiple_choice', 'checkbox', 'short_answer', 'long_answer'],
                    },
                    text: {
                        type: Type.STRING,
                        description: 'The full text of the question.',
                    },
                    options: {
                        type: Type.ARRAY,
                        description: 'A list of options for multiple_choice or checkbox questions. Should be empty for other types.',
                        items: {
                            type: Type.STRING,
                        },
                    },
                    is_required: {
                        type: Type.BOOLEAN,
                        description: 'Whether the question is mandatory. Defaults to false.',
                    },
                },
                required: ['type', 'text'],
            },
        },
    },
    required: ['title', 'questions'],
};

// Convert backend question type to frontend question type
const mapBackendToFrontendType = (backendType: string): QuestionType => {
    switch (backendType) {
        case 'multiple_choice':
            return QuestionType.MULTIPLE_CHOICE;
        case 'short_answer':
        case 'long_answer':
            return QuestionType.SHORT_ANSWER;
        case 'checkbox':
            // Map checkbox to multiple choice for now as frontend doesn't have checkbox type
            return QuestionType.MULTIPLE_CHOICE;
        default:
            return QuestionType.SHORT_ANSWER;
    }
};

// Convert backend response to frontend format
const convertBackendToFrontend = (backendData: BackendFormData): Question[] => {
    return backendData.questions.map((q, index) => ({
        id: `${Date.now()}-${index}`,
        questionText: q.text,
        type: mapBackendToFrontendType(q.type),
        options: q.options || undefined,
    }));
};

export const generateSurveyFromText = async (documentText: string): Promise<Question[]> => {
    // Debug logging to see what content we're receiving
    console.log('🔍 Gemini Service Debug Info:');
    console.log('API Key Status:', API_KEY ? '✅ Available' : '❌ Missing');
    console.log('Document Text Length:', documentText?.length || 0);
    console.log('Document Text Preview (first 300 chars):', documentText?.substring(0, 300) + '...');
    
    if (!API_KEY) {
        console.log("No API Key, returning mock data.");
        // Simulate API delay and return mock data if no API key is present
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { id: '1', questionText: 'What is the main topic of the document?', type: QuestionType.SHORT_ANSWER },
                    { id: '2', questionText: 'How would you rate the clarity of the document?', type: QuestionType.RATING, options: ['1', '2', '3', '4', '5'] },
                    { id: '3', questionText: 'Which section was most helpful?', type: QuestionType.MULTIPLE_CHOICE, options: ['Introduction', 'Methodology', 'Results', 'Conclusion'] }
                ]);
            }, 1500);
        });
    }

    if (!documentText.trim()) {
        throw new Error("Input text cannot be empty.");
    }

    // Use backend's comprehensive prompt for better results
    const prompt = `
        You are an expert AI assistant named FormGenie. Your task is to analyze the following raw text and convert it into a structured JSON format suitable for creating a web form.

        Instructions:
        1.  Identify a suitable title and an optional description for the form based on the text's content.
        2.  Detect all questions within the text.
        3.  For each question, accurately classify its type as one of: 'multiple_choice', 'checkbox', 'short_answer', or 'long_answer'.
            - 'multiple_choice': Use for questions where only one answer can be selected from a list (e.g., radio buttons).
            - 'checkbox': Use for questions where multiple answers can be selected.
            - 'short_answer': Use for questions requiring a brief, single-line text response.
            - 'long_answer': Use for questions requiring a detailed, multi-line text response.
        4.  Extract all options for 'multiple_choice' and 'checkbox' questions.
        5.  Determine if a question seems mandatory and set 'is_required' to true. Default to false if unsure.
        6.  Return a single, valid JSON object that strictly adheres to the provided schema.

        Raw text to analyze:
        ---
        ${documentText}
        ---
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: backendFormSchema,
            },
        });

        const jsonText = response.text.trim();
        const backendData = JSON.parse(jsonText) as BackendFormData;
        
        // Convert backend format to frontend format
        return convertBackendToFrontend(backendData);
        
    } catch (error) {
        console.error("Error generating survey from text:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate survey: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the survey.");
    }
};

export const createChat = (): Chat => {
    if (!API_KEY) {
        // Mock chat for environments without an API key
        return {
            sendMessageStream: async function* (params: { message: string }) {
                 await new Promise(resolve => setTimeout(resolve, 500));
                 const mockResponseText = `Sure, here are the questions as requested:
[
    { "questionText": "What is your primary goal for using our product?", "type": "SHORT_ANSWER" },
    { "questionText": "How satisfied are you with the user interface?", "type": "RATING" },
    { "questionText": "Which feature do you find most valuable?", "type": "MULTIPLE_CHOICE", "options": ["Dashboard", "Reporting", "Integrations"] }
]
`;
                for (let i = 0; i < mockResponseText.length; i += 15) {
                    yield { text: mockResponseText.substring(i, i + 15) };
                    await new Promise(r => setTimeout(r, 50));
                }
            }
        } as unknown as Chat;
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are an AI assistant helping users create surveys. Your goal is to generate clear and effective survey questions based on user requests.

IMPORTANT: When providing final questions for the user to use, format them as a valid JSON array. Example:

[
  {
    "questionText": "How satisfied are you with our service?",
    "type": "MULTIPLE_CHOICE",
    "options": ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"]
  },
  {
    "questionText": "What is your age?",
    "type": "SHORT_ANSWER"
  },
  {
    "questionText": "Rate our customer support (1-5)",
    "type": "RATING"
  }
]

Valid types are: 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'RATING'
- For MULTIPLE_CHOICE questions, always include an "options" array
- For SHORT_ANSWER and RATING questions, do not include options
- Always include "questionText" and "type" for every question

You can wrap the JSON in markdown code blocks if needed, or provide it as plain text. The system will extract the JSON array automatically.`,
        },
    });
};
