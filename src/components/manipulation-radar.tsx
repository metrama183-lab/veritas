"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tactic {
    tactic: string;
    score: number;
    example: string;
    explanation: string;
}

interface ManipulationRadarProps {
    tactics: Tactic[];
    manipulationScore: number;
    summary: string;
}

const TACTIC_COLORS: Record<string, string> = {
    "Appeal to Emotion": "#ef4444",
    "Appeal to Authority": "#f97316",
    "Cherry-Picking": "#eab308",
    "False Dichotomy": "#84cc16",
    "Loaded Language": "#06b6d4",
    "Bandwagon": "#8b5cf6",
    "Strawman": "#ec4899",
    "Repetition": "#6366f1",
};

const TACTIC_ICONS: Record<string, string> = {
    "Appeal to Emotion": "😢",
    "Appeal to Authority": "👔",
    "Cherry-Picking": "🍒",
    "False Dichotomy": "⚖️",
    "Loaded Language": "💣",
    "Bandwagon": "🐑",
    "Strawman": "🎃",
    "Repetition": "🔁",
};

export function ManipulationRadar({ tactics, manipulationScore, summary }: ManipulationRadarProps) {
    const [animated, setAnimated] = useState(false);
    const [hoveredTactic, setHoveredTactic] = useState<Tactic | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setAnimated(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const size = 280;
    const center = size / 2;
    const maxRadius = size / 2 - 40;
    const levels = 4;
    const n = tactics.length;
    const angleStep = (2 * Math.PI) / n;

    // Generate polygon points for a given set of values (0-100)
    const getPolygonPoints = (values: number[]) => {
        return values.map((val, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (val / 100) * maxRadius;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(" ");
    };

    // Grid polygons (concentric)
    const gridPolygons = Array.from({ length: levels }, (_, level) => {
        const r = ((level + 1) / levels) * maxRadius;
        const points = Array.from({ length: n }, (_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(" ");
        return points;
    });

    // Axis lines
    const axes = Array.from({ length: n }, (_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return {
            x2: center + maxRadius * Math.cos(angle),
            y2: center + maxRadius * Math.sin(angle),
        };
    });

    // Label positions (slightly outside the chart)
    const labelPositions = Array.from({ length: n }, (_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = maxRadius + 28;
        return {
            x: center + labelR * Math.cos(angle),
            y: center + labelR * Math.sin(angle),
        };
    });

    const values = tactics.map(t => animated ? t.score : 0);
    const dataPoints = getPolygonPoints(values);

    // Color based on manipulation score
    const getScoreColor = (s: number) => {
        if (s >= 70) return { color: "#ef4444", label: "Highly Manipulative", bg: "rgba(239,68,68,0.1)" };
        if (s >= 40) return { color: "#f97316", label: "Moderately Manipulative", bg: "rgba(249,115,22,0.1)" };
        if (s >= 15) return { color: "#eab308", label: "Mildly Persuasive", bg: "rgba(234,179,8,0.1)" };
        return { color: "#22c55e", label: "Neutral / Factual", bg: "rgba(34,197,94,0.1)" };
    };

    const scoreStyle = getScoreColor(manipulationScore);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                    Manipulation Radar
                </h3>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2"
                >
                    <span className="text-xs text-zinc-500">Manipulation</span>
                    <span
                        className="text-lg font-black tabular-nums"
                        style={{ color: scoreStyle.color }}
                    >
                        {manipulationScore}
                    </span>
                    <span className="text-xs text-zinc-600">/100</span>
                </motion.div>
            </div>

            {/* Radar Chart */}
            <div className="flex justify-center">
                <svg width={size} height={size} className="overflow-visible">
                    {/* Grid */}
                    {gridPolygons.map((points, i) => (
                        <polygon
                            key={`grid-${i}`}
                            points={points}
                            fill="none"
                            stroke="#27272a"
                            strokeWidth="1"
                            opacity={0.5}
                        />
                    ))}

                    {/* Axes */}
                    {axes.map((axis, i) => (
                        <line
                            key={`axis-${i}`}
                            x1={center}
                            y1={center}
                            x2={axis.x2}
                            y2={axis.y2}
                            stroke="#27272a"
                            strokeWidth="1"
                            opacity={0.3}
                        />
                    ))}

                    {/* Data polygon */}
                    <motion.polygon
                        points={dataPoints}
                        fill={scoreStyle.color}
                        fillOpacity={0.15}
                        stroke={scoreStyle.color}
                        strokeWidth="2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.3 }}
                    />

                    {/* Data points (dots) */}
                    {values.map((val, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = (val / 100) * maxRadius;
                        const cx = center + r * Math.cos(angle);
                        const cy = center + r * Math.sin(angle);
                        return (
                            <motion.circle
                                key={`dot-${i}`}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill={TACTIC_COLORS[tactics[i].tactic] || scoreStyle.color}
                                stroke="#000"
                                strokeWidth="1.5"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredTactic(tactics[i])}
                                onMouseLeave={() => setHoveredTactic(null)}
                            />
                        );
                    })}

                    {/* Labels */}
                    {labelPositions.map((pos, i) => (
                        <text
                            key={`label-${i}`}
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[9px] fill-zinc-500 font-medium select-none"
                        >
                            {TACTIC_ICONS[tactics[i].tactic] || ""} {tactics[i].tactic.split(" ").pop()}
                        </text>
                    ))}
                </svg>
            </div>

            {/* Label badge */}
            <div className="flex justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                        background: scoreStyle.bg,
                        color: scoreStyle.color,
                        border: `1px solid ${scoreStyle.color}40`,
                    }}
                >
                    {scoreStyle.label}
                </motion.div>
            </div>

            {/* Hover tooltip */}
            <AnimatePresence>
                {hoveredTactic && hoveredTactic.score > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <span>{TACTIC_ICONS[hoveredTactic.tactic]}</span>
                            <span className="font-bold text-zinc-200">{hoveredTactic.tactic}</span>
                            <span className="ml-auto font-mono" style={{ color: TACTIC_COLORS[hoveredTactic.tactic] }}>
                                {hoveredTactic.score}/100
                            </span>
                        </div>
                        {hoveredTactic.example && (
                            <p className="text-zinc-400 italic">&quot;{hoveredTactic.example}&quot;</p>
                        )}
                        {hoveredTactic.explanation && (
                            <p className="text-zinc-500">{hoveredTactic.explanation}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tactic bars (compact list) */}
            <div className="space-y-1.5">
                {tactics
                    .filter(t => t.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map((t, i) => (
                        <motion.div
                            key={t.tactic}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.08 }}
                            className="flex items-center gap-2 text-xs cursor-pointer group"
                            onClick={() => setHoveredTactic(hoveredTactic?.tactic === t.tactic ? null : t)}
                        >
                            <span className="w-4 text-center">{TACTIC_ICONS[t.tactic]}</span>
                            <span className="text-zinc-400 w-24 truncate group-hover:text-zinc-200 transition-colors">
                                {t.tactic}
                            </span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: TACTIC_COLORS[t.tactic] }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${t.score}%` }}
                                    transition={{ duration: 1, delay: 1 + i * 0.08 }}
                                />
                            </div>
                            <span className="font-mono text-zinc-500 w-8 text-right">{t.score}</span>
                        </motion.div>
                    ))}
                {tactics.filter(t => t.score > 0).length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-2">No manipulation tactics detected</p>
                )}
            </div>

            {/* Summary */}
            {summary && summary !== "Could not analyze manipulation tactics." && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="text-xs text-zinc-500 italic text-center"
                >
                    {summary}
                </motion.p>
            )}
        </div>
    );
}
