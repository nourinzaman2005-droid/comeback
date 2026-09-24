import { useId } from "react";

export function BrandLogo({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  const titleId = useId();
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title id={titleId}>{title}</title>}
      <rect width="64" height="64" rx="18" fill="#6f315f" />
      <path
        d="M45 18.5A19 19 0 1 0 45 45.5"
        fill="none"
        stroke="#fffaf8"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="45" cy="32" r="7.5" fill="#efaaa8" />
      <path
        d="M43.2 25.2c-1.1 2-1.7 4.2-1.7 6.8s.6 4.8 1.7 6.8M46.8 25.2c1.1 2 1.7 4.2 1.7 6.8s-.6 4.8-1.7 6.8"
        fill="none"
        stroke="#6f315f"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}
