import { Question as FrontendQuestion, QuestionType as FrontendQuestionType } from '../types';

// Backend-compatible types for Google Forms API
export enum BackendQuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  CHECKBOX = 'checkbox',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
}

export interface BackendQuestion {
  type: BackendQuestionType;
  text: string;
  options?: string[];
  is_required?: boolean;
}

export interface BackendFormData {
  title: string;
  description?: string;
  questions: BackendQuestion[];
}

// Convert frontend question types to backend question types
const mapFrontendToBackendType = (frontendType: FrontendQuestionType): BackendQuestionType => {
  switch (frontendType) {
    case FrontendQuestionType.MULTIPLE_CHOICE:
      return BackendQuestionType.MULTIPLE_CHOICE;
    case FrontendQuestionType.SHORT_ANSWER:
      return BackendQuestionType.SHORT_ANSWER;
    case FrontendQuestionType.RATING:
      // Map rating to multiple choice for Google Forms
      return BackendQuestionType.MULTIPLE_CHOICE;
    default:
      return BackendQuestionType.SHORT_ANSWER;
  }
};

// Sanitize text for Google Forms API (remove newlines and excessive whitespace)
const sanitizeTextForGoogleForms = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/\r\n/g, ' ') // Replace Windows line breaks with spaces
    .replace(/\n/g, ' ')   // Replace Unix line breaks with spaces
    .replace(/\r/g, ' ')   // Replace Mac line breaks with spaces
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim();               // Remove leading/trailing whitespace
};

// Convert frontend questions to backend format
const convertFrontendToBackend = (questions: FrontendQuestion[], formTitle: string, formDescription?: string): BackendFormData => {
  return {
    title: sanitizeTextForGoogleForms(formTitle),
    description: formDescription ? sanitizeTextForGoogleForms(formDescription) : undefined,
    questions: questions.map(q => ({
      type: mapFrontendToBackendType(q.type),
      text: sanitizeTextForGoogleForms(q.questionText),
      options: q.options?.map(option => sanitizeTextForGoogleForms(option)),
      is_required: false, // Default to not required
    }))
  };
};

// Maps our internal question type to the Google Forms API's choice type enum.
const getChoiceType = (type: BackendQuestionType) => {
  switch (type) {
    case BackendQuestionType.MULTIPLE_CHOICE:
      return 'RADIO';
    case BackendQuestionType.CHECKBOX:
      return 'CHECKBOX';
    default:
      // This function should only be called for choice questions.
      return 'CHOICE_TYPE_UNSPECIFIED';
  }
};

// Constructs a single request object for the batchUpdate endpoint.
const createQuestionRequest = (question: BackendQuestion, index: number) => {
  const { type, text, options, is_required } = question;
  let questionItem: any = {};

  // Sanitize question text to ensure no newlines
  const sanitizedText = sanitizeTextForGoogleForms(text);

  if (type === BackendQuestionType.MULTIPLE_CHOICE || type === BackendQuestionType.CHECKBOX) {
    questionItem.question = {
      required: is_required || false,
      choiceQuestion: {
        type: getChoiceType(type),
        options: options?.map(option => ({ 
          value: sanitizeTextForGoogleForms(option) 
        })) || [],
      },
    };
  } else if (type === BackendQuestionType.SHORT_ANSWER || type === BackendQuestionType.LONG_ANSWER) {
    questionItem.question = {
      required: is_required || false,
      textQuestion: {
        paragraph: type === BackendQuestionType.LONG_ANSWER,
      },
    };
  } else {
    // Skip unsupported question types
    return null;
  }

  return {
    createItem: {
      item: {
        title: sanitizedText,
        questionItem,
      },
      location: {
        index,
      },
    },
  };
};

export const createGoogleForm = async (formData: BackendFormData, token: string): Promise<string> => {
  try {
    // 1. Create a new, blank form to get a formId
    const sanitizedTitle = sanitizeTextForGoogleForms(formData.title);
    const createFormResponse = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        info: {
          title: sanitizedTitle,
          documentTitle: sanitizedTitle,
        },
      }),
    });

    if (!createFormResponse.ok) {
      const error = await createFormResponse.json();
      console.error('Google Forms API Error:', error);
      throw new Error(`Google API Error (Create): ${error.error?.message || 'Failed to create form'}`);
    }

    const newForm = await createFormResponse.json();
    const formId = newForm.formId;

    // 2. Prepare a batch update to add all questions and the description
    const requests: any[] = formData.questions
      .map((q, i) => createQuestionRequest(q, i))
      .filter(Boolean); // Filter out any null requests for unsupported types

    // Add the form description as the first update request
    if (formData.description) {
      const sanitizedDescription = sanitizeTextForGoogleForms(formData.description);
      requests.unshift({
        updateFormInfo: {
          info: {
            description: sanitizedDescription,
          },
          updateMask: 'description',
        },
      });
    }

    if (requests.length === 0) {
      // If there are no questions, we can just return the form link
      return newForm.responderUri;
    }

    // 3. Send the batch update request
    const batchUpdateResponse = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests,
      }),
    });

    if (!batchUpdateResponse.ok) {
      const error = await batchUpdateResponse.json();
      console.error('Google Forms Batch Update Error:', error);
      throw new Error(`Google API Error (Update): ${error.error?.message || 'Failed to update form'}`);
    }

    return newForm.responderUri;

  } catch (error) {
    console.error("Failed to create Google Form:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while creating the Google Form.");
  }
};

// Frontend-compatible function to create Google Form from frontend questions
export const createGoogleFormFromQuestions = async (
  questions: FrontendQuestion[], 
  token: string, 
  formTitle: string = "Generated Survey",
  formDescription?: string
): Promise<string> => {
  const backendFormData = convertFrontendToBackend(questions, formTitle, formDescription);
  return await createGoogleForm(backendFormData, token);
};