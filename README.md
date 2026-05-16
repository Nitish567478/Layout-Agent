# Layout Agent - AI Engineer Intern POC

A chat-based layout agent that updates a provided design JSON from natural language instructions. The app includes a chat interface, live layout preview, and updated JSON viewer.

## Features

- Loads the provided design JSON on first visit.
- Lets users transform the layout through chat prompts.
- Shows the updated layout JSON after every instruction.
- Includes a lightweight visual preview of the current layout.
- Persists chat history and layout changes after page reload.
- Provides a Reset button to clear chat history and restore the original layout.
- Validates layout JSON before returning it to the frontend.
- Works with OpenAI when `OPENAI_API_KEY` is configured.
- Includes deterministic fallback rules for the main assignment prompts, so the core demo works even without an API key.

## Supported Demo Prompts

Try these prompts during review:

- `Convert this design to 9:16`
- `Keep the product large`
- `Move the headline to the top`
- `Move the offer badge higher`
- `Make the headline smaller`
- `Change the headline color to red`
- `Center the product`
- `Clean layout`

## How It Works

The backend sends the current layout JSON and conversation history to the LLM with a strict system prompt. The LLM is expected to return:

```json
{
  "explanation": "Short confirmation message",
  "updatedLayout": {}
}
```

The backend validates `updatedLayout` before returning it to the frontend. If the LLM is unavailable or quota-limited, the backend applies safe built-in transforms for common layout operations.

## Tech Stack

- Frontend: React + Vite
- Styling: Tailwind CSS
- Backend: Node.js + Express
- LLM: OpenAI SDK
- State persistence: browser `localStorage`

## Project Structure

```txt
layout-agent/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── JsonViewer.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── WireframePreview.jsx
│   │   ├── data/
│   │   │   └── initialLayout.json
│   │   ├── hooks/
│   │   │   └── useLayoutAgent.js
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── prompts/
│   │   │   └── systemPrompt.js
│   │   ├── routes/
│   │   │   └── chat.js
│   │   ├── utils/
│   │   │   ├── jsonValidator.js
│   │   │   └── layoutTransforms.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── APPROACH.md
└── README.md
```

## Setup

Install dependencies from the project root:

```bash
npm install
npm --prefix client install
npm --prefix server install
```

Create the backend environment file:

```bash
copy server\.env.example server\.env
```

Update `server/.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

`OPENAI_API_KEY` is optional for the core demo prompts because fallback transforms are included.

## Run Locally

Start both frontend and backend:

```bash
npm run dev
```

Open:

```txt
http://localhost:5173
```

Backend health check:

```txt
http://localhost:3001/health
```

## Reset Behavior

The app saves layout and chat history in `localStorage`, so reloading the page does not remove previous prompts or changes.

Click `Reset` to:

- restore the original layout JSON
- clear all chat messages
- remove saved browser state

## Build

```bash
npm run build
```

## Notes

- No PSD parsing is required.
- No final PNG rendering is required.
- The preview is intentionally lightweight and based on the layout JSON.
- The backend avoids trusting unvalidated LLM output.

