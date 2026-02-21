"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

interface MascotProps {
    size?: "sm" | "md" | "lg";
    mood?: "happy" | "thinking" | "surprised" | "neutral";
    className?: string;
}

export function Mascot({ size = "md", mood = "neutral", className = "" }: MascotProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const dimensions = {
        sm: "w-16 h-16",
        md: "w-32 h-32",
        lg: "w-48 h-48",
    };

    const currentSize = dimensions[size];
    const isDark = mounted && theme === "dark";

    // Base colors mapped to Anthropic OKLCH
    const bodyColor = isDark ? "fill-[oklch(0.25_0.02_260)]" : "fill-[oklch(0.97_0.01_260)]";
    const strokeColor = "stroke-primary";
    const accentColor = "fill-primary/20";
    const featureColor = "fill-primary";

    // Eyes based on mood
    const renderEyes = () => {
        switch (mood) {
            case "happy":
                return (
                    <>
                        <path d="M 35 45 Q 40 40 45 45" className={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M 55 45 Q 60 40 65 45" className={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                    </>
                );
            case "thinking":
                return (
                    <>
                        <circle cx="40" cy="45" r="3" className={featureColor} />
                        <circle cx="60" cy="40" r="3" className={featureColor} />
                        {/* Thinking brow */}
                        <line x1="35" y1="38" x2="45" y2="40" className={strokeColor} strokeWidth="2" strokeLinecap="round" />
                        <line x1="55" y1="35" x2="65" y2="33" className={strokeColor} strokeWidth="2" strokeLinecap="round" />
                    </>
                );
            case "surprised":
                return (
                    <>
                        <circle cx="40" cy="42" r="4" className={featureColor} />
                        <circle cx="60" cy="42" r="4" className={featureColor} />
                        {/* Raised brows */}
                        <path d="M 35 32 Q 40 28 45 32" className={strokeColor} strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 55 32 Q 60 28 65 32" className={strokeColor} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </>
                );
            case "neutral":
            default:
                return (
                    <>
                        <circle cx="40" cy="45" r="3" className={featureColor} />
                        <circle cx="60" cy="45" r="3" className={featureColor} />
                    </>
                );
        }
    };

    // Mouth based on mood
    const renderMouth = () => {
        switch (mood) {
            case "happy":
                return <path d="M 45 55 Q 50 62 55 55" className={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
            case "thinking":
                return <line x1="48" y1="58" x2="52" y2="58" className={strokeColor} strokeWidth="3" strokeLinecap="round" />;
            case "surprised":
                return <circle cx="50" cy="58" r="4" className={strokeColor} strokeWidth="2" fill="none" />;
            case "neutral":
            default:
                return <path d="M 45 56 Q 50 58 55 56" className={strokeColor} strokeWidth="2" fill="none" strokeLinecap="round" />;
        }
    };

    // SVG Drawing - A minimalist, geometric "book/document" character
    return (
        <div className={`relative flex items-center justify-center ${currentSize} ${className}`}>
            <svg
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-sm transition-transform duration-500 ease-in-out hover:scale-105 hover:-rotate-2"
            >
                <g className="animate-float">
                    {/* Main Body (Book/Paper) */}
                    <rect
                        x="20"
                        y="20"
                        width="60"
                        height="65"
                        rx="12"
                        className={`${bodyColor} ${strokeColor}`}
                        strokeWidth="3"
                    />

                    {/* Paper Fold/Accent */}
                    <path
                        d="M 60 20 L 80 40 L 80 32 Q 80 20 68 20 Z"
                        className={accentColor}
                    />
                    <path
                        d="M 60 20 L 60 36 Q 60 40 64 40 L 80 40"
                        className={strokeColor}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Lines indicating text */}
                    <line x1="30" y1="70" x2="60" y2="70" className={strokeColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                    <line x1="30" y1="76" x2="50" y2="76" className={strokeColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />

                    {/* Face Elements */}
                    {renderEyes()}
                    {renderMouth()}
                </g>
            </svg>
        </div>
    );
}
