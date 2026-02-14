import { YoutubeTranscript } from "youtube-transcript";
import { extractVideoId } from "./utils";


export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export async function getTranscript(url: string): Promise<TranscriptSegment[]> {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("Cannot extract video ID from URL");

    const errors: string[] = [];

    // Strategy 1: youtube-transcript library (fast, no dependencies)
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        if (transcript && transcript.length > 0) {
            console.log(`[Veritas] Strategy 1 (youtube-transcript): ${transcript.length} segments`);
            return transcript.map(item => ({
                text: item.text,
                start: item.offset / 1000,
                duration: item.duration / 1000
            }));
        }
    } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`Strategy 1: ${msg}`);
        console.warn("[Veritas] Strategy 1 failed:", msg);
    }

    // Strategy 2: Custom Scraper (parses YouTube page HTML directly)
    try {
        const { fetchTranscriptCustom } = await import("./youtube-custom");
        const transcript = await fetchTranscriptCustom(videoId);
        if (transcript && transcript.length > 0) {
            console.log(`[Veritas] Strategy 2 (custom scraper): ${transcript.length} segments`);
            return transcript;
        }
    } catch (e: any) {
        const msg = e?.message || String(e);
        errors.push(`Strategy 2: ${msg}`);
        console.warn("[Veritas] Strategy 2 failed:", msg);
    }

    // Strategy 3: Audio Download + Groq Whisper (nuclear option for videos without captions)
    try {
        console.log("[Veritas] Attempting Strategy 3: Audio download + Whisper transcription...");
        const { getAudioTranscript } = await import("./audio-transcription");
        const fullText = await getAudioTranscript(url, videoId);

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
        errors.push(`Strategy 3: ${msg}`);
        console.error("[Veritas] Strategy 3 (audio) failed:", msg);
    }

    // Strategy 4: Video metadata fallback (title + description)
    // This keeps the pipeline alive even when captions are unavailable and audio extraction fails.
    try {
        console.log("[Veritas] Attempting Strategy 4: Metadata fallback...");
        const { getVideoMetadataFallbackText } = await import("./audio-transcription");
        const metadataText = await getVideoMetadataFallbackText(url);

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
