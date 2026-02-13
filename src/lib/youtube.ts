import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export async function getTranscript(url: string): Promise<TranscriptSegment[]> {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(url);
        return transcript.map(item => ({
            text: item.text,
            start: item.offset / 1000,
            duration: item.duration / 1000
        }));
    } catch (error) {
        console.error("Error fetching transcript:", error);
        throw new Error("Failed to fetch transcript. The video might be private or lack captions.");
    }
}
