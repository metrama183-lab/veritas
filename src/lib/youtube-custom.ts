const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
};

function parseTranscriptXml(xml: string): { text: string; start: number; duration: number }[] {
    const transcript: { text: string; start: number; duration: number }[] = [];
    const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
        const text = m[3]
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\n/g, " ")
            .trim();
        if (text) {
            transcript.push({ start: parseFloat(m[1]), duration: parseFloat(m[2]), text });
        }
    }
    return transcript;
}

function parseJson3Transcript(json: string): { text: string; start: number; duration: number }[] {
    try {
        const data = JSON.parse(json);
        const events = data?.events || [];
        const transcript: { text: string; start: number; duration: number }[] = [];
        for (const ev of events) {
            if (!ev.segs) continue;
            const text = ev.segs.map((s: { utf8?: string }) => s.utf8 || "").join("").trim();
            if (text && text !== "\n") {
                transcript.push({
                    start: (ev.tStartMs || 0) / 1000,
                    duration: (ev.dDurationMs || 0) / 1000,
                    text,
                });
            }
        }
        return transcript;
    } catch { return []; }
}

export async function fetchTranscriptCustom(videoId: string) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: BROWSER_HEADERS,
        });
        const html = await response.text();
        const cookies = response.headers.get("set-cookie") || "";

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

        // Prefer manual English, then any English, then Italian, then first available
        const sortedTracks = [
            ...captionTracks.filter((t: any) => t.languageCode === "en" && t.kind !== "asr"),
            ...captionTracks.filter((t: any) => t.languageCode === "en" && t.kind === "asr"),
            ...captionTracks.filter((t: any) => t.languageCode !== "en"),
        ];

        const fetchHeaders: Record<string, string> = {
            ...BROWSER_HEADERS,
            ...(cookies ? { Cookie: cookies } : {}),
            Referer: `https://www.youtube.com/watch?v=${videoId}`,
        };

        // Try each track until one returns a non-empty transcript
        for (const track of sortedTracks) {
            const baseUrl = track.baseUrl.replace(/\\u0026/g, "&");

            // Attempt 1: XML format (default)
            try {
                const resp = await fetch(baseUrl, { headers: fetchHeaders });
                const xml = await resp.text();
                if (xml && xml.length > 50) {
                    const transcript = parseTranscriptXml(xml);
                    if (transcript.length > 0) {
                        console.log(`[Veritas] Custom scraper: got ${transcript.length} segments (lang: ${track.languageCode}, format: xml)`);
                        return transcript;
                    }
                }
            } catch { /* try next format */ }

            // Attempt 2: json3 format
            try {
                const sep = baseUrl.includes("?") ? "&" : "?";
                const json3Url = `${baseUrl}${sep}fmt=json3`;
                const resp = await fetch(json3Url, { headers: fetchHeaders });
                const json = await resp.text();
                if (json && json.length > 50) {
                    const transcript = parseJson3Transcript(json);
                    if (transcript.length > 0) {
                        console.log(`[Veritas] Custom scraper: got ${transcript.length} segments (lang: ${track.languageCode}, format: json3)`);
                        return transcript;
                    }
                }
            } catch { /* try next track */ }
        }

        throw new Error("All caption tracks returned empty transcripts");
    } catch (e) {
        console.error("Custom fetch failed:", e);
        throw e;
    }
}
