import type { QuoteDraftFileSummary } from "@velaris/shared";
import { FileText, Image, X } from "lucide-react";
import { useEffect, useState } from "react";

import { apiUrl } from "../lib/api.js";

export function QuoteRequestFilesGallery({
  files,
  getFilePath,
  onDelete,
}: {
  files: QuoteDraftFileSummary[];
  getFilePath: (file: QuoteDraftFileSummary) => string;
  onDelete?: ((file: QuoteDraftFileSummary) => void) | undefined;
}) {
  const [selected, setSelected] = useState<QuoteDraftFileSummary | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {files.map((file) =>
          file.mimeType.startsWith("image/") ? (
            <StoredImage
              file={file}
              filePath={getFilePath(file)}
              key={file.id}
              onOpen={() => setSelected(file)}
              onDelete={onDelete ? () => onDelete(file) : undefined}
            />
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm"
              key={file.id}
            >
              <FileText size={20} />
              <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
            </div>
          ),
        )}
      </div>

      {selected ? (
        <div
          aria-label="Visualização da imagem"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-5"
          role="dialog"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <button
            aria-label="Fechar imagem"
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            type="button"
            onClick={() => setSelected(null)}
          >
            <X size={23} />
          </button>
          <img
            alt={selected.fileName}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            src={apiUrl(getFilePath(selected))}
          />
        </div>
      ) : null}
    </>
  );
}

function StoredImage({
  file,
  filePath,
  onOpen,
  onDelete,
}: {
  file: QuoteDraftFileSummary;
  filePath: string;
  onOpen: () => void;
  onDelete?: (() => void) | undefined;
}) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(apiUrl(filePath), { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load image.");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => setSource(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <button
        className="group relative block aspect-[4/3] w-full bg-black/10"
        type="button"
        onClick={onOpen}
      >
        {source ? (
          <img alt={file.fileName} className="h-full w-full object-cover" src={source} />
        ) : (
          <span className="grid h-full place-items-center text-[var(--color-text-muted)]">
            <Image size={26} />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
          Ver em tela cheia
        </span>
      </button>
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
        {onDelete ? (
          <button className="text-rose-300" type="button" onClick={onDelete}>
            Excluir
          </button>
        ) : null}
      </div>
    </div>
  );
}
