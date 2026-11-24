# panTRY

panTRY is a voice-powered meal planning app. It helps you describe a meal request and budget, generates three meal options, provides an ingredient and grocery list, and guides you through cooking step by step.

## Features

- Voice-based meal requests and confirmation
- Budget-aware meal suggestions
- Meal details, nutrition information, and preparation steps
- Pantry ingredient checklist and grocery list
- Hands-free cooking guidance
- Optional SMS grocery-list sharing

## Run Locally

### Prerequisites

- Node.js 20 or newer
- npm
- A Google Generative AI API key
- A microphone-enabled browser for voice features

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/AdirAliYerima/panTRY.git
   cd panTRY
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Add your Google API key to `.env`:

   ```env
   GOOGLE_API_KEY=your_google_api_key
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL shown in the terminal, usually `http://localhost:3000`.

Allow microphone access when your browser prompts for it.

## Optional SMS Setup

SMS sharing can also be enabled by adding these values to `.env`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=your_twilio_phone_number
```

## Other Commands

```bash
npm run build   # Create a production build
npm run preview # Preview the production build locally
npm run lint    # Run ESLint
```
