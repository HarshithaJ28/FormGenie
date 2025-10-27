# FormGenie - AI-Powered Form Generator 🤖📋

An intelligent form generator that converts documents (PDF, DOCX, TXT) into professional survey forms using AI, with automated Google Forms creation.

## 🚀 Features

- **6-Method AI-Powered PDF Extraction** with corruption detection + Gemini text reconstruction
- **Smart Document Processing** for DOCX, PDF, TXT, and more formats
- **AI Form Generation** using Google Gemini
- **Google Forms Integration** with automatic form creation
- **Real-time Preview** and comparison between AI-generated and Google Forms
- **Corrupted Document Recovery** using advanced AI interpretation

## 🛠️ Setup Instructions

### 1. Environment Variables

Copy the environment template and add your API keys:

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```bash
# Gemini AI API Key (Required for AI features)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth Configuration (Required for Google Forms integration)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_PROJECT_ID=your_google_project_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 2. Get Your API Keys

#### Gemini API Key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it to `VITE_GEMINI_API_KEY` in `.env.local`

#### Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized origins: `http://localhost:5173`, `http://localhost:3000`
4. Copy the credentials to your `.env.local`

### 3. Install and Run

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Development

The app will run on `http://localhost:5173` with hot reloading enabled.

## 📁 Project Structure

```
FormGenie/
├── frontend/
│   ├── src/
│   ├── services/          # API integrations
│   ├── components/        # React components
│   ├── pages/            # Main pages
│   └── .env.local        # Your secrets (not committed)
└── README.md
```

## 🔒 Security

- All API keys are stored in `.env.local` (ignored by git)
- No credentials are committed to the repository
- Use environment variables for all sensitive data

## 🚀 Deployment

When deploying, ensure you set the environment variables in your hosting platform:
- `VITE_GEMINI_API_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_PROJECT_ID`  
- `VITE_GOOGLE_CLIENT_SECRET`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Ensure all credentials are in `.env.local`
4. Never commit API keys or secrets
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.