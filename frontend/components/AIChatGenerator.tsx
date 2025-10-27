import React, { useState, useEffect, useRef } from 'react';
import { createChat } from '../services/geminiService';
import { Question, QuestionType, isValidQuestionType } from '../types';
import type { Chat } from '@google/genai';

interface AIChatGeneratorProps {
    onQuestionsGenerated: (questions: Question[]) => void;
    setIsLoading: (loading: boolean) => void;
}

type Message = {
    role: 'user' | 'model';
    text: string;
};

const AIChatGenerator: React.FC<AIChatGeneratorProps> = ({ onQuestionsGenerated, setIsLoading }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I can help you create survey questions. Just describe what kind of survey you need, and I'll generate questions for you.\n\nFor example: 'Create a customer satisfaction survey for a restaurant with 8-10 questions covering food quality, service, and overall experience.'\n\nWhen you're ready to use the questions, ask me to 'provide the questions in JSON format' and I'll format them properly for export." }
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        setChat(createChat());
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !chat || isGenerating) return;
        
        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsGenerating(true);
        setIsLoading(true);

        try {
            const result = await chat.sendMessageStream({ message: currentInput });
            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of result) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = modelResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsGenerating(false);
            setIsLoading(false);
        }
    };
    
    const handleUseQuestions = () => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
            try {
                let jsonText = lastMessage.text;
                console.log("Raw AI response:", jsonText);
                
                // Try to extract JSON from various formats
                // 1. Look for JSON in markdown code blocks
                let jsonMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
                if (jsonMatch) {
                    jsonText = jsonMatch[1];
                } else {
                    // 2. Look for JSON array in the text (most permissive)
                    jsonMatch = jsonText.match(/(\[[\s\S]*\])/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[1];
                    } else {
                        // 3. Try to find JSON-like content with curly braces
                        jsonMatch = jsonText.match(/(\[[\s\S]*?\{[\s\S]*?\}[\s\S]*\])/);
                        if (jsonMatch) {
                            jsonText = jsonMatch[1];
                        } else {
                            alert("Could not find a valid JSON array in the last response. Please ask the AI to provide the questions in the correct JSON format like:\n\n[{\"questionText\": \"Your question?\", \"type\": \"SHORT_ANSWER\"}]");
                            return;
                        }
                    }
                }
                
                // Clean up the JSON text
                jsonText = jsonText.trim();
                console.log("Extracted JSON text:", jsonText);
                
                // Parse the JSON
                const parsedQuestions = JSON.parse(jsonText);
                console.log("Parsed questions:", parsedQuestions);
                
                // Validate that it's an array
                if (!Array.isArray(parsedQuestions)) {
                    throw new Error("Response is not an array");
                }
                
                // Validate and normalize each question
                const validatedQuestions = parsedQuestions.map((q: any, i: number) => {
                    // Handle different possible property names
                    const questionText = q.questionText || q.question || q.text || q.title;
                    let questionType = q.type || q.questionType || 'SHORT_ANSWER';
                    
                    // Normalize question type to our enum values
                    if (typeof questionType === 'string') {
                        questionType = questionType.toUpperCase();
                        if (questionType === 'MULTIPLE_CHOICE' || questionType === 'MULTIPLE CHOICE' || questionType === 'RADIO') {
                            questionType = QuestionType.MULTIPLE_CHOICE;
                        } else if (questionType === 'SHORT_ANSWER' || questionType === 'SHORT ANSWER' || questionType === 'TEXT' || questionType === 'OPEN_ENDED') {
                            questionType = QuestionType.SHORT_ANSWER;
                        } else if (questionType === 'RATING' || questionType === 'SCALE' || questionType === 'LIKERT') {
                            questionType = QuestionType.RATING;
                        } else {
                            questionType = QuestionType.SHORT_ANSWER; // Default fallback
                        }
                    }
                    
                    if (!questionText) {
                        throw new Error(`Question ${i + 1} is missing question text`);
                    }
                    
                    // Validate the question type
                    if (!isValidQuestionType(questionType)) {
                        console.warn(`Invalid question type "${questionType}" for question ${i + 1}, defaulting to SHORT_ANSWER`);
                        questionType = QuestionType.SHORT_ANSWER;
                    }
                    
                    const normalizedQuestion: Omit<Question, 'id'> = {
                        questionText: questionText.toString().trim(),
                        type: questionType,
                        options: q.options || q.choices || undefined
                    };
                    
                    // Add default options for rating questions
                    if (questionType === QuestionType.RATING && !normalizedQuestion.options) {
                        normalizedQuestion.options = ['1', '2', '3', '4', '5'];
                    }
                    
                    // Validate multiple choice questions have options
                    if (questionType === QuestionType.MULTIPLE_CHOICE && (!normalizedQuestion.options || normalizedQuestion.options.length === 0)) {
                        console.warn(`Multiple choice question ${i + 1} has no options, converting to SHORT_ANSWER`);
                        normalizedQuestion.type = QuestionType.SHORT_ANSWER;
                        normalizedQuestion.options = undefined;
                    }
                    
                    return normalizedQuestion;
                });
                
                const questionsWithIds = validatedQuestions.map((q, i) => ({ 
                    ...q, 
                    id: `ai-${Date.now()}-${i}` 
                }));
                
                console.log("Final questions with IDs:", questionsWithIds);
                onQuestionsGenerated(questionsWithIds);
            } catch (error) {
                console.error("Failed to parse questions:", error);
                alert("The AI's response could not be parsed as valid questions. Please ask the AI to provide questions in this exact format:\n\n[{\"questionText\": \"Your question here?\", \"type\": \"SHORT_ANSWER\"}]\n\nSupported types: SHORT_ANSWER, MULTIPLE_CHOICE, RATING\n\nThen try again.");
            }
        }
    };

    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col flex-1 overflow-hidden">
            <h3 className="font-semibold text-lg text-card-foreground mb-3 flex-shrink-0">Generate with AI Chat</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-3 min-h-0 custom-scrollbar">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                           <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {isGenerating && messages[messages.length-1].role === 'user' && (
                     <div className="flex justify-start">
                         <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-muted text-muted-foreground">
                           <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                 )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 pt-3 border-t border-border">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask AI to generate questions..."
                        className="flex-grow block w-full px-3 py-2 bg-transparent border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        disabled={isGenerating}
                    />
                    <button onClick={handleSend} disabled={isGenerating || !input.trim()} className="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 033.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <button 
                        onClick={() => setInput("Please provide the final questions in JSON format with questionText and type fields so I can use them.")}
                        className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-md hover:bg-muted/80 transition-colors flex items-center space-x-1"
                        disabled={isGenerating}>
                        <span>💡</span>
                        <span>Request JSON Format</span>
                    </button>
                    <div className="text-xs text-muted-foreground/60">
                        Tip: Click this button when you want to export the questions
                    </div>
                </div>
                 <button 
                    onClick={handleUseQuestions}
                    className="w-full mt-2 bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-all duration-200 disabled:bg-muted disabled:text-muted-foreground"
                    disabled={isGenerating || messages[messages.length - 1]?.role !== 'model'}>
                    Use These Questions
                </button>
            </div>
        </div>
    );
};

export default AIChatGenerator;