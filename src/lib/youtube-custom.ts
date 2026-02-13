export async function fetchTranscriptCustom(videoId: string) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        const html = await response.text();

        // Extract caption tracks using a more robust approach:
        // Find the "captionTracks" key and then manually parse the JSON array
        const marker = '"captionTracks":';
        const markerIdx = html.indexOf(marker);

        if (markerIdx === -1) {
            throw new Error("No caption tracks found in page HTML");
        }

        // Extract from the marker, balancing brackets
        const startIdx = markerIdx + marker.length;
        let depth = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < html.length && i < startIdx + 10000; i++) {
            if (html[i] === "[") depth++;
            else if (html[i] === "]") depth--;
            if (depth === 0 && html[i] === "]") {
                endIdx = i + 1;
                break;
            }
        }

        if (endIdx <= startIdx) {
            throw new Error("Failed to parse caption tracks array");
        }

        const captionTracksStr = html.substring(startIdx, endIdx);
        const captionTracks = JSON.parse(captionTracksStr);

        if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
            throw new Error("Caption tracks array is empty");
        }

        // Prefer English, then Italian, then first available
        const track =
            captionTracks.find((t: any) => t.languageCode === "en" && !t.kind) ||
            captionTracks.find((t: any) => t.languageCode === "en") ||
            captionTracks.find((t: any) => t.languageCode === "it") ||
            captionTracks[0];

        // The baseUrl may have unicode escapes like \u0026 for &
        const baseUrl = track.baseUrl.replace(/\\u0026/g, "&");

        const transcriptResponse = await fetch(baseUrl);
        const transcriptXml = await transcriptResponse.text();

        const transcript: { text: string; start: number; duration: number }[] = [];

        // Parse XML text elements — handle both self-closing and normal tags
        const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
        let m;
        while ((m = regex.exec(transcriptXml)) !== null) {
            const text = m[3]
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/\n/g, " ")
                .trim();

            if (text) {
                transcript.push({
                    start: parseFloat(m[1]),
                    duration: parseFloat(m[2]),
                    text,
                });
            }
        }

        if (transcript.length === 0) {
            throw new Error("Parsed transcript is empty — XML may have changed format");
        }

        console.log(`[Veritas] Custom scraper: got ${transcript.length} segments (lang: ${track.languageCode})`);
        return transcript;
    } catch (e) {
        console.error("Custom fetch failed:", e);
        throw e;
    }
}
