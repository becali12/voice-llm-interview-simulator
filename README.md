# Voice Interview Simulator

A browser-based, voice-driven AI chat tool powered by OpenAI. Three modes: mock interview, topic-based learning, and casual conversation.

## Modes

| Mode | Description |
|---|---|
| **Interview** | Alexander, a neutral technical interviewer, asks 3–5 SWE questions and delivers structured feedback at the end |
| **Learning** | Alexander acts as a tutor, picking and walking through high-value interview topics for your chosen focus area |
| **Casual Chat** | Alejandro, a witty and opinionated chat partner, just wants a good conversation |

## Features

- **Voice input** — speak your answers via microphone
- **Text-to-speech** — responses are spoken aloud in sync with the on-screen text
- **Markdown rendering** — bold, italics, inline code, and bullet lists rendered in chat
- **Structured feedback** — score, strengths, areas to improve, and a top tip (interview mode only)
- **Auto-close** — interview ends automatically when the interviewer wraps up
- **Focus areas** — Python Backend, Node.js Backend, TypeScript/JS Frontend, Full Stack, DevOps, LLM/AI Engineer, Algorithms & Data Structures, System Design

## Requirements

- A modern browser (Chrome or Edge recommended for best microphone support)
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to:
  - `gpt-5.4-mini` or similar (chat, via Responses API)
  - `whisper-1` (transcription)
  - `tts-1` (text-to-speech)

## Setup

1. Copy `config.example.js` to `config.js`
2. Open `config.js` and fill in your values:
   - `OPENAI_API_KEY` — your API key (starts with `sk-`)
   - `YOUR_NAME` — pre-fills the name field (optional)
   - `OPENAI_MODEL` — model to use (default: `gpt-5.4-mini`)
3. Open `interview-simulator.html` directly in your browser — no server required

`config.js` is listed in `.gitignore` and will never be committed.

## Usage

1. Select a mode and (if applicable) a focus area
2. Optionally enter your name
3. Click **Start**
4. Click the microphone button to record, click again to stop
5. In interview mode, the session ends automatically after 3–5 questions, or manually via **End & Review**

## Project Structure

```
interview-simulator.html     # Markup and screen layout
style.css                    # All styles
config.example.js            # Config template — copy to config.js and fill in your values
config.js                    # Your local config (gitignored)
scripts/
  app.js                     # State, API calls, recording, session flow
  prompts.js                 # All system prompts and focus area labels
```

## Customisation

| What | Where |
|---|---|
| AI model | `config.js` — `OPENAI_MODEL` |
| TTS voice | `scripts/app.js` `speakText()` — `voice: 'onyx'` (options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) |
| TTS speed | `scripts/app.js` `speakText()` — `speed: 1.15` (range `0.25`–`4.0`) |
| Interview/tutor persona | `scripts/prompts.js` — `SYSTEM_PROMPT` |
| Casual chat persona | `scripts/prompts.js` — `chatType === 'casual-chat'` block |
| Focus area options | `interview-simulator.html` `<select id="focus">` and `scripts/prompts.js` `FOCUS_LABELS` |

## Privacy

Your API key lives in `config.js` on your machine and is sent only directly to OpenAI. It is gitignored and never committed or transmitted elsewhere.

## Coming soon

- RAG for each interview topic, to add more relevant questions