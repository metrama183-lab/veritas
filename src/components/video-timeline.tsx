"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Claim {
    claim: string;
    timestamp: string;
    verdict: "True" | "False" | "Unverified";
    confidence: number;
}

interface VideoTimelineProps {
    claims: Claim[];
    onClaimClick?: (index: number) => void;
}

function parseTimestamp(ts: string): number {
    // Parse "MM:SS" or "HH:MM:SS" or "0:00" or just seconds
    const parts = ts.replace(/[^0-9:]/g, "").split(":");
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    return parseInt(parts[0]) || 0;
}

const VERDICT_COLORS = {
    True: { bg: "bg-green-500", border: "border-green-500", ring: "ring-green-500/30" },
    False: { bg: "bg-red-500", border: "border-red-500", ring: "ring-red-500/30" },
    Unverified: { bg: "bg-yellow-500", border: "border-yellow-500", ring: "ring-yellow-500/30" },
};

export function VideoTimeline({ claims, onClaimClick }: VideoTimelineProps) {
    if (claims.length === 0) return null;

    // Parse timestamps and find range
    const parsed = claims.map((c, i) => ({
        ...c,
        index: i,
        seconds: parseTimestamp(c.timestamp),
    }));

    const maxTime = Math.max(...parsed.map(p => p.seconds), 1);

    // Group claims that are very close together
    const trueCount = claims.filter(c => c.verdict === "True").length;
    const falseCount = claims.filter(c => c.verdict === "False").length;
    const unverifiedCount = claims.filter(c => c.verdict === "Unverified").length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Claim Timeline
                </h4>
                <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" /> {trueCount} True
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> {falseCount} False
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" /> {unverifiedCount} Unverified
                    </span>
                </div>
            </div>

            {/* Timeline bar */}
            <div className="relative h-10 bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-visible">
                {/* Background gradient showing overall density */}
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-zinc-900 via-zinc-800/30 to-zinc-900" />
                </div>

                {/* Claim markers */}
                {parsed.map((claim, i) => {
                    const position = maxTime > 0 ? (claim.seconds / maxTime) * 100 : (i / Math.max(parsed.length - 1, 1)) * 100;
                    const clampedPos = Math.max(3, Math.min(97, position));
                    const colors = VERDICT_COLORS[claim.verdict];

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer z-10"
                            style={{ left: `${clampedPos}%` }}
                            onClick={() => onClaimClick?.(claim.index)}
                        >
                            {/* Marker dot */}
                            <div className={cn(
                                "w-4 h-4 rounded-full ring-2 transition-all duration-200",
                                "group-hover:scale-150 group-hover:ring-4",
                                colors.bg, colors.ring,
                            )} />

                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="bg-black border border-zinc-700 rounded-lg p-2 text-[10px] w-48 shadow-xl">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-zinc-400">{claim.timestamp}</span>
                                        <span className={cn("font-bold", {
                                            "text-green-500": claim.verdict === "True",
                                            "text-red-500": claim.verdict === "False",
                                            "text-yellow-500": claim.verdict === "Unverified",
                                        })}>
                                            {claim.verdict}
                                        </span>
                                    </div>
                                    <p className="text-zinc-300 line-clamp-2">{claim.claim}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Time labels */}
                <div className="absolute bottom-0 left-2 text-[9px] font-mono text-zinc-600 leading-10">0:00</div>
                <div className="absolute bottom-0 right-2 text-[9px] font-mono text-zinc-600 leading-10">
                    {Math.floor(maxTime / 60)}:{String(maxTime % 60).padStart(2, "0")}
                </div>
            </div>
        </div>
    );
}
