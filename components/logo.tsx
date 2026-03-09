interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSize = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const docSize = size === "sm" ? 18 : size === "lg" ? 30 : 24;

  return (
    <div className="flex items-center gap-2">
      <div className={`${iconSize} relative`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          width={docSize}
          height={docSize}
          aria-hidden="true"
        >
          {/* Document body */}
          <rect x="4" y="2" width="18" height="24" rx="3" className="fill-primary/15 stroke-primary" strokeWidth="1.5" />
          {/* Folded corner */}
          <path d="M16 2v6a2 2 0 002 2h4" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
          {/* Chat bubble overlay */}
          <rect x="12" y="14" width="18" height="14" rx="3" className="fill-primary" />
          <circle cx="18" cy="21" r="1" className="fill-primary-foreground" />
          <circle cx="21" cy="21" r="1" className="fill-primary-foreground" />
          <circle cx="24" cy="21" r="1" className="fill-primary-foreground" />
        </svg>
      </div>
      {showText && (
        <span className={`${textSize} font-semibold tracking-tight`}>
          <span>Doc</span>
          <span className="text-primary">Chat</span>
        </span>
      )}
    </div>
  );
}
