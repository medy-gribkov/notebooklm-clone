import Image from "next/image";

interface MascotProps {
    size?: "sm" | "md" | "lg";
    mood?: "happy" | "thinking" | "surprised" | "neutral" | "error";
    className?: string;
}

export function Mascot({ size = "md", mood = "neutral", className = "" }: MascotProps) {
    // Map size prop to explicit integer widths for Next.js Image optimization
    const dimensions = {
        sm: 64,
        md: 128,
        lg: 192,
    };

    const currentSize = dimensions[size];

    // Define animation states strictly through CSS motion design to retain 100% character consistency
    const moodAnimations: Record<string, string> = {
        happy: "animate-float hover:scale-105 hover:-rotate-2 hover:drop-shadow-xl",
        neutral: "animate-float hover:scale-105 hover:-rotate-2",
        thinking: "animate-float-fast hover:scale-105",
        surprised: "animate-bounce hover:scale-110",
        error: "animate-shake grayscale drop-shadow-md",
    };

    const animationClass = moodAnimations[mood] || moodAnimations.neutral;

    const src = mood === "thinking" ? "/mascot-thinking.webp" : "/mascot-idle.webp";

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className={`transition-all duration-500 ease-in-out ${animationClass}`}>
                <Image
                    src={src}
                    alt="DocChat Assistant"
                    width={currentSize}
                    height={currentSize}
                    priority
                    className="object-contain drop-shadow-md"
                />
            </div>
        </div>
    );
}
