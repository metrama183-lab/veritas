# VERITAS - 5-Minute Demo Video Script
**NorCal Hacks 2026 | Built in 3 Days**

---

## 🎬 SCENE 1: HOOK (0:00 - 0:30)
**Visual:** Dark screen → Red "VERITAS" logo fades in → Montage of viral misinformation clips (fast cuts)

**Narration:**
"Every day, millions of people watch YouTube videos claiming everything from miracle cures to political conspiracies. But how do you know what's actually true? Meet Veritas — the AI-powered bullshit detector that fact-checks videos in real time. Built in just three days for NorCal Hacks 2026, this is how we're fighting misinformation at scale."

---

## 🎬 SCENE 2: THE PROBLEM (0:30 - 1:00)
**Visual:** Split screen showing: fake news headlines, conspiracy theory thumbnails, misleading statistics graphics

**Narration:**
"The problem is massive. Misinformation spreads six times faster than truth on social media. Manual fact-checking can't keep up — it takes hours to verify a single video. And most people? They just scroll past, believing whatever sounds convincing. We needed a solution that works automatically, across any language, on any video."

---

## 🎬 SCENE 3: SOLUTION OVERVIEW (1:00 - 1:45)
**Visual:** Screen recording of Veritas homepage → Paste YouTube URL → Click "Analyze"

**Narration:**
"Here's how Veritas works. You paste any YouTube URL into our platform. Within seconds, our AI extracts the transcript — even if captions are disabled — using a four-stage fallback system: YouTube's native captions, custom HTML scraping, audio download with Whisper transcription, and metadata extraction as a last resort. No video is left behind.

Then, our claim extraction engine identifies every verifiable statement in the content. Not opinions, not feelings — only falsifiable facts like statistics, dates, scientific claims, and political assertions."

---

## 🎬 SCENE 4: LIVE DEMO - FACT CHECKING (1:45 - 3:00)
**Visual:** Screen recording showing analysis results page with:
- Truth Score gauge animating
- Claims list expanding
- Verified/False badges appearing
- Sources being clicked

**Narration:**
"Watch this. We just analyzed a political commentary video. Veritas extracted ten specific claims and verified each one against trusted web sources using advanced search APIs. 

Look at the results: Three claims verified as true with sources from Reuters and AP News. Two flagged as false with contradicting evidence. Five marked as unverified because there wasn't enough data.

But here's the game-changer: our manipulation radar. This isn't just fact-checking — it's rhetoric analysis. Veritas detects eight propaganda tactics: emotional appeals, cherry-picking data, loaded language, false dichotomies. Each tactic gets a score from zero to one hundred based on intensity.

This video scored seventy-two out of one hundred on manipulation — highly persuasive content designed to bypass critical thinking. The system even highlights specific quotes as examples and explains why they're manipulative."

---

## 🎬 SCENE 5: TECHNICAL DEEP DIVE (3:00 - 4:00)
**Visual:** Split screen: code snippets on left, architecture diagram on right

**Narration:**
"Under the hood, Veritas is production-grade engineering. We built a resilient pipeline that handles API rate limits gracefully. When our primary AI model hits quota, we automatically fall back to lighter models with optimized prompts. When search APIs are exhausted, we switch to model-only verification with confidence scoring.

The system processes videos in five languages — English, Spanish, French, German, Italian — and always outputs analysis in English for consistency. We implemented circuit breakers, cooldown timers, and JSON repair logic to handle malformed AI responses. This isn't a prototype — it's built to scale.

Our tech stack: Next.js for the frontend, Groq's Llama models for claim extraction and manipulation analysis, Tavily for web search verification, and Whisper for audio transcription. Everything runs serverless with zero infrastructure management."

---

## 🎬 SCENE 6: IMPACT & VISION (4:00 - 4:45)
**Visual:** Montage of use cases: student researching, journalist verifying sources, parent checking kids' content

**Narration:**
"The impact potential is enormous. Imagine students using Veritas to verify educational content before citing it. Journalists fact-checking sources in seconds instead of hours. Parents screening videos their kids watch for manipulation tactics.

This is just the beginning. Future iterations will include deeper evidence quality scoring, temporal fact-checking for date-sensitive claims, contradiction detection between claims in the same video, and browser extensions for one-click verification.

We built this in three days. Imagine what's possible with more time."

---

## 🎬 SCENE 7: CLOSING (4:45 - 5:00)
**Visual:** Veritas logo with tagline → GitHub repo → Team credits

**Narration:**
"Veritas. The AI-powered bullshit detector. Because in an era of misinformation, truth shouldn't be a luxury — it should be automatic.

Built for NorCal Hacks 2026. Code available on GitHub. Thank you."

---

## 📋 PRODUCTION NOTES

### Timing Breakdown:
- Hook: 30s
- Problem: 30s  
- Solution: 45s
- Demo: 1m 15s
- Technical: 1m
- Impact: 45s
- Closing: 15s
**Total: 5 minutes**

### Voice Direction for ElevenLabs:
- **Tone:** Confident, energetic, professional
- **Pace:** Medium-fast (conversational but urgent)
- **Emphasis:** Punch key phrases like "bullshit detector," "built in three days," "production-grade"
- **Pauses:** Natural breaks between scenes (marked by paragraph breaks)

### Visual Assets Needed:
1. Veritas logo animation
2. Screen recording of full analysis flow
3. Code snippets (clean, syntax-highlighted)
4. Architecture diagram
5. Misinformation montage (stock footage)
6. Use case scenarios (stock footage or simple animations)

### Music Suggestions:
- Intro: Dark, suspenseful (problem setup)
- Demo: Upbeat, tech-forward (solution showcase)
- Closing: Inspiring, hopeful (impact vision)
