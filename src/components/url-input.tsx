"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function UrlInput() {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setIsLoading(true);

        // Encode and redirect
        const encodedUrl = encodeURIComponent(url);
        router.push(`/report?q=${encodedUrl}`);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center bg-black rounded-lg border border-zinc-800 focus-within:border-red-500/50 transition-colors">
                    <Search className="ml-4 text-zinc-500 w-5 h-5" />
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube URL here..."
                        className="w-full bg-transparent text-white placeholder-zinc-500 px-4 py-4 focus:outline-none font-medium"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={cn(
                            "mr-2 px-4 py-2 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-all flex items-center gap-2",
                            isLoading && "opacity-50 cursor-not-allowed"
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
    );
}
