# VERITAS — AI-Powered Bullshit Detector

> Paste any YouTube video URL and Veritas will extract the transcript, identify factual claims, cross-reference them against trusted web sources, and give you a real-time truth score.

**Built for NorCal Hacks 2026**

## What It Does

1. **Transcription** — Automatically extracts captions or downloads audio and transcribes via Groq Whisper
2. **Claim Extraction** — LLM identifies up to 10 falsifiable claims from the transcript
3. **Web Verification** — Each claim is searched against real-time web sources via Tavily
4. **Truth Scoring** — AI verdicts (True / False / Unverified) with confidence levels and source links

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| AI Models | Groq (Llama 3.3 70B) for claim extraction & verification |
| Transcription | Groq Whisper Large V3, youtube-transcript, custom caption scraper |
| Web Search | Tavily API (advanced search) |
| Validation | Zod schemas, robust JSON repair for LLM outputs |

## Getting Started

### Prerequisites
- Node.js 18+
- API keys for Groq and Tavily (free tiers work)

### Setup

```bash
git clone <repo-url>
cd veritas
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

```
YouTube URL → Transcript Extraction (3 fallback strategies)
           → LLM Claim Extraction (strict → relaxed fallback)
           → Tavily Web Search per claim
           → LLM Verdict Generation per claim
           → Truth Score & Summary
```

## Features

- **Multi-strategy transcription**: YouTube captions → custom HTML scraper → audio download + Whisper
- **Robust JSON parsing**: Handles truncated/malformed LLM outputs with bracket repair
- **Rate limit awareness**: Exponential backoff, sequential processing for free-tier APIs
- **Manual text mode**: Paste any text directly for fact-checking without a video
- **Beautiful dark UI**: Animated loading states, expandable claim cards, confidence bars
