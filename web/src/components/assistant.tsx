"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CLIENT_ERRORS, isApplePlatform, isAssistantShortcut, readAssistantReply } from "@/lib/assistant/client";
import { parseMarkdown, type Inline, type List } from "@/lib/assistant/markdown";

// "Ask Braventa", the in-app assistant (D-042): a search-style button in the header (an icon on small screens)
// opens a modal dialog. Native <dialog> + showModal() gives the focus trap, Escape to close and an inert page.
// Shortcut: Cmd+K on Apple devices, Ctrl+K elsewhere. It always needs the modifier (WCAG 2.1.4: no single-character
// shortcuts), and on a Mac Ctrl+K is left alone because text fields use it to delete to the end of the line.
// Answers render through a safe markdown subset as text, never as HTML. The conversation lives in this component
// only (in the browser tab, never stored); the last six turns go with each question.

const MAX_CHARS = 1000;
const HISTORY_MESSAGES = 12;

const SUGGESTIONS = ["Where do I connect Claude?", "What does my growth score mean?", "What should I do first?"];

type Message = { role: "user" | "assistant"; content: string };

// Apple devices use Cmd (Meta) for the shortcut. Read on the client only: the server renders without the hint.
const applePlatform = () => isApplePlatform(navigator);
const noSubscribe = () => () => {};

function openDialog(dialog: HTMLDialogElement | null, input: HTMLTextAreaElement | null) {
  if (dialog && !dialog.open) dialog.showModal();
  requestAnimationFrame(() => input?.focus());
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" />
    </svg>
  );
}

// `text` fits the 15rem bar without truncation; `label` is the fuller name for the icon-only link on small screens.
const UNAVAILABLE = {
  needs_plan: { href: "/plans", text: "Choose a plan to ask", label: "Choose a plan to use the assistant" },
  needs_business: { href: "/onboarding", text: "Analyze a website first", label: "Analyze a website to use the assistant" },
} as const;

// enabled: active trial or a plan. needs_plan: trial over without a plan. needs_business: no business account yet.
export function AssistantLauncher({ state }: { state: "enabled" | keyof typeof UNAVAILABLE }) {
  if (state !== "enabled") {
    const { href, text, label } = UNAVAILABLE[state];
    return (
      <>
        <Link
          href={href}
          className="hidden h-9 w-60 shrink-0 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 text-sm text-muted hover:underline md:flex"
        >
          <SearchIcon />
          <span className="whitespace-nowrap">{text}</span>
        </Link>
        <Link
          href={href}
          aria-label={label}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted md:hidden"
        >
          <SearchIcon />
        </Link>
      </>
    );
  }
  return <Assistant />;
}

