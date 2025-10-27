// Google OAuth configuration - prioritize environment variables
const getGoogleClientId = (): string => {
  // First try environment variable (recommended for production)
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envClientId && envClientId !== "YOUR_GOOGLE_CLIENT_ID") {
    return envClientId;
  }
  
  // Fallback to a default (will be overridden by loadClientConfig)
  return "YOUR_GOOGLE_CLIENT_ID";
};

let GOOGLE_CLIENT_ID = getGoogleClientId();

// Load client configuration from client.json as fallback
const loadClientConfig = async () => {
  // If we already have a valid environment variable, use it
  if (GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") {
    console.log('🔑 Using Google Client ID from environment variables');
    return;
  }

  // Try to load from client.json as fallback
  try {
    const response = await fetch('/client.json');
    const config = await response.json();
    if (config.web.client_id && config.web.client_id !== "YOUR_GOOGLE_CLIENT_ID") {
      GOOGLE_CLIENT_ID = config.web.client_id;
      console.log('🔑 Using Google Client ID from client.json (fallback)');
    } else {
      console.warn('⚠️ No valid Google Client ID found in environment variables or client.json');
      console.warn('Please set VITE_GOOGLE_CLIENT_ID in your .env.local file');
    }
  } catch (error) {
    console.warn('Failed to load client.json:', error);
  }
};

// Initialize Google OAuth
export const initializeGoogleAuth = async (): Promise<any> => {
  await loadClientConfig();
  
  return new Promise((resolve) => {
    // Wait for Google API to load
    const checkGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/forms https://www.googleapis.com/auth/drive.file',
          callback: () => {}, // Will be set later
        });
        resolve(tokenClient);
      } else {
        setTimeout(checkGoogle, 100);
      }
    };
    checkGoogle();
  });
};

// Request Google OAuth token
export const requestGoogleToken = (tokenClient: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Google Sign-In is not ready yet. Please try again in a moment."));
      return;
    }

    // Update callback for this specific request
    tokenClient.callback = (tokenResponse: any) => {
      if (tokenResponse.error) {
        reject(new Error(tokenResponse.error_description || tokenResponse.error));
        return;
      }
      resolve(tokenResponse.access_token);
    };

    tokenClient.requestAccessToken();
  });
};

// Global window type declaration
declare global {
  interface Window {
    google?: any;
  }
}