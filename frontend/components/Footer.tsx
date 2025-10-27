import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-foreground font-bold text-lg">FormGenie</p>
            <p className="text-muted-foreground text-sm">Turn Documents Into Surveys Instantly.</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">About</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">Contact</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-300">Privacy</a>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} FormGenie. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;