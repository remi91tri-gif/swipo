import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { STATUS, avatarTone, initials } from "@/lib/format";
import { PasswordInput } from "@/components/password-input";
import type { JobStatus } from "@/lib/types";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// --- Boutons -----------------------------------------------------------------
type Variant = "primary" | "strong" | "secondary" | "ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-azur text-on-azur shadow-card hover:bg-azur-strong",
  strong: "bg-ink text-on-ink hover:opacity-90",
  secondary: "bg-surface-raised text-ink border border-line-strong hover:bg-hairline",
  ghost: "text-ink-muted hover:text-ink hover:bg-hairline",
};
const BTN = "inline-flex items-center justify-center gap-2 h-11 px-[18px] rounded-md font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BTN, VARIANT[variant], className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BTN, VARIANT[variant], className)} {...props} />;
}

// --- Cartes ------------------------------------------------------------------
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("bg-surface-raised border border-line rounded-xl shadow-card", className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[18px] leading-[26px] font-semibold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

// --- En-tête de page ---------------------------------------------------------
export function PageHeader({ eyebrow, title, lead, action }: { eyebrow?: string; title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <p className="text-[12px] font-semibold tracking-[0.18em] text-soleil uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[34px] leading-[40px] font-normal tracking-[-0.02em] sm:text-[48px] sm:leading-[54px]">{title}</h1>
        {lead && <p className="text-base text-ink-muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

// --- Pastilles de statut -----------------------------------------------------
const TONE: Record<(typeof STATUS)[JobStatus]["tone"], string> = {
  neutral: "bg-neutral-soft text-ink-muted",
  outline: "bg-surface text-ink-muted border border-line-strong",
  azur: "bg-info-soft text-info",
  critique: "bg-critique-soft text-critique",
  reprise: "bg-reprise-soft text-reprise",
  valide: "bg-valide-soft text-valide",
  soleil: "bg-soleil-soft text-soleil-ink",
};

export function StatusPill({ status }: { status: JobStatus }) {
  const s = STATUS[status];
  return <span className={cx("inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-[13px] leading-[18px] font-semibold", TONE[s.tone])}>{s.label}</span>;
}

// --- Avatars -----------------------------------------------------------------
const AVATAR = { azur: "bg-info-soft text-info", valide: "bg-valide-soft text-valide", reprise: "bg-reprise-soft text-reprise" };

export function Avatar({
  id,
  firstName,
  lastName,
  avatarUrl,
  size = 36,
  ring = false,
}: {
  id: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string | null;
  size?: number;
  ring?: boolean;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className={cx("inline-block flex-none rounded-full bg-hairline object-cover", ring && "border-2 border-surface-raised")}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size <= 30 ? 12 : 13 }}
      className={cx("inline-flex flex-none items-center justify-center rounded-full font-semibold", AVATAR[avatarTone(id)], ring && "border-2 border-surface-raised")}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

export function AvatarStack({ people }: { people: { id: string; firstName: string; lastName: string; avatarUrl?: string | null }[] }) {
  if (people.length === 0) {
    return <span aria-label="Aucun agent affecté" className="inline-block size-[30px] rounded-full border-[1.5px] border-dashed border-line-strong" />;
  }
  return (
    <span className="flex" aria-label={people.map((p) => p.firstName).join(", ")}>
      {people.map((p, i) => (
        <span key={p.id} className={i ? "-ml-2" : undefined}>
          <Avatar {...p} size={30} ring />
        </span>
      ))}
    </span>
  );
}

// --- Formulaires -------------------------------------------------------------
export function Field({ label, hint, error, id, className, ...props }: ComponentProps<"input"> & { label: string; hint?: string; error?: string; id: string }) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm text-ink-muted">
        {label}
      </label>
      {props.type === "password" ? (
        <PasswordInput
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className="h-12 rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink placeholder:text-ink-muted/70 aria-[invalid]:border-critique"
          {...props}
        />
      ) : (
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className="h-12 rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink placeholder:text-ink-muted/70 aria-[invalid]:border-critique"
          {...props}
        />
      )}
      {(error || hint) && (
        <p id={`${id}-help`} className={cx("text-[13px] leading-[18px]", error ? "text-critique" : "text-ink-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-critique-soft px-4 py-3 text-sm font-semibold text-critique">
      {message}
    </p>
  );
}

// --- Logo ----------------------------------------------------------------------
export function Logo({ height = 28 }: { height?: number }) {
  const width = Math.round((height * 194) / 64);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/swipo-logo.svg?v=maison" alt="Swipo" width={width} height={height} className="only-light block" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/swipo-logo-blanc.svg?v=maison" alt="Swipo" width={width} height={height} className="only-dark block" />
    </>
  );
}
