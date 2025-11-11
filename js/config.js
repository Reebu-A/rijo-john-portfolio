// YouTube Configuration
// Replace with your actual YouTube Channel ID
export const CHANNEL_ID = 'UCyfD4V5Dq8S1ut44oKa4RiQ';


// Optional: YouTube Data API v3 Key
// WARNING: API keys in client-side code can be abused
// Always restrict by HTTP referrer in Google Cloud Console
export const YOUTUBE_API_KEY = '';

/*
How to set up YouTube Data API:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Restrict the key by HTTP referrers:
   - Add your GitHub Pages domain: https://yourusername.github.io/*
   - Add local development: http://localhost:*
6. Replace the empty string above with your API key

SECURITY NOTE: 
- Client-side API keys can be seen by anyone
- Use HTTP referrer restrictions to prevent abuse
- Consider using RSS method (no key required) instead
*/

// Maximum number of videos to load
export const MAX_VIDEOS = 12;