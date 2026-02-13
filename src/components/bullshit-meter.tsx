"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BullshitMeterProps {
    score: number; // 0–100 truth score
    size?: number;
}

export function BullshitMeter({ score, size = 200 }: BullshitMeterProps) {
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        // Animate the score counting up
        const duration = 1500;
        const steps = 60;
        const increment = score / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= score) {
                setAnimatedScore(score);
                clearInterval(timer);
            } else {
                setAnimatedScore(Math.round(current));
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [score]);

    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    // Color based on score
    const getColor = (s: number) => {
        if (s >= 75) return { stroke: "#22c55e", glow: "rgba(34,197,94,0.3)", label: "Credible" };
        if (s >= 50) return { stroke: "#eab308", glow: "rgba(234,179,8,0.3)", label: "Mixed" };
        if (s >= 25) return { stroke: "#f97316", glow: "rgba(249,115,22,0.3)", label: "Dubious" };
        return { stroke: "#ef4444", glow: "rgba(239,68,68,0.3)", label: "🐂💩" };
    };

    const color = getColor(animatedScore);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background glow */}
                <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-50"
                    style={{ background: color.glow }}
                />

                <svg width={size} height={size} className="relative z-10 -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#27272a"
                        strokeWidth="8"
                    />
                    {/* Score arc */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="gauge-circle"
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <motion.span
                        key={animatedScore}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-4xl font-black tabular-nums"
                        style={{ color: color.stroke }}
                    >
                        {animatedScore}
                    </motion.span>
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                        / 100
                    </span>
                </div>
            </div>

            {/* Label */}
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="px-4 py-1.5 rounded-full text-sm font-bold"
                style={{
                    background: `${color.glow}`,
                    color: color.stroke,
                    border: `1px solid ${color.stroke}40`,
                }}
            >
                {color.label}
            </motion.div>
        </div>
    );
}
