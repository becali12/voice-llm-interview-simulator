# Voice Interview Simulator

A browser-based, voice-driven mock interview tool powered by OpenAI. The AI interviewer (Alexander) asks technical questions, listens to your spoken answers, and delivers structured feedback at the end.

## Features

- **Voice input** — speak your answers via microphone
- **AI interviewer** — GPT-4o conducts a realistic 3–5 question technical interview
- **Text-to-speech** — responses are spoken aloud in sync with the on-screen text
- **Auto-close** — interview ends automatically when the interviewer wraps up
- **Structured feedback** — score, strengths, areas to improve, and a top tip generated after the session
- **Focus areas** — General, Algorithms & Data Structures, System Design, Backend, Frontend, Full Stack

## Requirements

- A modern browser (Chrome or Edge recommended for best microphone support)
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to:
  - `gpt-4o` (chat)
  - `whisper-1` (transcription)
  - `tts-1` (text-to-speech)

## Usage

1. Open `interview-simulator.html` directly in your browser (no server required)
2. Enter your OpenAI API key
3. Select a focus area and optionally enter your name
4. Click **Start Interview**
5. Click the microphone button to record your answer, click again to stop
6. The interview ends automatically after 3–5 questions, or manually via **End & Review**

## Project Structure

```
interview-simulator.html   # Markup and screen layout
style.css                  # All styles
app.js                     # Prompts, state, API calls, interview logic
```

## Customisation

| What | Where |
|---|---|
| Interviewer name | `app.js` line 1 — change `named Alexander` |
| TTS speed | `app.js` `speakText()` — change `speed: 1.0` (range `0.25`–`4.0`) |
| TTS voice | `app.js` `speakText()` — change `voice: 'onyx'` (options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`) |
| Number of questions | `app.js` `SYSTEM_PROMPT` — adjust the `3-5` range |
| Focus area options | `interview-simulator.html` `<select id="focus">` |

## Privacy

Your API key is entered in the browser and sent only directly to OpenAI. It is never stored or transmitted elsewhere.

## Coming soon

- better api key management
- separate interview vs learning modes
- separate & improved prompts for each interview topics
- RAG for each interview topic, to add more relevant questions