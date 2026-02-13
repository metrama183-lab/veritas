import { NextRequest, NextResponse } from "next/server";
import { getTranscript } from "@/lib/youtube";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

// ============================================================
// Provider Setup
// ============================================================

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});
const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY || "",
});

// Auto-select: Google > Groq > OpenAI
const isGroq = !process.env.GOOGLE_GENERATIVE_AI_API_KEY && !!process.env.GROQ_API_KEY;

const model =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
        ? google("gemini-1.5-flash")
        : process.env.GROQ_API_KEY
            ? groq("llama-3.3-70b-versatile")
            : openai("gpt-4o");

// Groq has very low TPM (6000) — limit transcript size & concurrency
const MAX_TRANSCRIPT_CHARS = isGroq ? 24000 : 15000;
const VERIFY_CONCURRENCY = isGroq ? 1 : 3;
const VERIFY_DELAY_MS = isGroq ? 2000 : 300;
const MAX_CLAIMS = isGroq ? 10 : 10;

// Tavily for web search verification
const tvly = process.env.TAVILY_API_KEY
    ? tavily({ apiKey: process.env.TAVILY_API_KEY })
    : null;

// ============================================================
// Types & Schemas
// ============================================================

interface ExtractedClaim {
    claim: string;
    timestamp: string;
    query: string;
}

interface VerifiedClaim {
    claim: string;
    timestamp: string;
    verdict: "True" | "False" | "Unverified";
    confidence: number;
    source: string;
    reasoning: string;
}

const VerificationSchema = z.object({
    verdict: z.enum(["True", "False", "Unverified"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
});

// ============================================================
// Robust JSON Extraction (handles truncated Groq responses)
// ============================================================

function extractJSON(text: string): Record<string, unknown> | null {
    // Clean up markdown code fences if present
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Pre-process: fix common LLM JSON mistakes
    // 1. Fix missing commas between objects in arrays: `} {` → `},{`
    cleaned = cleaned.replace(/\}\s*\{/g, "},{");
    // 2. Fix missing commas between array items: `] [` → `],[`
    cleaned = cleaned.replace(/\]\s*\[/g, "],[");
    // 3. Fix trailing commas before closing brackets: `,]` → `]` and `,}` → `}`
    cleaned = cleaned.replace(/,\s*\]/g, "]").replace(/,\s*\}/g, "}");

    // Strategy 1: balanced-brace extraction
    const startIdx = cleaned.indexOf("{");
    if (startIdx !== -1) {
        let depth = 0;
        for (let i = startIdx; i < cleaned.length; i++) {
            if (cleaned[i] === "{") depth++;
            else if (cleaned[i] === "}") depth--;
            if (depth === 0) {
                const candidate = cleaned.substring(startIdx, i + 1);
                try {
                    return JSON.parse(candidate);
                } catch {
                    // Try fixing unescaped quotes inside string values
                    try {
                        const fixed = fixUnescapedQuotes(candidate);
                        return JSON.parse(fixed);
                    } catch { break; }
                }
            }
        }
    }

    // Strategy 2: try to REPAIR truncated JSON
    if (startIdx !== -1) {
        let jsonStr = cleaned.substring(startIdx);

        // Remove the last incomplete entry (truncated claim)
        const lastCompleteComma = jsonStr.lastIndexOf("},");

        if (lastCompleteComma > 0) {
            jsonStr = jsonStr.substring(0, lastCompleteComma + 1) + "]}";
            try {
                const parsed = JSON.parse(jsonStr);
                if (parsed && (parsed.claims || parsed.topic)) {
                    console.log("[Veritas] Recovered truncated JSON successfully");
                    return parsed;
                }
            } catch { /* try next strategy */ }
        }

        // Try even more aggressive: truncate at last safe point, then close all open brackets
        let repaired = jsonStr;
        const lastSafe = Math.max(repaired.lastIndexOf(","), repaired.lastIndexOf("}"));
        if (lastSafe > 0) {
            repaired = repaired.substring(0, lastSafe + 1);
        }

        // Recount braces AFTER truncation so closing counts are accurate
        let openBraces = 0, openBrackets = 0;
        for (const ch of repaired) {
            if (ch === "{") openBraces++;
            else if (ch === "}") openBraces--;
            else if (ch === "[") openBrackets++;
            else if (ch === "]") openBrackets--;
        }

        for (let i = 0; i < openBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces; i++) repaired += "}";

        try {
            const parsed = JSON.parse(repaired);
            if (parsed) {
                console.log("[Veritas] Recovered truncated JSON with bracket repair");
                return parsed;
            }
        } catch { /* fall through */ }
    }

    // Strategy 3: regex fallback
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch {
            try {
                const fixed = fixUnescapedQuotes(match[0]);
                return JSON.parse(fixed);
            } catch { /* fall through */ }
        }
    }

    return null;
}

