import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);
import OpenAI from 'openai';

// Initialize OpenAI client for Groq
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1",
});

const TEMP_DIR = path.join(process.cwd(), 'tmp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function downloadAudio(url: string, videoId: string): Promise<string> {
    const outputTemplate = path.join(TEMP_DIR, `${videoId}.%(ext)s`);
    // Hardcoded absolute path to the binary to bypass Next.js environment issues
    const binaryPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');

    // Command construction
    // We use the binary directy via exec
    // Use --no-part to avoid the .part -> .final rename issue
    // Use --force-overwrites to ensure we don't get stuck on existing files
    const command = `"${binaryPath}" "${url}" --format bestaudio --output "${outputTemplate}" --no-check-certificates --no-warnings --prefer-free-formats --no-part --force-overwrites`;

    console.log(`Downloading audio for ${videoId} using direct exec (v2 - no-part)...`);

    try {
        const { stdout, stderr } = await execPromise(command, { timeout: 60000 });
        if (stderr) console.warn(`yt-dlp stderr: ${stderr}`);
        console.log(`yt-dlp stdout: ${stdout}`);
    } catch (e: any) {
        // If the error contains stdout/stderr, log it
        const errorDetails = `Error: ${e.message}\nStdout: ${e.stdout}\nStderr: ${e.stderr}`;
        console.error("yt-dlp execution details:", errorDetails);
        throw new Error(`yt-dlp execution failed: ${errorDetails}`);
    }

    // Clean up stale files for this videoId, then find the new one
    const files = fs.readdirSync(TEMP_DIR);
    const downloadedFile = files
        .filter(f => f.startsWith(videoId))
        .sort((a, b) => {
            const sa = fs.statSync(path.join(TEMP_DIR, a)).mtimeMs;
            const sb = fs.statSync(path.join(TEMP_DIR, b)).mtimeMs;
            return sb - sa; // newest first
        })[0];

    if (!downloadedFile) {
        throw new Error("Audio download failed: File not found in " + TEMP_DIR);
    }

    const filePath = path.join(TEMP_DIR, downloadedFile);

    // Check file size — Groq Whisper limit is 25MB
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
    const fileSize = fs.statSync(filePath).size;
    if (fileSize > MAX_AUDIO_SIZE) {
        fs.unlinkSync(filePath);
        throw new Error(`Audio file too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Groq Whisper limit is 25MB.`);
    }

    return filePath;
}

export async function transcribeAudio(filePath: string): Promise<string> {
    console.log(`Transcribing ${filePath}...`);

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3-turbo", // Groq's fastest production whisper model
            response_format: "text", // strict text response
            temperature: 0.0,
        });

        // OpenAI SDK may return string or object depending on version
        if (typeof transcription === "string") return transcription;
        if (typeof (transcription as any).text === "string") return (transcription as any).text;
        return JSON.stringify(transcription);
    } catch (error) {
        console.error("Groq Transcription failed:", error);
        throw error;
    } finally {
        // Cleanup: verify file exists before deleting
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted temp file: ${filePath}`);
        }
    }
}

export async function getAudioTranscript(url: string, videoId: string): Promise<string> {
    try {
        const audioPath = await downloadAudio(url, videoId);
        const transcript = await transcribeAudio(audioPath);
        return transcript;
    } catch (error: any) {
        const errorMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
        fs.writeFileSync(path.join(process.cwd(), 'debug_error.log'), `Audio Pipeline Error: ${errorMsg}\n`);
        console.error("Audio Pipeline Failed:", error);
        throw new Error(`Audio Pipeline Error: ${error.message || errorMsg}`);
    }
}
