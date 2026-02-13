"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES_VIDEO = [
    "Connecting to Knowledge Base...",
    "Extracting Audio Stream...",
    "Transcribing Content (AI Model)...",
    "Analyzing Claims & Context...",
    "Cross-referencing with Global Sources...",
    "Calculating Truth Score..."
];

const MESSAGES_TEXT = [
    "Reading Text Content...",
    "Analyzing Claims & Context...",
    "Cross-referencing with Global Sources...",
    "Calculating Truth Score..."
];

export function LoadingMessages({ mode }: { mode: "video" | "text" }) {
    const [index, setIndex] = useState(0);
    const messages = mode === "text" ? MESSAGES_TEXT : MESSAGES_VIDEO;

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 2500); // Change message every 2.5s
        return () => clearInterval(timer);
    }, [messages.length]);

    return (
        <div className="h-8 relative w-full overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-zinc-400 font-mono text-sm absolute w-full"
                >
                    {messages[index]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}
