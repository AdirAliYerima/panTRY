/**
 * Helper accessor for Google API key. The app used to proxy via Lovable;
 * we now call Google Generative API directly using `GOOGLE_API_KEY`.
 */
export const getGoogleApiKey = () => process.env.GOOGLE_API_KEY?.trim();

export const GOOGLE_GENERATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
