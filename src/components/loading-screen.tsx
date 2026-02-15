"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TRIVIA = [
    { fact: "Did you know? Goldfish actually have a memory span of several months, not 3 seconds.", status: "Debunking Myths..." },
    { fact: "Fun Fact: The Great Wall of China is NOT visible from space with the naked eye.", status: "Scanning Satellite Data..." },
    { fact: "Myth: Bulls essentially see in black and white. They react to the cape's movement, not the color red.", status: "Analyzing Visual Patterns..." },
    { fact: "True: Bananas are berries, but strawberries are not!", status: "Classifying Botanical Data..." },
    { fact: "Myth: You swallow 8 spiders a year in your sleep. This is a complete fabrication.", status: "Verifying Biological Statistics..." },
    { fact: "Fact: Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.", status: "carbon-dating artifacts..." },
    { fact: "Myth: Bats are not blind. They actually have quite good eyesight.", status: "Echolocating Truth..." },
    { fact: "True: Wombat poop is cube-shaped to stop it from rolling away.", status: "Analyzing Geometry..." }
];

export function LoadingScreen({ mode: _mode }: { mode: "video" | "text" }) {
    void _mode; // Prop reserved for future use
    const [progress, setProgress] = useState(0);
    const [triviaIndex, setTriviaIndex] = useState(0);

    // Psychological Progress Bar Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress >= 95) return 95; // Never hit 100% until actually done

                // Fast start (0-30%), Slow middle (30-80%), Crawl end (80-95%)
                let increment = 1;
                if (oldProgress < 30) increment = 5;
                else if (oldProgress < 70) increment = 0.5;
                else increment = 0.1;

                // Add some randomness to feel "real"
                if (Math.random() > 0.7) increment *= 2;

                return Math.min(oldProgress + increment, 95);
            });
        }, 100);

        return () => clearInterval(timer);
    }, []);

    // Rotate Trivia every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setTriviaIndex((prev) => (prev + 1) % TRIVIA.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-8 space-y-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur-sm">

            {/* Animated Logo/Spinner */}
            <div className="relative">
                <div className="w-20 h-20 border-4 border-zinc-800 rounded-full" />
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-red-500">
                    {Math.round(progress)}%
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-red-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "linear", duration: 0.1 }}
                    />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-mono">
                    <span>{progress < 30 ? "Initializing..." : progress < 70 ? "Deep Search..." : "Finalizing..."}</span>
                    <span>{TRIVIA[triviaIndex].status}</span>
                </div>
            </div>

            {/* Trivia Carousel */}
            <div className="h-24 relative w-full overflow-hidden text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={triviaIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="absolute w-full space-y-2"
                    >
                        <h4 className="text-red-400 text-xs font-bold uppercase tracking-wider">
                            While you wait...
                        </h4>
                        <p className="text-zinc-300 text-sm leading-relaxed italic">
                            &ldquo;{TRIVIA[triviaIndex].fact}&rdquo;
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

        </div>
    );
}
