
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  RATING = 'RATING',
}

// Type guard to check if a string is a valid QuestionType
export const isValidQuestionType = (type: string): type is QuestionType => {
  return Object.values(QuestionType).includes(type as QuestionType);
};

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  options?: string[];
}

export interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
  content: string; // Base64 or plain text content
}
