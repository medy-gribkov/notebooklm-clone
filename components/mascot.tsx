import Image from "next/image";

interface MascotProps {
    size?: "sm" | "md" | "lg";
    mood?: "happy" | "thinking" | "surprised" | "neutral";
    className?: string;
}

export function Mascot({ size = "md", className = "" }: MascotProps) {
    // Map size prop to explicit integer widths for Next.js Image optimization
    const dimensions = {
        sm: 64,
        md: 128,
        lg: 192,
    };

    const currentSize = dimensions[size];

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className="animate-float transition-transform duration-500 ease-in-out hover:scale-105 hover:-rotate-2">
                <Image
                    src="/mascot.png"
                    alt="DocChat Assistant"
                    width={currentSize}
                    height={currentSize}
                    priority
                    className="object-contain drop-shadow-sm mix-blend-multiply dark:mix-blend-screen dark:invert dark:opacity-90 dark:hue-rotate-180"
                />
            </div>
        </div>
    );
}
