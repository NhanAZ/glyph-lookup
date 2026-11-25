import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconName = "copy" | "check" | "search" | "share" | "arrow" | "spark";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const shared = {
    "aria-hidden": true as const,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "copy":
      return (
        <svg {...shared}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
      );
    case "check":
      return (
        <svg {...shared}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.3 4.3" />
        </svg>
      );
    case "share":
      return (
        <svg {...shared}>
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...shared}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...shared}>
          <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
          <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
        </svg>
      );
  }
}

type ButtonVariant = "primary" | "secondary" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
}

export function Button({
  variant = "secondary",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = ["button", "button-" + variant, className].filter(Boolean).join(" ");
  return (
    <button className={classes} {...props}>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
}

export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly SegmentOption<Value>[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          className="segment"
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({
  label,
  copied,
  onClick,
  className,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={["copy-button", className].filter(Boolean).join(" ")}
      type="button"
      aria-label={copied ? label + " copied" : "Copy " + label}
      onClick={onClick}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function Surface({
  children,
  className,
  as: Component = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  return <Component className={["surface", className].filter(Boolean).join(" ")}>{children}</Component>;
}
