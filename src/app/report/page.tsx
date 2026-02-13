"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Claim {
    claim: string;
    timestamp: string;
    verdict: "True" | "False" | "Unverified";
    confidence: number;
    source: string;
}

export default function ReportPage() {
    const searchParams = useSearchParams();
    const videoUrl = searchParams.get("q");
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);

    // Extract video ID for embed
    const videoId = videoUrl ? new URL(decodeURIComponent(videoUrl)).searchParams.get("v") : null;

    useEffect(() => {
        if (!videoUrl) return;

        // Simulate API fetch
        const fetchAnalysis = async () => {
            try {
                const res = await fetch("/api/analyze", {
                    method: "POST",
                    body: JSON.stringify({ url: decodeURIComponent(videoUrl) }),
                });
                const data = await res.json();
                setClaims(data.claims || []);
            } catch (error) {
                console.error("Failed to fetch report", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [videoUrl]);

    if (!videoUrl || !videoId) {
        return <div className="text-white p-10">Invalid URL provided.</div>;
    }

    return (
        <main className="min-h-screen bg-black text-zinc-100 p-6">
            <header className="max-w-7xl mx-auto flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Veritas Report</h1>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Video Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="aspect-video w-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 relative">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                    </div>

                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-2">Analysis Summary</h2>
                        <div className="flex gap-4">
                            <ScoreCard label="Truth Score" value="12/100" color="text-red-500" />
                            <ScoreCard label="Claims Checked" value={claims.length.toString()} color="text-white" />
                        </div>
                    </div>
                </div>

                {/* Claims Timeline */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold sticky top-4">Truth Timeline</h3>

                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-zinc-900 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2">
                            {claims.map((claim, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`p-4 rounded-xl border ${claim.verdict === "False"
                                            ? "bg-red-950/20 border-red-900/50"
                                            : "bg-green-950/20 border-green-900/50"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-xs bg-black/50 px-2 py-1 rounded text-zinc-400">
                                            {claim.timestamp}
                                        </span>
                                        {claim.verdict === "False" ? (
                                            <span className="flex items-center gap-1 text-red-500 text-sm font-bold">
                                                <XCircle className="w-4 h-4" /> Bullshit
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-green-500 text-sm font-bold">
                                                <CheckCircle className="w-4 h-4" /> Verified
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-medium text-zinc-200 mb-2">"{claim.claim}"</p>
                                    <div className="text-xs text-zinc-500">
                                        Source: <span className="underline">{claim.source}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

function ScoreCard({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="flex-1 p-4 bg-black/40 rounded-lg">
            <div className="text-sm text-zinc-500 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
    )
}
