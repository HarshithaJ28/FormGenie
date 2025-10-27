# FormGenie Setup Instructions

## Google OAuth Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Forms API and Google Drive API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs: `http://localhost:3000`
5. Download the credentials JSON file
6. Copy `frontend/public/client.json.example` to `frontend/public/client.json`
7. Replace the placeholder values with your actual credentials:
   - `YOUR_GOOGLE_CLIENT_ID`: Your OAuth client ID
   - `YOUR_PROJECT_ID`: Your Google Cloud project ID
   - `YOUR_GOOGLE_CLIENT_SECRET`: Your OAuth client secret

## Environment Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- 📝 Document Upload & Processing (TXT, DOCX, PDF)
- 🤖 AI-Powered Survey Generation
- 🔄 Google Forms Integration
- 🎨 Modern UI with Dark/Light Theme
- 📱 Responsive Design
- 🚀 No Authentication Required

## Usage

1. **Upload Document**: Drop a document file to extract content
2. **AI Chat**: Generate survey questions using AI
3. **Export**: Create Google Forms directly from generated questions

The application will automatically extract content from your documents and help you create professional surveys using AI assistance.