import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Question } from '../types';
import { createGoogleFormFromQuestions } from '../services/googleFormsService';
import { initializeGoogleAuth, requestGoogleToken } from '../services/googleAuthService';

// Re-using the QuestionPreviewCard component for consistency
const QuestionPreviewCard: React.FC<{ question: Question, onChange: (id: string, newText: string) => void }> = ({ question, onChange }) => {
    return (
        <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
            <textarea
                value={question.questionText}
                onChange={(e) => onChange(question.id, e.target.value)}
                className="w-full text-sm font-medium text-foreground border-none focus:ring-1 focus:ring-primary rounded-md p-2 resize-none bg-muted/50"
                rows={2}
            />
            <p className="text-xs text-muted-foreground mt-2 uppercase font-semibold">{question.type.replace('_', ' ')}</p>
            {question.type === 'MULTIPLE_CHOICE' && question.options && (
                <div className="mt-3 space-y-2">
                    {question.options.map((option, index) => (
                        <div key={index} className="flex items-center">
                            <input type="radio" name={question.id} className="h-4 w-4 text-primary focus:ring-primary border-border" readOnly />
                            <label className="ml-3 block text-sm text-foreground">{option}</label>
                        </div>
                    ))}
                </div>
            )}
            {question.type === 'RATING' && (
                 <div className="mt-3 flex space-x-2">
                    {[1,2,3,4,5].map(rating => (
                        <span key={rating} className="w-8 h-8 flex items-center justify-center border border-border rounded-full text-sm text-muted-foreground">{rating}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

const ComparisonPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Extract state passed from the dashboard
    const { questions: initialQuestions, documentText, documentName } = location.state || {};
    
    // Debug logging to verify what data we received
    console.log('📄 ComparisonPage Debug Info:');
    console.log('Document Name:', documentName);
    console.log('Document Text Length:', documentText?.length || 0);
    console.log('Questions Count:', initialQuestions?.length || 0);
    console.log('Document Text Preview:', documentText?.substring(0, 200) + '...');
    
    const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isCreatingGoogleForm, setIsCreatingGoogleForm] = useState<boolean>(false);
    const [googleFormUrl, setGoogleFormUrl] = useState<string | null>(null);
    const [googleApiError, setGoogleApiError] = useState<string | null>(null);

    useEffect(() => {
        // If state is missing, the user probably navigated here directly.
        // Redirect them back to the dashboard.
        if (!initialQuestions || !documentText || !documentName) {
            navigate('/dashboard');
        }
    }, [initialQuestions, documentText, documentName, navigate]);

    useEffect(() => {
        const initGoogle = async () => {
            try {
                const client = await initializeGoogleAuth();
                setTokenClient(client);
            } catch (error) {
                console.error('Failed to initialize Google Auth:', error);
                setGoogleApiError('Failed to initialize Google authentication');
            }
        };
        initGoogle();
    }, []);

    const handleQuestionChange = (id: string, newText: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? {...q, questionText: newText} : q));
    };

    const handleGoogleSignIn = async () => {
        if (!tokenClient) {
            setGoogleApiError("Google Sign-In is not ready yet. Please try again in a moment.");
            return;
        }

        try {
            const token = await requestGoogleToken(tokenClient);
            setAccessToken(token);
            setGoogleApiError(null);
        } catch (error) {
            if (error instanceof Error) {
                setGoogleApiError(error.message);
            } else {
                setGoogleApiError("Failed to authenticate with Google");
            }
        }
    };

    const handleCreateGoogleForm = async () => {
        console.log("Creating Google Form with questions:", questions);
        
        if (!questions.length) {
            setGoogleApiError("No questions to create form with");
            return;
        }

        if (!accessToken) {
            await handleGoogleSignIn();
            return;
        }

        setIsCreatingGoogleForm(true);
        setGoogleApiError(null);
        setGoogleFormUrl(null);

        try {
            const formTitle = `Survey: ${documentName}`;
            const formDescription = `Generated survey based on the document: ${documentName}`;
            
            console.log("Form title:", formTitle);
            console.log("Form description:", formDescription);
            console.log("Questions to process:", questions);
            
            const url = await createGoogleFormFromQuestions(
                questions, 
                accessToken, 
                formTitle, 
                formDescription
            );
            
            console.log("Google Form created successfully:", url);
            setGoogleFormUrl(url);
        } catch (error) {
            console.error("Error creating Google Form:", error);
            if (error instanceof Error) {
                setGoogleApiError(error.message);
            } else {
                setGoogleApiError("An unknown error occurred while creating the Google Form.");
            }
        } finally {
            setIsCreatingGoogleForm(false);
        }
    };

    if (!initialQuestions) {
        // Render nothing or a loader while redirecting
        return null;
    }

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Left Pane: Original Document */}
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
                        <h3 className="font-semibold text-lg text-card-foreground mb-3 pb-3 border-b border-border flex-shrink-0">
                            Original Document: <span className="font-normal">{documentName}</span>
                        </h3>
                        <div className="overflow-y-auto flex-1 pr-2 min-h-0 custom-scrollbar">
                            <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans">{documentText}</pre>
                        </div>
                    </div>

                    {/* Right Pane: Generated Survey */}
                    <div className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
                        <h3 className="font-semibold text-lg text-card-foreground mb-3 pb-3 border-b border-border flex-shrink-0">
                            Generated Survey (Editable)
                        </h3>
                        <div className="overflow-y-auto flex-1 pr-2 space-y-3 mb-3 min-h-0 custom-scrollbar">
                           {questions.map(q => <QuestionPreviewCard key={q.id} question={q} onChange={handleQuestionChange} />)}
                        </div>
                        <div className="space-y-3 pt-3 border-t border-border flex-shrink-0">
                            {/* Google Forms Integration */}
                            <div className="space-y-3">
                                {!accessToken ? (
                                    <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center px-4 py-3 border border-border text-sm font-medium rounded-lg shadow-sm text-foreground bg-card hover:bg-muted transition-colors">
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        Sign in with Google to Create Form
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleCreateGoogleForm} 
                                        disabled={isCreatingGoogleForm} 
                                        className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isCreatingGoogleForm ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Google Form'
                                        )}
                                    </button>
                                )}

                                {googleApiError && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                        <p className="text-sm text-red-600 dark:text-red-400">{googleApiError}</p>
                                    </div>
                                )}

                                {googleFormUrl && (
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                        <p className="text-sm text-green-800 dark:text-green-200">
                                            Success! Your Google Form is ready.{' '}
                                            <a href={googleFormUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-green-600 dark:hover:text-green-300">
                                                View Form
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* PDF Download (placeholder) */}
                            <button className="w-full bg-secondary text-secondary-foreground font-semibold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-opacity">
                                Download as PDF
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ComparisonPage;