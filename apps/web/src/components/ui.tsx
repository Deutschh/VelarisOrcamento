import { forwardRef, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import {
  Asterisk,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../lib/api.js";
import { formatDate } from "../lib/formatters.js";
import { useSession } from "../lib/session.js";

type ThemeMode = "dark" | "light";

const themeStorageKey = "velaris:theme";

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(themeStorageKey);

  return stored === "light" ? "light" : "dark";
}

function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  const isLight = theme === "light";
  const Icon = isLight ? Moon : Sun;

  return (
    <button
      className="group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-2xl transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
      type="button"
      onClick={onToggle}
    >
      <Icon className="h-4 w-4 transition group-hover:scale-105" />
      <span className="hidden sm:inline">{isLight ? "Modo escuro" : "Modo claro"}</span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  async function logout() {
    await session.logout();
    navigate("/");
  }

  const role = session.status === "authenticated" ? session.user?.role : null;
  const homePath =
    role === "admin"
      ? "/admin"
      : role === "company"
        ? "/app"
        : role === "customer"
          ? "/servicos"
          : "/";
  const navItems =
    role === "admin"
      ? [{ label: "Admin", to: "/admin" }]
      : role === "company"
        ? [{ label: "Área da empresa", to: "/app" }]
        : role === "customer"
          ? [
              { label: "Encontrar empresas", to: "/servicos" },
              { label: "Acompanhar pedido", to: "/recuperar" },
              { label: "Área do cliente", to: "/cliente" },
            ]
          : [
              { label: "Encontrar empresas", to: "/servicos" },
              { label: "Acompanhar pedido", to: "/recuperar" },
            ];

  const userName = session.user?.name?.trim();
  const mobileButtonIcon = mobileMenuOpen ? X : Menu;
  const MobileButtonIcon = mobileButtonIcon;

  function renderNavLinks(className = "") {
    return (
      <nav
        className={`flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-sm text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-2xl ${className}`}
      >
        {navItems.map((item) => (
          <Link
            className="whitespace-nowrap rounded-full px-4 py-2 transition hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-text-primary)] antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--color-accent-soft),transparent_32%),radial-gradient(circle_at_86%_78%,var(--color-accent-soft),transparent_34%)] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:92px_92px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
        <div className="absolute left-[12%] top-[18%] h-[320px] w-[320px] rounded-full bg-[var(--color-accent-soft)] blur-[120px]" />
        <div className="absolute bottom-[8%] right-[8%] h-[360px] w-[360px] rounded-full bg-[var(--color-accent-soft)] blur-[140px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-app-bg)]/78 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link className="group flex min-w-0 items-center gap-3" to={homePath}>
            <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold tracking-[-0.08em] text-[var(--color-text-primary)] shadow-[var(--shadow-soft)]">
              VS
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-2xl font-normal tracking-[0.22em] text-[var(--color-text-primary)]">
                VELARIS
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-text-muted)]">
                Orçamentos
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            {renderNavLinks()}
            {role ? (
              <>
                <span className="inline-flex min-h-11 max-w-[210px] shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
                  <UserCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{userName || "Perfil"}</span>
                </span>
                <button
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] transition hover:border-rose-300/30 hover:bg-rose-300/10 hover:text-rose-200"
                  type="button"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <Link
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:scale-[1.015]"
                to="/login"
              >
                Entrar
              </Link>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu"
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              <MobileButtonIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[var(--color-border)] px-4 pb-4 sm:px-6 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 pt-4">
              {renderNavLinks("flex-col rounded-3xl p-2")}
              {role ? (
                <>
                  <div className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">
                    <UserCircle className="h-4 w-4" />
                    <span className="truncate">{userName || "Perfil"}</span>
                  </div>
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-rose-300/30 hover:bg-rose-300/10 hover:text-rose-200"
                    type="button"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)]"
                  to="/login"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </p>
      <h1 className="mt-4 max-w-3xl font-serif text-4xl font-normal leading-[0.95] tracking-[-0.055em] text-[var(--color-text-primary)] sm:text-5xl">
        {title}
      </h1>
    </div>
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    requiredMarker?: boolean;
  }
>(({ className = "", label, requiredMarker, ...props }, ref) => (
  <label
    className={`block text-sm font-medium text-[var(--color-text-secondary)] ${className}`}
  >
    <RequiredLabel isRequired={requiredMarker || Boolean(props.required)}>
      {label}
    </RequiredLabel>
    <input
      className="mt-2 h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:bg-[var(--color-surface-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
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
    requiredMarker?: boolean;
  }
>(({ className = "", label, requiredMarker, ...props }, ref) => (
  <label
    className={`block text-sm font-medium text-[var(--color-text-secondary)] ${className}`}
  >
    <RequiredLabel isRequired={requiredMarker || Boolean(props.required)}>
      {label}
    </RequiredLabel>
    <textarea
      className="mt-2 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-strong)] focus:bg-[var(--color-surface-strong)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
      ref={ref}
      {...props}
    />
  </label>
));
TextAreaField.displayName = "TextAreaField";

export function RequiredLabel({
  children,
  isRequired,
}: {
  children: ReactNode;
  isRequired?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{children}</span>
      {isRequired ? (
        <span
          aria-label="Campo obrigatório"
          className="grid h-4 w-4 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverted)]"
          title="Campo obrigatório"
        >
          <Asterisk className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </span>
  );
}

export function RequiredFieldsLegend() {
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)]">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverted)]">
        <Asterisk className="h-2.5 w-2.5" />
      </span>
      Campos marcados são obrigatórios.
    </p>
  );
}

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
      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
      to={to}
    >
      <Icon className="h-[18px] w-[18px]" />
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
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
      to={to}
    >
      <Icon className="h-[18px] w-[18px]" />
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
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
      disabled={isLoading}
      type="submit"
    >
      <Icon className="h-[18px] w-[18px]" />
      {isLoading ? "Só um instante..." : children}
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
      return "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]";
    }

    return "border-[var(--color-border)] bg-[var(--color-accent)] text-[var(--color-text-inverted)] shadow-[var(--shadow-glow)] hover:-translate-y-0.5";
  }, [variant]);

  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      disabled={disabled || isLoading}
      type="button"
      onClick={onClick}
    >
      <Icon className="h-[18px] w-[18px]" />
      {isLoading ? "Processando..." : children}
    </button>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-3 break-words text-sm font-medium leading-6 text-[var(--color-text-primary)]">
        {value}
      </div>
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
    return (
      <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{empty}</p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li className="relative border-l border-[var(--color-border)] pl-5" key={item.id}>
          <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] shadow-[var(--shadow-glow)]" />
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {item.title}
          </div>
          <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
            {item.detail} — {formatDate(item.date)}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LoadingLine() {
  return (
    <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
      Carregando informações...
    </div>
  );
}

export function ErrorPanel({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-rose-400/25 bg-rose-400/10 p-5 text-sm leading-6 text-rose-100">
      {errorMessage(error, fallback)}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
      {message}
    </p>
  ) : null;
}
