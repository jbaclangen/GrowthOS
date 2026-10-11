"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// The full report section for an infographic tile, in a modal dialog. Native <dialog> gives focus trapping and
// the inert background. Every way of closing (button, Escape, backdrop) removes ?view= from the URL directly,
// rather than relying on the dialog's async "close" event.
export function ReportDialog({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => {
    ref.current?.close();
    router.replace(pathname, { scroll: false });
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="report-dialog-title"
      onCancel={(e) => {
        // Escape: close through the same path so the URL updates.
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === ref.current) close();
      }}
      className="m-auto max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background p-0 text-foreground backdrop:bg-overlay"
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3">
          <h2 id="report-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" className="btn-secondary" onClick={close}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