// Fix unescaped double-quotes inside JSON string values
function fixUnescapedQuotes(json: string): string {
    // Replace curly/smart quotes with straight quotes
    let fixed = json.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
    // Replace curly single quotes
    fixed = fixed.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    // Fix common pattern: "claim":"text with "quotes" inside" → escape inner quotes
    // This is a heuristic — replace double-quote preceded by a letter and followed by a letter (inside a value)
    fixed = fixed.replace(/(?<=\w)"(?=\w)/g, '\\"');
    return fixed;
}

// ============================================================
// Generate text with retry + exponential backoff (for rate limits)
// ============================================================

async function generateTextWithRetry(
    prompt: string,
    maxRetries = 3,
): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const { text } = await generateText({ model, prompt });
            return text;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            const isRateLimit = msg.includes("Rate limit") || msg.includes("429") || msg.includes("TPM");

            if (isRateLimit && attempt < maxRetries - 1) {
                // Exponential backoff: 10s, 20s, 40s
                const waitTime = 10000 * Math.pow(2, attempt);
                console.log(`[Veritas] Rate limited, waiting ${waitTime / 1000}s before retry ${attempt + 2}/${maxRetries}...`);
                await new Promise(r => setTimeout(r, waitTime));
                continue;
            }

            throw e;
        }
    }
    throw new Error("Max retries exceeded");
}

// ============================================================
// Single Claim Verification
// ============================================================

