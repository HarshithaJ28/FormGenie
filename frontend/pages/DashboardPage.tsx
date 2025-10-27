import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Document, Question } from '../types';
import { generateSurveyFromText } from '../services/geminiService';
import { processUploadedFile, isSupportedFileType, getFileTypeDescription } from '../services/documentExtractionService';
import AIChatGenerator from '../components/AIChatGenerator';


// Sample text similar to backend
const sampleText = `
Student Feedback Survey

Course Name: Introduction to Artificial Intelligence
Please provide your honest feedback to help us improve this course.

1. How would you rate the overall quality of this course?
- Excellent
- Good
- Average
- Poor

2. Which topics did you find most interesting? (Select all that apply)
[ ] Machine Learning Fundamentals
[ ] Natural Language Processing
[ ] Computer Vision
[ ] Reinforcement Learning

3. Please provide any specific suggestions for improving the course content.

4. Your Name (Optional)
`;

const MOCK_DOCUMENTS: Document[] = [
    { 
        id: 'doc1', 
        name: 'Project Proposal.pdf', 
        uploadedAt: '2023-10-26', 
        size: '1.2 MB', 
        content: `Project Proposal: Task Management Mobile Application

Executive Summary:
This document outlines the development of a new mobile application for task management that will revolutionize how individuals and teams organize their work.

Project Goals:
• Develop an intuitive mobile task management solution
• Implement real-time collaboration features
• Ensure cross-platform compatibility (iOS and Android)
• Create seamless integration with existing productivity tools

Timeline:
Phase 1: Research and Planning (Weeks 1-4)
Phase 2: Design and Prototyping (Weeks 5-8)
Phase 3: Development (Weeks 9-20)
Phase 4: Testing and Launch (Weeks 21-24)

Required Resources:
- Development team of 5 engineers
- UI/UX designer
- Product manager
- Quality assurance specialist
- Budget: $150,000

Key Features:
1. Task creation and management
2. Team collaboration tools
3. Progress tracking and analytics
4. Integration with calendar systems
5. Offline functionality

Success Metrics:
- User adoption rate > 10,000 downloads in first month
- User retention rate > 60% after 30 days
- Average user rating > 4.2 stars

This project represents a significant opportunity to establish our presence in the productivity app market.` 
    },
    { 
        id: 'doc2', 
        name: 'User Research Findings.docx', 
        uploadedAt: '2023-10-24', 
        size: '3.5 MB', 
        content: `User Research Report: Task Management App Study

Research Overview:
Conducted comprehensive user research sessions with 50 participants to understand current task management behaviors and preferences.

Key Findings:

1. User Pain Points:
• Current apps are too complex and overwhelming
• Lack of intuitive interface design
• Poor offline functionality
• Limited collaboration features
• Difficulty in organizing tasks by priority

2. User Preferences:
• Simple, clean interface design
• Quick task creation process
• Visual progress indicators
• Team collaboration capabilities
• Seamless synchronization across devices

3. Feature Priorities (Ranked by Importance):
1. Easy task creation and editing
2. Deadline and reminder notifications
3. Team sharing and collaboration
4. Progress tracking and analytics
5. Integration with calendar apps
6. Offline access to tasks
7. Customizable categories and tags

User Personas:

Persona 1: "Busy Professional Sarah"
- Age: 28-35
- Uses multiple productivity tools
- Needs quick task capture on mobile
- Values integration with work systems

Persona 2: "Team Leader Marcus"
- Age: 32-45
- Manages team projects
- Needs collaboration features
- Values progress visibility

Persona 3: "Student Alex"
- Age: 18-25
- Manages academic and personal tasks
- Budget-conscious
- Values simplicity and ease of use

Recommendations:
• Focus on simplicity and ease of use
• Prioritize offline functionality
• Implement robust team collaboration features
• Design for mobile-first experience
• Ensure quick onboarding process

User Journey Mapping:
The research identified three critical user journeys that must be optimized for success in the task management market.` 
    },
    { 
        id: 'doc3', 
        name: 'Marketing Strategy Q3.pdf', 
        uploadedAt: '2023-10-22', 
        size: '890 KB', 
        content: `Q3 Marketing Strategy: Digital Campaign Launch

Campaign Overview:
Launch comprehensive digital marketing campaign to increase brand awareness and drive user acquisition for our task management application.

Target Objectives:
• Increase brand awareness by 40%
• Generate 25,000 new app downloads
• Achieve 15% conversion rate from free to premium
• Build social media following to 50K+ across platforms

Marketing Channels:

1. Social Media Marketing:
   Platform Focus: Instagram, LinkedIn, Twitter, TikTok
   Content Strategy:
   • Daily productivity tips and hacks
   • User success stories and testimonials
   • Behind-the-scenes development content
   • Interactive polls and Q&A sessions

2. Content Marketing:
   Blog Topics:
   • "10 Productivity Hacks for Remote Workers"
   • "How to Build Better Team Collaboration"
   • "The Science of Task Management"
   • "From Chaos to Clarity: Organizing Your Digital Life"

3. Influencer Partnerships:
   • Collaborate with productivity and business influencers
   • Partner with team management experts
   • Sponsor productivity-focused YouTube channels

Campaign Timeline:
Week 1-2: Campaign setup and content creation
Week 3-4: Soft launch and initial content distribution
Week 5-8: Full campaign launch across all channels
Week 9-10: Optimization and performance analysis
Week 11-12: Campaign wrap-up and reporting

Budget Allocation:
• Social Media Ads: 40% ($20,000)
• Content Creation: 25% ($12,500)
• Influencer Partnerships: 20% ($10,000)
• Email Marketing: 10% ($5,000)
• Analytics and Tools: 5% ($2,500)

Success Metrics:
• Cost per acquisition (CPA) under $15
• Click-through rates above 3.5%
• Engagement rate above 6%
• Email open rates above 25%
• Social media follower growth of 200% in Q3

This integrated approach will position our app as the go-to solution for modern task management needs.` 
    },
    { id: 'sample', name: 'Sample Survey Text', uploadedAt: new Date().toISOString().split('T')[0], size: `${(new Blob([sampleText]).size / 1024).toFixed(2)} KB`, content: sampleText.trim() }
];

