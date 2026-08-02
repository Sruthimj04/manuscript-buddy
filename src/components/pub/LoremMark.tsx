import { cn } from "@/lib/utils";

/** Geometric flower / mandala brand mark for LOREM. Monochrome, inherits currentColor. */
export function LoremMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <circle cx="24" cy="24" r="4.5" />
      {[0, 45, 90, 135, 225, 180, 270, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 24 24)`}>
          <path d="M24 19.5 C29 13.5 29 8 24 3 C19 8 19 13.5 24 19.5 Z" />
        </g>
      ))}
    </svg>
  );
}
