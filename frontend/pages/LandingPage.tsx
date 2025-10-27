import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
    <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-border">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-card-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

const LandingPage: React.FC = () => {
    useEffect(() => {
        // Add landing-page class to body to allow scrolling
        document.body.classList.add('landing-page');
        
        // Clean up when component unmounts
        return () => {
            document.body.classList.remove('landing-page');
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="bg-card">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight font-poppins">
                            Turn Documents Into <span className="text-primary">Surveys</span> Instantly
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                            FormGenie uses AI to automatically generate insightful survey questions from your PDF and DOCX files. Save time, gather better feedback.
                        </p>
                        <div className="flex justify-center">
                            <Link to="/dashboard" className="px-8 py-3 text-lg font-semibold text-primary-foreground bg-primary rounded-lg shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105">
                                Get Started for Free
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why FormGenie?</h2>
                            <p className="text-lg text-muted-foreground mt-2">Everything you need to automate your feedback loop.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           <FeatureCard title="AI Question Generation" description="Our smart AI analyzes your document's content to create relevant and targeted survey questions." icon={<IconSparkles />} />
                           <FeatureCard title="PDF & DOCX Support" description="Upload your existing documents in popular formats. No need to copy-paste text." icon={<IconDocument />} />
                           <FeatureCard title="Google Forms & PDF Export" description="Easily export your generated survey to a PDF file or create a Google Form with one click." icon={<IconExport />} />
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="bg-card py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Get Your Survey in 3 Simple Steps</h2>
                        </div>
                        <div className="relative">
                            <div className="hidden md:block absolute top-1/2 left-0 w-full border-t-2 border-dashed border-border"></div>
                            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-full text-2xl font-bold mb-4 z-10 border-4 border-card">1</div>
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">Upload Document</h3>
                                    <p className="text-muted-foreground">Select a PDF or DOCX file from your computer.</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-full text-2xl font-bold mb-4 z-10 border-4 border-card">2</div>
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">Generate Survey</h3>
                                    <p className="text-muted-foreground">Let our AI work its magic to create your questions.</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-full text-2xl font-bold mb-4 z-10 border-4 border-card">3</div>
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">Preview & Export</h3>
                                    <p className="text-muted-foreground">Edit your questions, then download or export.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

// Icons
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.456L20.25 18l-1.197.398a3.375 3.375 0 00-2.456 2.456z" /></svg>;
const IconDocument = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const IconExport = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-2.47 2.47m2.47-2.47L14.47 12M3 17.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25z" /></svg>;

export default LandingPage;