const UploadCard: React.FC<{ 
    onFileSelect: (file: File) => void; 
    loading: boolean; 
    onUseSample: () => void;
    uploadProgress?: number;
    extractionStatus?: string;
}> = ({ onFileSelect, loading, onUseSample, uploadProgress, extractionStatus }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            onFileSelect(event.target.files[0]);
        }
    };

    return (
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-card-foreground">Upload New Document</h3>
                <button 
                    onClick={onUseSample}
                    className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                    disabled={loading}
                >
                    Use Sample
                </button>
            </div>
            
            {loading && (
                <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <span>{extractionStatus || 'Processing document...'}</span>
                        {uploadProgress !== undefined && <span>{uploadProgress}%</span>}
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress || 0}%` }}
                        ></div>
                    </div>
                </div>
            )}
            
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept=".pdf,.docx,.txt,.doc,.rtf,.odt" 
                    disabled={loading} 
                />
                <label htmlFor="file-upload" className={`cursor-pointer ${loading ? 'opacity-50' : ''}`}>
                    <svg className="mx-auto h-12 w-12 text-muted-foreground/50" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground/80">TXT, DOCX, PDF, DOC, RTF, ODT (MAX. 10MB)</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">✅ All formats supported with automatic processing | 📄 PDF: 6-method AI-powered system with corruption detection + Gemini text reconstruction</p>
                </label>
            </div>
        </div>
    );
};

const PreviousDocumentsList: React.FC<{ onSelect: (doc: Document) => void }> = ({ onSelect }) => (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border mt-6">
        <h3 className="font-semibold text-lg text-card-foreground mb-4">Previous Documents</h3>
        <ul className="space-y-3 max-h-60 overflow-y-auto">
            {MOCK_DOCUMENTS.map(doc => (
                <li key={doc.id} onClick={() => onSelect(doc)} className="flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                        <svg className="w-6 h-6 text-primary/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.size}</p>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const IconDocumentUpload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const IconChatBubble = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -ml-1 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.456L20.25 18l-1.197.398a3.375 3.375 0 00-2.456 2.456z" /></svg>;

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [documentContent, setDocumentContent] = useState<string>(''); // Raw original content for preview
    const [processedDocumentContent, setProcessedDocumentContent] = useState<string>(''); // AI-processed content for form generation
    const [sanitizedDocumentContent, setSanitizedDocumentContent] = useState<string>(''); // Sanitized for Google Forms
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationMode, setGenerationMode] = useState<'upload' | 'ai'>('upload');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [extractionStatus, setExtractionStatus] = useState<string>('');


    const handleFileSelect = async (file: File) => {
        setSelectedFile(file);
        setError(null);
        setUploadProgress(0);
        setExtractionStatus('');
        
        // Basic validation
        if (!isSupportedFileType(file)) {
            setError(`Unsupported file type: ${getFileTypeDescription(file) || file.type}. Please use TXT files.`);
            return;
        }

        const newDoc: Document = {
            id: 'new',
            name: file.name,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            uploadedAt: new Date().toISOString(),
            content: ''
        };
        setSelectedDocument(newDoc);
        setIsLoading(true);
        
        try {
            setExtractionStatus('Analyzing document...');
            
            const result = await processUploadedFile(file, (progress) => {
                setUploadProgress(progress);
                if (progress < 30) {
                    setExtractionStatus('Validating file...');
                } else if (progress < 80) {
                    setExtractionStatus('Extracting content...');
                } else {
                    setExtractionStatus('Finalizing...');
                }
            });
            
            // Update document with extracted content
            newDoc.content = result.originalContent; // Store original for preview
            setDocumentContent(result.originalContent); // Raw content for preview display
            setProcessedDocumentContent(result.processedContent); // AI-processed for form generation
            setSanitizedDocumentContent(result.sanitizedContent); // For Google Forms export
            setSelectedDocument({ ...newDoc });
            
            setExtractionStatus(`Successfully extracted ${result.metadata.wordCount} words from ${result.fileType} file`);
            
            // Clear status after a delay
            setTimeout(() => {
                setExtractionStatus('');
                setUploadProgress(0);
            }, 2000);
            
        } catch (error) {
            console.error('File processing error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to process the document';
            
            // Show error message for all file types including PDFs
            setError(errorMessage);
            
            setSelectedDocument(null);
            setDocumentContent('');
            setProcessedDocumentContent('');
            setSanitizedDocumentContent('');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDocSelect = (doc: Document) => {
        setSelectedDocument(doc);
        setDocumentContent(doc.content); // Original content for preview
        
        // For existing documents, use the content as-is for processing (it's already good)
        setProcessedDocumentContent(doc.content);
        
        // Create sanitized version for Google Forms (remove newlines)
        const sanitized = doc.content
            .replace(/\r\n/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        setSanitizedDocumentContent(sanitized);
        
        setSelectedFile(null);
    };

    const handleGenerate = useCallback(async () => {
        if (!selectedDocument) {
            setError("Please select a document first.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Use processed content for AI form generation (cleaned but preserves structure)
            let textToProcess = processedDocumentContent || documentContent;
            if (!textToProcess) {
                throw new Error("Document is empty or could not be read.");
            }
            
            // Ensure we have original content for display
            const displayContent = documentContent || selectedDocument.content;
            if (!displayContent) {
                throw new Error("No document content available for display.");
            }
            
            const questions = await generateSurveyFromText(textToProcess);
            
            // Debug logging to help identify the issue
            console.log('🔍 Navigation Debug Info:');
            console.log('Selected Document:', selectedDocument.name);
            console.log('Original documentContent length:', documentContent?.length || 0);
            console.log('Processed content length:', processedDocumentContent?.length || 0);
            console.log('Display content length:', displayContent?.length || 0);
            console.log('Questions generated:', questions?.length || 0);
            
            navigate('/comparison', {
                state: {
                    questions,
                    documentText: displayContent, // Always pass original content for display
                    documentName: selectedDocument.name,
                }
            });

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedDocument, processedDocumentContent, documentContent, navigate]);
    
    const handleQuestionsFromAI = (questions: Question[]) => {
         navigate('/comparison', {
            state: {
                questions,
                documentText: "Questions were generated using the AI chat.",
                documentName: 'AI Generated Survey',
            }
        });
        setError(null);
    };

    const handleUseSample = () => {
        const sampleDoc = MOCK_DOCUMENTS.find(doc => doc.id === 'sample');
        if (sampleDoc) {
            setSelectedDocument(sampleDoc);
            setDocumentContent(sampleDoc.content); // Original for preview
            setProcessedDocumentContent(sampleDoc.content); // Use content as-is for processing
            
            // Create sanitized version for Google Forms
            const sanitized = sampleDoc.content
                .replace(/\r\n/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/\r/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            setSanitizedDocumentContent(sanitized);
            
            setSelectedFile(null);
            setError(null);
        }
    };



    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Left Pane */}
                    <div className="lg:col-span-1 flex flex-col overflow-hidden">
                         <div className="flex bg-muted rounded-lg p-1 mb-4 flex-shrink-0">
                            <button
                                onClick={() => setGenerationMode('upload')}
                                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${generationMode === 'upload' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:bg-muted/50'}`}
                            >
                                <IconDocumentUpload />
                                From Document
                            </button>
                            <button
                                onClick={() => setGenerationMode('ai')}
                                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${generationMode === 'ai' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:bg-muted/50'}`}
                            >
                                <IconChatBubble />
                                With AI Chat
                            </button>
                        </div>

                        {generationMode === 'upload' ? (
                            <div className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col flex-1 overflow-hidden">
                                <div className='flex-1 overflow-y-auto pr-2 min-h-0 custom-scrollbar'>
                                    <UploadCard 
                                        onFileSelect={handleFileSelect} 
                                        loading={isLoading} 
                                        onUseSample={handleUseSample}
                                        uploadProgress={uploadProgress}
                                        extractionStatus={extractionStatus}
                                    />
                                    <PreviousDocumentsList onSelect={handleDocSelect} />
                                </div>
                                {error && <div className="mt-2 text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md text-sm flex-shrink-0">{error}</div>}
                                <div className="mt-4 flex-shrink-0">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!selectedDocument || isLoading}
                                        className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg shadow-md hover:opacity-90 transition-all duration-300 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <IconSparkles />
                                                Generate & Compare
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <AIChatGenerator
                                onQuestionsGenerated={handleQuestionsFromAI}
                                setIsLoading={setIsLoading}
                            />
                        )}
                    </div>

                    {/* Right Pane */}
                    <div className="lg:col-span-2 bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="font-semibold text-lg text-card-foreground">
                                {generationMode === 'upload' ? 'Document Preview' : 'AI Assistant'}
                            </h3>
                            {generationMode === 'upload' && selectedDocument && documentContent && (
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {documentContent.split(/\s+/).filter(word => word.length > 0).length} words
                                </div>
                            )}
                        </div>
                        
                        {generationMode === 'upload' ? (
                            !selectedDocument ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-lg font-medium mb-2">No Document Selected</p>
                                    <p>Upload a document to see its preview here.</p>
                                    <p className="text-sm mt-2">Supported formats: TXT, PDF, DOCX</p>
                                </div>
                            ) : isLoading && !documentContent ? (
                                /* Loading Animation */
                                <div className="flex flex-col flex-grow min-h-0 animate-in fade-in duration-300">
                                    {/* Document Info Header - Loading */}
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-border flex-shrink-0">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <div className="w-4 h-4 bg-primary/30 rounded animate-pulse"></div>
                                            </div>
                                            <div>
                                                <div className="h-4 bg-muted rounded w-32 animate-pulse mb-1"></div>
                                                <div className="h-3 bg-muted/70 rounded w-16 animate-pulse"></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                            </div>
                                            <span className="text-xs text-primary font-medium">Processing...</span>
                                        </div>
                                    </div>
                                    
                                    {/* Document Content - Skeleton */}
                                    <div className="flex-grow overflow-hidden space-y-3 p-2">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className="space-y-2 animate-pulse">
                                                <div className={`h-3 bg-muted rounded ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/5'}`}></div>
                                                <div className={`h-3 bg-muted/70 rounded ${i % 2 === 0 ? 'w-3/4' : 'w-5/6'}`}></div>
                                                {i % 4 === 0 && <div className="h-3 bg-muted/50 rounded w-1/2"></div>}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Processing Status */}
                                    <div className="flex-shrink-0 mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-primary font-medium">
                                                    {extractionStatus || 'Extracting content...'}
                                                </p>
                                                {uploadProgress > 0 && (
                                                    <div className="mt-2">
                                                        <div className="w-full bg-primary/20 rounded-full h-1.5">
                                                            <div 
                                                                className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out" 
                                                                style={{ width: `${uploadProgress}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-xs text-primary/70 mt-1">{uploadProgress}% complete</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <div className="flex flex-col flex-grow min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Document Info Header */}
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border flex-shrink-0">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center animate-in zoom-in duration-300">
                                            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="animate-in slide-in-from-left-2 duration-300 delay-75">
                                            <h4 className="font-medium text-foreground text-sm">{selectedDocument.name}</h4>
                                            <p className="text-xs text-muted-foreground">{selectedDocument.size}</p>
                                        </div>
                                    </div>
                                    
                                    {extractionStatus && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded animate-in slide-in-from-right-2 duration-300">
                                            ✓ {extractionStatus}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Document Content */}
                                <div className="flex-grow overflow-y-auto custom-scrollbar">
                                    {!documentContent ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <div className="text-center animate-in fade-in duration-500">
                                                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                </svg>
                                                <p>No content extracted</p>
                                                <p className="text-xs">The document appears to be empty</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none dark:prose-invert animate-in fade-in slide-in-from-bottom-1 duration-700 delay-200">
                                            <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                                                {documentContent}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )
                        ) : (
                            /* AI Mode Content */
                            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-6">
                                {/* AI Icon with gradient background */}
                                <div className="relative mb-6 flex justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl"></div>
                                    <div className="relative bg-gradient-to-r from-primary to-blue-500 p-4 rounded-2xl shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Main heading */}
                                <h2 className="text-2xl font-bold text-foreground mb-3 text-center">AI Form Generator</h2>
                                
                                {/* Subtitle */}
                                <p className="text-muted-foreground text-base mb-8 leading-relaxed text-center">
                                    Describe your form requirements and let AI create professional survey questions for you
                                </p>

                                {/* Instructions card */}
                                <div className="w-full bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 rounded-xl p-6 mb-6 backdrop-blur-sm">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                                            <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground text-sm mb-3 text-center">Pro Tips for Best Results</h3>
                                            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                                <li className="flex items-center"><span className="mr-2">•</span>Specify your target audience (customers, employees, students)</li>
                                                <li className="flex items-center"><span className="mr-2">•</span>Mention the survey purpose and key topics to cover</li>
                                                <li className="flex items-center"><span className="mr-2">•</span>Include preferred question types (multiple choice, ratings, text)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Example card */}
                                <div className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4">
                                    <div className="flex items-center justify-center space-x-2 mb-3">
                                        <div className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                                            <span className="text-primary text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-xs font-medium text-primary">Example Request</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed text-center">
                                        "Create a customer satisfaction survey for a restaurant with 8-10 questions covering food quality, service speed, staff friendliness, ambiance, and overall experience. Include rating scales and one open-ended feedback question."
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            

        </div>
    );
};

export default DashboardPage;