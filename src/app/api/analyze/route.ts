import { NextRequest, NextResponse } from "next/server";
import { getTranscript } from "@/lib/youtube";

// TODO: Replace with real OpenAI/Gemini call
async function extractClaims(text: string) {
    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return [
        {
            claim: "The earth is flat.",
            timestamp: "00:45",
            verdict: "False",
            confidence: 0.99,
            source: "NASA, Wikipedia"
        },
        {
            claim: "Water boils at 100 degrees Celsius at sea level.",
            timestamp: "02:30",
            verdict: "True",
            confidence: 0.98,
            source: "Physics Standard"
        }
    ];
}

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        console.log("Analyzing URL:", url);

        // 1. Get Transcript
        // const transcript = await getTranscript(url);
        // console.log("Transcript fetched, length:", transcript.length);

        // 2. Extract Claims (Mock for now to save API credits during dev)
        const claims = await extractClaims("mock transcript text");

        return NextResponse.json({
            url,
            // transcript: transcript.slice(0, 5), // Send back snippet for debug
            claims
        });

    } catch (error) {
        console.error("Analysis failed:", error);
        return NextResponse.json(
            { error: "Failed to analyze video. Ensure it has captions." },
            { status: 500 }
        );
    }
}
