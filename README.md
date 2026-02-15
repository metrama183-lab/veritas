<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Groq-Llama_3.3-f55036?style=for-the-badge" alt="Groq"/>
</p>

<h1 align="center">🔍 VERITAS</h1>
<p align="center"><strong>AI-Powered Real-Time Video Fact-Checker & Manipulation Detector</strong></p>
<p align="center">
  <em>Paste any YouTube URL → Veritas extracts every claim, verifies it against trusted sources, and scores the bullshit level — in seconds.</em>
</p>

---

## ⚡ What It Does

Veritas is a full-stack AI fact-checking platform that analyzes YouTube videos (or raw text) through a multi-stage pipeline:

| Stage | What Happens |
|-------|-------------|
| 🎙️ **Transcript Extraction** | 5-strategy fallback chain — YouTube captions → custom HTML scraper → yt-dlp subtitles → Whisper audio transcription → metadata fallback |
| 🔬 **Claim Extraction** | LLM identifies up to 10 falsifiable, self-contained claims using strict → relaxed dual-mode strategy  |
| 🌐 **Web Verification** | Each claim is searched via Tavily API with domain trust ranking (Reuters/AP > Reddit/Quora) |
| ⚖️ **AI Verdicts** | Per-claim verdict (True / False / Unverified) with confidence scores, reasoning, and source links |
| 🧠 **Manipulation Radar** | Detects 8 rhetorical tactics: Appeal to Emotion, Cherry-Picking, Loaded Language, Strawman, and more |
| 📊 **Truth Score** | Aggregate 0–100 credibility score based on verified vs falsified claims |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ URL Input │→│ Loading Screen│→│  Report   │→│  Claim Cards │ │
│  │ + Manual  │  │  + Trivia    │  │  Page     │  │  + Timeline  │ │
│  └──────────┘  └──────────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │ POST /api/analyze
┌──────────────────────────▼───────────────────────────────────────┐
│                     API ROUTE (Server-Side)                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              TRANSCRIPT PIPELINE (5 strategies)              │ │
│  │  youtube-transcript → custom scraper → yt-dlp subs →        │ │
│  │  Whisper audio → metadata fallback                          │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │            CLAIM EXTRACTION (Llama 3.3 70B)                 │ │
│  │  Strict mode → Relaxed fallback → JSON repair               │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                    │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │         VERIFICATION PIPELINE (per-claim, sequential)       │ │
│  │  Tavily Search → Domain ranking → LLM verdict (Llama 8B)   │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                              │                                    │
│  ┌──────────────┐  ┌────────▼─────────┐                         │
│  │  Summary Gen  │  │ Manipulation     │  (parallel)             │
│  │  (Llama 70B)  │  │ Analysis (70B)   │                         │
│  └──────────────┘  └──────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16, React 19 | Full-stack app with server-side API routes |
| **Language** | TypeScript 5 (strict mode) | Type-safe codebase |
| **Styling** | Tailwind CSS 4, Framer Motion | Dark UI with smooth animations |
| **AI Models** | Groq (Llama 3.3 70B + 8B) | Claim extraction, verification, summarization |
| **Transcription** | Groq Whisper Large V3 | Audio-to-text fallback for captionless videos |
| **Web Search** | Tavily API | Real-time source retrieval with AI summaries |
| **Validation** | Zod, custom JSON repair | Robust handling of truncated/malformed LLM outputs |
| **Video Tools** | yt-dlp, youtube-transcript | Multi-strategy transcript acquisition |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **API keys** (free tiers work):
  - [Groq](https://console.groq.com/) — LLM & Whisper transcription
  - [Tavily](https://tavily.com/) — Web search & fact-checking

### Installation

```bash
git clone https://github.com/metrama183-lab/veritas.git
cd veritas
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste a YouTube URL to get started.

---

## ✨ Key Features

### Resilient Transcript Pipeline
> Most fact-checkers break when captions aren't available. Veritas doesn't.

Five fallback strategies ensure we extract text from virtually any YouTube video:
1. `youtube-transcript` library (fastest)
2. Custom HTML scraper with cookie handling
3. `yt-dlp` subtitle extraction (auto-generated + manual)
4. Full audio download + Groq Whisper transcription
5. Video metadata fallback (title + description)

### Intelligent Claim Extraction
Dual-mode extraction with automatic fallback:
- **Strict mode** — prioritizes hard data: economic stats, legal assertions, scientific facts
- **Relaxed mode** — activates if strict yields <3 claims, capturing timeline events and specific numbers

### Domain Trust Ranking
Not all sources are equal. Veritas ranks search results by domain trustworthiness:
```
🟢 High Trust:  reuters.com, apnews.com, bls.gov, who.int
🟡 Medium:      bbc.com, nytimes.com, wikipedia.org
🔴 Low Trust:   reddit.com, quora.com, tiktok.com
```

### Manipulation Radar
Analyzes 8 rhetorical manipulation tactics:
- 😢 Appeal to Emotion
- 👔 Appeal to Authority  
- 🍒 Cherry-Picking
- ⚖️ False Dichotomy
- 💣 Loaded Language
- 🐑 Bandwagon
- 🎃 Strawman
- 🔁 Repetition

### Robust LLM Output Handling
Free-tier LLMs sometimes return truncated JSON. Veritas handles this with:
- Balanced-brace JSON extraction
- Bracket repair for incomplete arrays
- Regex salvaging for completely malformed outputs
- Rate-limit cooldown tracking with automatic model fallback

---

## 📁 Project Structure

```
veritas/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page with URL input
│   │   ├── report/page.tsx          # Analysis report page
│   │   ├── api/analyze/route.ts     # Core analysis API (1000+ lines)
│   │   ├── layout.tsx               # Root layout with metadata
│   │   └── globals.css              # Global styles + animations
│   ├── components/
│   │   ├── url-input.tsx            # URL/text input with mode toggle
│   │   ├── bullshit-meter.tsx       # Animated circular truth gauge
│   │   ├── manipulation-radar.tsx   # SVG radar chart for tactics
│   │   ├── video-timeline.tsx       # Interactive claim timeline
│   │   ├── loading-screen.tsx       # Progress bar + trivia carousel
│   │   └── loading-messages.tsx     # Animated status messages
│   └── lib/
│       ├── youtube.ts               # 5-strategy transcript pipeline
│       ├── youtube-custom.ts        # Custom YouTube HTML scraper
│       ├── audio-transcription.ts   # yt-dlp + Whisper integration
│       ├── demo-cache.ts            # Pre-cached demo responses
│       ├── transcript-fallback.ts   # Fallback transcript data
│       └── utils.ts                 # Utilities (cn, extractVideoId)
├── .env.local                       # API keys (not committed)
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 🧪 Reliability & Edge Cases

| Scenario | How Veritas Handles It |
|----------|----------------------|
| Video has no captions | Falls through 5 strategies until one works |
| LLM returns truncated JSON | Multi-strategy JSON repair recovers data |
| Groq rate limit hit | Exponential backoff + model tier fallback (70B → 8B) |
| Whisper rate limited | Cooldown tracking, skips audio strategy until reset |
| No verifiable claims found | Returns clean "no claims" response instead of crashing |
| Search returns no results | Claim marked as "Unverified" with 0 confidence |

---

## 📄 License

MIT

---

<p align="center">
  <strong>Built with ☕ and healthy skepticism</strong>
</p>