async function verifyClaim(
    claim: string,
    query: string,
    timestamp: string,
    topic: string,
): Promise<VerifiedClaim> {
    if (!tvly) {
        return {
            claim, timestamp,
            verdict: "Unverified", confidence: 0,
            source: "No search API key configured",
            reasoning: "Tavily API key not set — cannot perform web search.",
        };
    }

    try {
        const searchResult = await tvly.search(query, {
            search_depth: "advanced",
            max_results: 3,
            topic: "general",
        });

        if (!searchResult.results || searchResult.results.length === 0) {
            return {
                claim, timestamp,
                verdict: "Unverified", confidence: 0.2,
                source: "No search results",
                reasoning: "Web search returned no relevant results for this claim.",
            };
        }

        // Keep context short for Groq
        const context = searchResult.results
            .slice(0, 3)
            .map((r: { title?: string; content?: string }) =>
                `[${r.title || "Untitled"}]: ${(r.content || "").slice(0, 300)}`
            )
            .join("\n");
        const sourceUrl = searchResult.results[0]?.url || "Web Search";

        const text = await generateTextWithRetry(
            `Fact-check this claim using the search results below.

Claim: "${claim}"
Date: ${new Date().toISOString().split("T")[0]}

Sources:
${context}

Rules:
- If sources CONFIRM with matching data → "True"
- If sources CONTRADICT with different data → "False"  
- If sources are irrelevant or don't mention it → "Unverified"
- Reasoning: 1 sentence max.

Return ONLY JSON: {"verdict":"True"|"False"|"Unverified","confidence":0.0-1.0,"reasoning":"..."}`,
        );

        const parsed = extractJSON(text);
        if (!parsed) {
            return {
                claim, timestamp,
                verdict: "Unverified", confidence: 0,
                source: sourceUrl,
                reasoning: "Failed to parse verification response.",
            };
        }

        const validated = VerificationSchema.safeParse(parsed);
        const result = validated.success ? validated.data : {
            verdict: (parsed.verdict as "True" | "False" | "Unverified") || "Unverified",
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
            reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "Validation failed.",
        };

        return {
            claim, timestamp,
            verdict: result.verdict,
            confidence: result.confidence,
            source: sourceUrl,
            reasoning: result.reasoning,
        };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Verification failed for claim: "${claim.slice(0, 60)}..."`, msg);
        return {
            claim, timestamp,
            verdict: "Unverified", confidence: 0,
            source: "Error",
            reasoning: `Verification error: ${msg.slice(0, 100)}`,
        };
    }
}

// ============================================================
// Sequential Verification with Rate Limit Awareness
// ============================================================

async function verifyClaims(
    claims: ExtractedClaim[],
    topic: string,
): Promise<VerifiedClaim[]> {
    if (VERIFY_CONCURRENCY <= 1) {
        // Sequential: respect Groq's tiny TPM
        const results: VerifiedClaim[] = [];
        for (const c of claims) {
            if (results.length > 0) {
                await new Promise(r => setTimeout(r, VERIFY_DELAY_MS));
            }
            const result = await verifyClaim(c.claim, c.query, c.timestamp, topic);
            results.push(result);
        }
        return results;
    }

    // Parallel with concurrency limit
    const results: VerifiedClaim[] = new Array(claims.length);
    for (let i = 0; i < claims.length; i += VERIFY_CONCURRENCY) {
        const batch = claims.slice(i, i + VERIFY_CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map(c => verifyClaim(c.claim, c.query, c.timestamp, topic))
        );
        batchResults.forEach((r, j) => { results[i + j] = r; });
        if (i + VERIFY_CONCURRENCY < claims.length) {
            await new Promise(r => setTimeout(r, VERIFY_DELAY_MS));
        }
    }
    return results;
}

// ============================================================
// Generate Overall Summary
// ============================================================

async function generateSummary(
    topic: string,
    claims: VerifiedClaim[],
): Promise<string> {
    if (claims.length === 0) return "No verifiable claims were found in this content.";

    const trueCount = claims.filter(c => c.verdict === "True").length;
    const falseCount = claims.filter(c => c.verdict === "False").length;
    const unverifiedCount = claims.filter(c => c.verdict === "Unverified").length;

    try {
        const text = await generateTextWithRetry(
            `Write 2 sentences summarizing this fact-check. Be direct. Use same language as the topic.

Topic: "${topic}"
Results: ${trueCount} true, ${falseCount} false, ${unverifiedCount} unverified (${claims.length} total).
Key findings: ${claims.slice(0, 3).map(c => `[${c.verdict}] ${c.claim.slice(0, 80)}`).join("; ")}

No markdown. No bullet points. Just 2 plain sentences.`,
        );
        return text.trim();
    } catch {
        return `Analysis of "${topic}": ${trueCount} claims verified, ${falseCount} flagged false, ${unverifiedCount} unverified. Score: ${claims.length > 0 ? Math.round((trueCount / claims.length) * 100) : 0}/100.`;
    }
}

// ============================================================
// Main API Handler
// ============================================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, text } = body;

        if (!url && !text) {
            return NextResponse.json(
                { error: "URL or text content required" },
                { status: 400 },
            );
        }

        // Check AI key
        const hasAIKey = !!(
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
            process.env.OPENAI_API_KEY ||
            process.env.GROQ_API_KEY
        );
        if (!hasAIKey) {
            return NextResponse.json(
                { error: "No AI API key configured." },
                { status: 500 },
            );
        }

        // ── Step 1: Get transcript ───────────────────────────────
        let transcriptText = "";

        if (text) {
            transcriptText = text;
        } else if (url) {
            try {
                console.log(`[Veritas] Fetching transcript for: ${url}`);
                const transcript = await getTranscript(url);
                transcriptText = transcript.map(t => t.text).join(" ");
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error("[Veritas] Transcript fetch failed:", msg);
                return NextResponse.json(
                    { error: "TRANSCRIPT_FAILED", details: msg },
                    { status: 422 },
                );
            }
        }

        if (!transcriptText.trim()) {
            return NextResponse.json(
                { error: "Empty transcript — no content to analyze." },
                { status: 422 },
            );
        }

        // ── Step 2: Extract claims via LLM ───────────────────────
        console.log(`[Veritas] Extracting claims (transcript: ${transcriptText.length} chars, sending: ${Math.min(transcriptText.length, MAX_TRANSCRIPT_CHARS)} chars)`);

        // Helper function for extraction
        const extractClaimsWithMode = async (mode: "strict" | "relaxed") => {
            const isStrict = mode === "strict";
            const systemPrompt = isStrict
                ? `You are a ruthless fact-checker. Extract ONLY significant, falsifiable claims.
Target: ${MAX_CLAIMS} claims.

PRIORITIZE:
- Economic stats (prices, taxes, wages)
- Political/Legal assertions (laws, votes, crimes)
- Historical events & dates
- Scientific/Medical facts (studies, effectiveness)

CRITICAL: EXTRACT FULL, SELF-CONTAINED SENTENCES.
- BAD: "12 days"
- GOOD: "The subject claims to have spent 12 days in solitary confinement."

IGNORE ABSOLUTELY (unless topic is Health):
- Personal biological details (weight, sleep, diet)
- Anecdotes / Feelings
- Generalizations

Return ONLY compact JSON: {"topic":"Subject","claims":[{"claim":"...","timestamp":"...","query":"..."}]}`
                : `You are a fact-checker. Extract ANY verifiable claims, including personal timeline events.
Target: ${MAX_CLAIMS} claims.

EXTRACT:
- Specific numbers (dates, days, amounts, weight lost/gained)
- Specific events in the timeline (arrest, release, travel)
- Quotes or accusations

CRITICAL: EXTRACT FULL, SELF-CONTAINED SENTENCES.

Return ONLY compact JSON: {"topic":"Subject","claims":[{"claim":"...","timestamp":"...","query":"..."}]}`;

            console.log(`[Veritas] Extracting claims (${mode} mode)...`);
            const text = await generateTextWithRetry(
                `${systemPrompt}\n\nText:\n"${transcriptText.slice(0, MAX_TRANSCRIPT_CHARS)}"`
            );
            console.log(`[Veritas DEBUG] ${mode.toUpperCase()} Output:`, text.slice(0, 100) + "...");
            return { text, data: extractJSON(text) };
        };

        // 1. Try STRICT mode first
        let result = await extractClaimsWithMode("strict");
        let extracted = result.data;

        // 2. logic: If 0 claims found, RETRY with RELAXED mode
        if (!extracted || !extracted.claims || (Array.isArray(extracted.claims) && extracted.claims.length === 0)) {
            console.warn("[Veritas] Strict mode yielded 0 claims. Retrying with RELAXED mode...");
            result = await extractClaimsWithMode("relaxed");
            extracted = result.data;
        }

        const generatedText = result.text; // For logging/fallback



        // (Old fallback logic removed as it's handled by helper)

        if (!extracted) {
            console.error("[Veritas] Failed to parse claims from LLM:", generatedText.slice(0, 500));
            // Instead of erroring 500, return a safe "No claims found" response
            return NextResponse.json({
                url: url || null,
                topic: "Analysis Failed",
                summary: "We couldn't extract verifiable claims from this content. The AI output was malformed.",
                truthScore: 0,
                claims: [],
                meta: { totalClaims: 0, trueCount: 0, falseCount: 0, unverifiedCount: 0 },
            });
        }

        // Handle case where claims array exists but might be incomplete
        const rawClaims = Array.isArray(extracted.claims) ? extracted.claims : [];
        const claims: ExtractedClaim[] = rawClaims
            .filter((c: unknown): c is ExtractedClaim => {
                const obj = c as Record<string, unknown>;
                return typeof obj === "object" && obj !== null && typeof obj.claim === "string" && obj.claim.length > 5;
            })
            .slice(0, MAX_CLAIMS); // Cap claims to avoid rate limit hell

        const topic = (typeof extracted.topic === "string" ? extracted.topic : "General") || "General";

        console.log(`[Veritas] Extracted ${claims.length} claims for topic: "${topic}"`);

        if (claims.length === 0) {
            return NextResponse.json({
                url: url || null,
                topic,
                summary: "No verifiable claims were found in this content.",
                truthScore: 0,
                claims: [],
                meta: { totalClaims: 0, trueCount: 0, falseCount: 0, unverifiedCount: 0 },
            });
        }

        // ── Step 3: Verify claims (sequential for Groq) ─────────
        console.log(`[Veritas] Verifying ${claims.length} claims (delay: ${VERIFY_DELAY_MS}ms, provider: ${isGroq ? "Groq" : "other"})...`);
        const verifiedClaims = await verifyClaims(claims, topic);

        // ── Step 4: Generate summary ─────────────────────────────
        // Wait before summary to avoid rate limit
        if (isGroq) await new Promise(r => setTimeout(r, 3000));
        const summary = await generateSummary(topic, verifiedClaims);

        // ── Step 5: Compute score ────────────────────────────────
        const trueCount = verifiedClaims.filter(c => c.verdict === "True").length;
        const falseCount = verifiedClaims.filter(c => c.verdict === "False").length;
        const decidedCount = trueCount + falseCount;
        // Only count decided claims (True/False) in the score — Unverified shouldn't penalize
        const truthScore = decidedCount > 0
            ? Math.round((trueCount / decidedCount) * 100)
            : (verifiedClaims.length > 0 ? 50 : 0); // If all unverified, neutral 50

        console.log(`[Veritas] ✓ Analysis complete. Score: ${truthScore}/100, Claims: ${verifiedClaims.length}`);

        return NextResponse.json({
            url: url || null,
            topic,
            summary,
            truthScore,
            claims: verifiedClaims,
            meta: {
                totalClaims: verifiedClaims.length,
                trueCount,
                falseCount: verifiedClaims.filter(c => c.verdict === "False").length,
                unverifiedCount: verifiedClaims.filter(c => c.verdict === "Unverified").length,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Veritas] Analysis error:", msg);
        return NextResponse.json(
            { error: "Internal Server Error", details: msg },
            { status: 500 },
        );
    }
}
