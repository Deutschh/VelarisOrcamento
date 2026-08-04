import { forwardRef, useMemo } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { errorMessage } from "../lib/api.js";
import { formatDate } from "../lib/formatters.js";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] bg-[linear-gradient(180deg,#101217_0%,#0b0b0d_42%,#11120f_100%)] text-white antialiased">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#111216]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link className="text-lg font-semibold tracking-wide text-white" to="/">
            Velaris Orcamentos
          </Link>
          <nav className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-white/10 bg-white/[0.03] p-1 text-sm text-white/72 sm:border-0 sm:bg-transparent sm:p-0">
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/empresas">
              Buscar
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/recuperar">
              Recuperar
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/cliente">
              Cliente
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/cadastro">
              Cadastro
            </Link>
            <Link
              className="rounded-md px-3 py-2 hover:bg-white/10"
              to="/cadastro/empresa"
            >
              Empresa
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/login">
              Login
            </Link>
            <Link className="rounded-md px-3 py-2 hover:bg-white/10" to="/admin">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
    </div>
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
  }
>(({ className = "", label, ...props }, ref) => (
  <label className={`block text-sm text-white/70 ${className}`}>
    {label}
    <input
      className="mt-2 h-11 w-full rounded-md border border-white/15 bg-[#15171d] px-3 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/15"
      ref={ref}
      {...props}
    />
  </label>
));
TextField.displayName = "TextField";

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
  }
>(({ className = "", label, ...props }, ref) => (
  <label className={`block text-sm text-white/70 ${className}`}>
    {label}
    <textarea
      className="mt-2 w-full rounded-md border border-white/15 bg-[#15171d] px-3 py-3 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/15"
      ref={ref}
      {...props}
    />
  </label>
));
TextAreaField.displayName = "TextAreaField";

export function PrimaryLink({
  children,
  icon: Icon,
  to,
}: {
  children: ReactNode;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 py-3 font-medium text-[#111216] shadow-sm shadow-emerald-950/20 transition hover:bg-emerald-200"
      to={to}
    >
      <Icon size={18} />
      {children}
    </Link>
  );
}

export function SecondaryLink({
  children,
  icon: Icon,
  to,
}: {
  children: ReactNode;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-medium text-white/85 transition hover:bg-white/10"
      to={to}
    >
      <Icon size={18} />
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  icon: Icon,
  isLoading,
}: {
  children: ReactNode;
  icon: LucideIcon;
  isLoading: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-5 py-2 font-medium text-[#111216] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-70"
      disabled={isLoading}
      type="submit"
    >
      <Icon size={18} />
      {isLoading ? "Aguarde" : children}
    </button>
  );
}

export function ActionButton({
  children,
  disabled,
  icon: Icon,
  isLoading,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: LucideIcon;
  isLoading: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary" | "warning";
}) {
  const className = useMemo(() => {
    if (variant === "warning") {
      return "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15";
    }

    if (variant === "secondary") {
      return "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10";
    }

    return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15";
  }, [variant]);

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      disabled={disabled || isLoading}
      type="button"
      onClick={onClick}
    >
      <Icon size={18} />
      {isLoading ? "Processando" : children}
    </button>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#12141a] p-4 shadow-sm shadow-black/10">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="mt-2 break-words text-sm text-white/85">{value}</div>
    </div>
  );
}

export function Timeline({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ id: string; title: string; detail: string; date: string }>;
}) {
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-white/50">{empty}</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li className="border-l border-white/15 pl-4" key={item.id}>
          <div className="text-sm font-medium text-white/90">{item.title}</div>
          <div className="mt-1 text-xs text-white/45">
            {item.detail} - {formatDate(item.date)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LoadingLine() {
  return <p className="mt-6 text-sm text-white/55">Carregando...</p>;
}

export function ErrorPanel({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="mt-6 rounded-md border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
      {errorMessage(error, fallback)}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <p className="mt-3 text-sm text-rose-200">{message}</p> : null;
}
