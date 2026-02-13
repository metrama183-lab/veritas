"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function UrlInput() {
    const [mode, setMode] = useState<"url" | "text">("url");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input) return;

        setIsLoading(true);

        if (mode === "url") {
            const encodedUrl = encodeURIComponent(input);
            router.push(`/report?q=${encodedUrl}`);
        } else {
            // Store text for the report page to retrieve
            sessionStorage.setItem("veritas_manual_text", input);
            router.push(`/report?mode=text`);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-4">
            {/* Tabs */}
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-fit mx-auto backdrop-blur-sm">
                <button
                    onClick={() => setMode("url")}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all",
                        mode === "url" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    )}
                >
                    YouTube URL
                </button>
                <button
                    onClick={() => setMode("text")}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all",
                        mode === "text" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    )}
                >
                    Manual Text
                </button>
            </div>

            <form onSubmit={handleSubmit} className="relative w-full">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                    <div className="relative flex items-center bg-black rounded-lg border border-zinc-800 focus-within:border-red-500/50 transition-colors overflow-hidden">
                        {mode === "url" ? (
                            <Search className="ml-4 text-zinc-500 w-5 h-5 flex-shrink-0" />
                        ) : (
                            <span className="ml-4 text-zinc-500 text-xs font-mono flex-shrink-0">TXT</span>
                        )}

                        {mode === "url" ? (
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Paste YouTube URL here..."
                                className="w-full bg-transparent text-white placeholder-zinc-500 px-4 py-4 focus:outline-none font-medium"
                            />
                        ) : (
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Paste article content, transcript, or claim text..."
                                className="w-full bg-transparent text-white placeholder-zinc-500 px-4 py-4 focus:outline-none font-medium resize-none h-[56px] pt-4"
                                style={{ minHeight: "56px" }}
                            />
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !input}
                            className={cn(
                                "mr-2 px-4 py-2 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 flex-shrink-0",
                                (isLoading || !input) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Analyze <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
