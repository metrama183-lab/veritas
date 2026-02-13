import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Robust YouTube Video ID extraction
export function extractVideoId(url: string): string | null {
  try {
    // Supports: standard, shorts, embed, youtu.be, params
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    // Fallback for "shorts" if not caught above or other formats
    const match = url.match(regex);
    if (match) return match[1];

    // Try catching simpler patterns if the complex one fails
    const simpleMatch = url.match(/[?&]v=([^&]+)/);
    if (simpleMatch) return simpleMatch[1];

    // Handle shorts specifically if path contains /shorts/
    if (url.includes("/shorts/")) {
      const shortsMatch = url.split("/shorts/")[1]?.split("?")[0];
      if (shortsMatch) return shortsMatch;
    }

    return null;
  } catch (e) {
    return null;
  }
}
