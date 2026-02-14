import { YoutubeTranscript } from "youtube-transcript";
import { extractVideoId } from "./utils";


export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

const STRATEGY1_TIMEOUT_MS = 30000;
const STRATEGY2_TIMEOUT_MS = 20000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

let whisperBlockedUntil = 0;

function parseRetryAfterMs(message: string): number | null {
    const hours = message.match(/(\d+)h/i);
    const minutes = message.match(/(\d+)m/i);
    const seconds = message.match(/(\d+(?:\.\d+)?)s/i);

    if (!hours && !minutes && !seconds) return null;

    const totalSeconds =
        (hours ? Number(hours[1]) * 3600 : 0) +
        (minutes ? Number(minutes[1]) * 60 : 0) +
        (seconds ? Number(seconds[1]) : 0);

    return Math.max(0, Math.round(totalSeconds * 1000));
}

function isWhisperRateLimited(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes("whisper-large-v3-turbo") &&
        (lower.includes("rate limit") || lower.includes("429"))
    );
}

function markWhisperCooldown(message: string): void {
    const retryMs = parseRetryAfterMs(message) ?? 10 * 60 * 1000;
    whisperBlockedUntil = Math.max(whisperBlockedUntil, Date.now() + retryMs);
}

function isWhisperOnCooldown(): boolean {
    return Date.now() < whisperBlockedUntil;
}

export async function getTranscript(url: string): Promise<TranscriptSegment[]> {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("Cannot extract video ID from URL");
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const errors: string[] = [];

    // Strategy 1: youtube-transcript library (fast, no dependencies)
    try {
        const transcript = await withTimeout(
            YoutubeTranscript.fetchTranscript(canonicalUrl),
            STRATEGY1_TIMEOUT_MS,
            "Strategy 1",
        );
        if (transcript && transcript.length > 0) {
            console.log(`[Veritas] Strategy 1 (youtube-transcript): ${transcript.length} segments`);
            return transcript.map(item => ({
                text: item.text,
                start: item.offset / 1000,
                duration: item.duration / 1000
            }));
        }
        errors.push("Strategy 1: returned empty transcript");
    } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`Strategy 1: ${msg}`);
        console.warn("[Veritas] Strategy 1 failed:", msg);
    }

    // Strategy 2: Custom Scraper (parses YouTube page HTML directly)
    try {
        const { fetchTranscriptCustom } = await import("./youtube-custom");
        const transcript = await withTimeout(
            fetchTranscriptCustom(videoId),
            STRATEGY2_TIMEOUT_MS,
            "Strategy 2",
        );
        if (transcript && transcript.length > 0) {
            console.log(`[Veritas] Strategy 2 (custom scraper): ${transcript.length} segments`);
            return transcript;
        }
        errors.push("Strategy 2: returned empty transcript");
    } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`Strategy 2: ${msg}`);
        console.warn("[Veritas] Strategy 2 failed:", msg);
    }

    // Strategy 3: Audio Download + Groq Whisper (nuclear option for videos without captions)
    if (isWhisperOnCooldown()) {
        const remainingSeconds = Math.ceil((whisperBlockedUntil - Date.now()) / 1000);
        const msg = `Whisper cooldown active (${remainingSeconds}s left)`;
        errors.push(`Strategy 3: ${msg}`);
        console.warn(`[Veritas] Strategy 3 skipped: ${msg}`);
    } else {
        try {
            console.log("[Veritas] Attempting Strategy 3: Audio download + Whisper transcription...");
            const { getAudioTranscript } = await import("./audio-transcription");
            const fullText = await getAudioTranscript(canonicalUrl, videoId);

            if (fullText && fullText.trim().length > 0) {
                console.log(`[Veritas] Strategy 3 (audio): ${fullText.length} chars transcribed`);
                return [{
                    text: fullText,
                    start: 0,
                    duration: 0
                }];
            }
        } catch (e: any) {
            const msg = e?.message || String(e);
            if (isWhisperRateLimited(msg)) {
                markWhisperCooldown(msg);
                const remainingSeconds = Math.ceil((whisperBlockedUntil - Date.now()) / 1000);
                console.warn(`[Veritas] Whisper rate-limited. Cooldown set to ~${remainingSeconds}s.`);
            }
            errors.push(`Strategy 3: ${msg}`);
            console.error("[Veritas] Strategy 3 (audio) failed:", msg);
        }
    }

    // Strategy 4: Video metadata fallback (title + description)
    // This keeps the pipeline alive even when captions are unavailable and audio extraction fails.
    try {
        console.log("[Veritas] Attempting Strategy 4: Metadata fallback...");
        const { getVideoMetadataFallbackText } = await import("./audio-transcription");
        const metadataText = await getVideoMetadataFallbackText(canonicalUrl);

        if (metadataText && metadataText.trim().length > 0) {
            console.log(`[Veritas] Strategy 4 (metadata): ${metadataText.length} chars`);
            return [{
                text: metadataText,
                start: 0,
                duration: 0,
            }];
        }

        errors.push("Strategy 4: Metadata fallback returned empty content");
    } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`Strategy 4: ${msg}`);
        console.error("[Veritas] Strategy 4 (metadata) failed:", msg);
    }

    // FINAL FALLBACK: If everything fails, throw a specific error
    // DO NOT use dummy data logic here anymore as it confuses users (e.g. showing AI text for a Venezuela video)
    const errSummary = errors.join("\n");
    throw new Error(`TRANSCRIPT_FAILED: Unable to fetch transcript or audio. \nDetails:\n${errSummary}`);
}
