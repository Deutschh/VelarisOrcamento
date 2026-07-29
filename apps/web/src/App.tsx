import { APP_DEFAULTS } from "@velaris/shared";
import { Link, Route, Routes } from "react-router-dom";

function HomePage() {
  return (
    <main className="min-h-screen bg-velaris-black text-velaris-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.24em] text-white/50">
          Sprint 1 - fundação técnica
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight md:text-7xl">
          {APP_DEFAULTS.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
          Web app responsivo em preparação. Esta tela existe apenas para validar a
          fundação React, Vite, Tailwind, Router e contratos compartilhados.
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex rounded-full bg-velaris-white px-6 py-3 font-medium text-velaris-black"
            to="/health"
          >
            Ver estado da fundação
          </Link>
        </div>
      </section>
    </main>
  );
}

function HealthPage() {
  return (
    <main className="min-h-screen bg-velaris-black px-6 py-16 text-velaris-white">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <h1 className="text-3xl font-semibold">Fundação ativa</h1>
        <p className="mt-4 text-white/70">
          Frontend preparado para consumir a API pelo backend. Nenhuma conexão direta com
          Neon existe no web.
        </p>
        <Link className="mt-6 inline-flex text-white underline" to="/">
          Voltar
        </Link>
      </section>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<HealthPage />} path="/health" />
    </Routes>
  );
}