function Assistant() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Where the last press started: the dialog closes on a backdrop click only when the press also started there, so
  // a text selection dragged out of the panel doesn't close it.
  const pressOnBackdrop = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apple = useSyncExternalStore<boolean | null>(noSubscribe, applePlatform, () => null);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const counterId = useId();

  const open = () => openDialog(dialogRef.current, inputRef.current);
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const mac = applePlatform();
    const onKey = (e: KeyboardEvent) => {
      if (isAssistantShortcut(e, mac)) {
        e.preventDefault();
        openDialog(dialogRef.current, inputRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    if (q.length > MAX_CHARS) {
      setError(`Keep your question under ${MAX_CHARS.toLocaleString("en-US")} characters.`);
      return;
    }
    setError(null);
    setPending(true);
    const history = messages.slice(-HISTORY_MESSAGES);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuestion("");
    let reply: { answer: string } | { error: string };
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      reply = await readAssistantReply(res);
    } catch (e) {
      // fetch rejects with a TypeError when the network is down; anything else is unexpected.
      reply = { error: e instanceof TypeError ? CLIENT_ERRORS.offline : CLIENT_ERRORS.server };
    }
    if ("answer" in reply) {
      const answer = reply.answer;
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } else {
      setError(reply.error);
      // Keep the question so it can be resent.
      setMessages((m) => m.slice(0, -1));
      setQuestion(q);
    }
    setPending(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clear = () => {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const shortcut = apple === null ? null : apple ? { hint: "⌘K", keys: "Meta+K" } : { hint: "Ctrl K", keys: "Control+K" };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-keyshortcuts={shortcut?.keys}
        className="hidden h-9 w-52 shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-muted transition-colors duration-(--duration-fast) hover:border-border-strong md:flex lg:w-60"
      >
        <SearchIcon />
        <span className="flex-1 truncate">Ask Braventa…</span>
        {shortcut && (
          <kbd aria-hidden="true" className="hidden rounded-sm border border-border px-1.5 text-xs whitespace-nowrap text-muted lg:inline">
            {shortcut.hint}
          </kbd>
        )}
      </button>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Ask Braventa"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted md:hidden"
      >
        <SearchIcon />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        onPointerDown={(e) => {
          pressOnBackdrop.current = e.target === dialogRef.current;
        }}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself, outside the panel) closes it, if the press began there.
          const onBackdrop = pressOnBackdrop.current && e.target === dialogRef.current;
          pressOnBackdrop.current = false;
          if (onBackdrop) close();
        }}
        className="m-auto max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background p-0 text-foreground backdrop:bg-overlay"
      >
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-surface px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold">
              Ask Braventa
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {messages.length > 0 && (
                <button type="button" className="btn-secondary" onClick={clear} disabled={pending}>
                  Clear conversation
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={close}>
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p id={descId} className="text-sm text-muted">
              Ask how Braventa works or about your latest report. The assistant only answers: it can&apos;t make
              changes for you, and it can be wrong, so check important details in your report.
            </p>

            {messages.length === 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Try asking</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          // This list unmounts once the question is added; move focus first so it isn't lost.
                          inputRef.current?.focus();
                          ask(s);
                        }}
                        disabled={pending}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div role="log" aria-live="polite" aria-label="Conversation" className="mt-4 space-y-3">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-soft-foreground">
                    <span className="sr-only">You asked: </span>
                    <p className="whitespace-pre-line">{m.content}</p>
                  </div>
                ) : (
                  <div key={i} className="max-w-[95%] rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <span className="sr-only">Braventa answered: </span>
                    <Answer text={m.content} onNavigate={close} />
                  </div>
                ),
              )}
              {pending && (
                <p className="flex items-center gap-2 text-sm text-muted" role="status">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
                  Writing an answer… This usually takes a few seconds.
                </p>
              )}
            </div>
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-border bg-surface px-5 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            {error && (
              <p className="mb-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <label htmlFor={inputId} className="text-sm font-medium">
              Your question
            </label>
            <div className="mt-1 flex items-end gap-2">
              <textarea
                id={inputId}
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                rows={2}
                maxLength={MAX_CHARS}
                aria-describedby={counterId}
                placeholder="For example: how do I approve my drafts?"
                className="input resize-none"
              />
              <button type="submit" className="btn-primary" disabled={pending || !question.trim()}>
                {pending ? "Asking…" : "Ask"}
              </button>
            </div>
            <p id={counterId} className="mt-1 text-xs text-muted">
              Enter to send, Shift+Enter for a new line. {question.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")} characters.
            </p>
          </form>
        </div>
      </dialog>
    </>
  );
}

function Inlines({ inlines, onNavigate }: { inlines: Inline[]; onNavigate: () => void }) {
  return (
    <>
      {inlines.map((i, k) => {
        switch (i.type) {
          case "strong":
            return (
              <strong key={k}>
                <Inlines inlines={i.inlines} onNavigate={onNavigate} />
              </strong>
            );
          case "code":
            return (
              <code key={k} className="rounded-sm bg-surface-muted px-1">
                {i.text}
              </code>
            );
          case "link":
            return i.external ? (
              <a key={k} href={i.href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                {i.text}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link key={k} href={i.href} onClick={onNavigate} className="text-accent underline">
                {i.text}
              </Link>
            );
          default:
            return <span key={k}>{i.text}</span>;
        }
      })}
    </>
  );
}

function AnswerList({ list, onNavigate, nested = false }: { list: List; onNavigate: () => void; nested?: boolean }) {
  const items = list.items.map((item, j) => (
    <li key={j}>
      <Inlines inlines={item.inlines} onNavigate={onNavigate} />
      {item.sub && <AnswerList list={item.sub} onNavigate={onNavigate} nested />}
    </li>
  ));
  const spacing = nested ? "mt-1 space-y-1 pl-5" : "space-y-1 pl-5";
  return list.type === "ol" ? (
    <ol start={list.start} className={`list-decimal ${spacing}`}>
      {items}
    </ol>
  ) : (
    <ul className={`list-disc ${spacing}`}>{items}</ul>
  );
}

function Answer({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      {parseMarkdown(text).map((b, k) =>
        b.type === "p" ? (
          <p key={k}>
            <Inlines inlines={b.inlines} onNavigate={onNavigate} />
          </p>
        ) : (
          <AnswerList key={k} list={b} onNavigate={onNavigate} />
        ),
      )}
    </div>
  );
}
