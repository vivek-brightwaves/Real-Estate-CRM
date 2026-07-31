"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FeedbackTone = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  title: string;
  message?: string;
  tone: FeedbackTone;
}

interface NotifyOptions {
  title: string;
  message?: string;
  tone?: FeedbackTone;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

interface PromptOptions extends ConfirmOptions {
  initialValue?: string;
  placeholder?: string;
  inputLabel?: string;
}

interface DialogState {
  mode: "confirm" | "prompt";
  options: ConfirmOptions | PromptOptions;
  resolve: (value: boolean | string | null) => void;
}

interface FeedbackContextValue {
  notify: (
    options: NotifyOptions | string,
    tone?: FeedbackTone,
  ) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
  requestText: (options: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<
  FeedbackTone,
  { shell: string; icon: string; symbol: string }
> = {
  success: {
    shell: "border-emerald-200 bg-emerald-50/95",
    icon: "bg-emerald-600 text-white",
    symbol: "\u2713",
  },
  error: {
    shell: "border-rose-200 bg-rose-50/95",
    icon: "bg-rose-600 text-white",
    symbol: "!",
  },
  warning: {
    shell: "border-amber-200 bg-amber-50/95",
    icon: "bg-amber-500 text-white",
    symbol: "!",
  },
  info: {
    shell: "border-blue-200 bg-blue-50/95",
    icon: "bg-blue-600 text-white",
    symbol: "i",
  },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const nextToastId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (options: NotifyOptions | string, tone: FeedbackTone = "success") => {
      const normalized =
        typeof options === "string"
          ? { title: options, tone }
          : { ...options, tone: options.tone ?? tone };
      const id = nextToastId.current++;
      setToasts((current) => [...current.slice(-3), { id, ...normalized }]);
      window.setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast],
  );

  const confirmAction = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPromptValue("");
        setDialog({
          mode: "confirm",
          options,
          resolve: (value) => resolve(Boolean(value)),
        });
      }),
    [],
  );

  const requestText = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setPromptValue(options.initialValue ?? "");
        setDialog({
          mode: "prompt",
          options,
          resolve: (value) =>
            resolve(typeof value === "string" ? value : null),
        });
      }),
    [],
  );

  const closeDialog = useCallback(
    (value: boolean | string | null) => {
      if (!dialog) return;
      dialog.resolve(value);
      setDialog(null);
      setPromptValue("");
    },
    [dialog],
  );

  const value = useMemo(
    () => ({ notify, confirmAction, requestText }),
    [confirmAction, notify, requestText],
  );

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => {
      const text = String(message ?? "").trim();
      const isError = /\b(error|failed|unable|invalid)\b/i.test(text);
      notify({
        title: isError ? "Action could not be completed" : "Action completed",
        message: text || undefined,
        tone: isError ? "error" : "success",
      });
    };
    return () => {
      window.alert = nativeAlert;
    };
  }, [notify]);

  const dialogOptions = dialog?.options;
  const isDanger = dialogOptions?.tone === "danger";

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,390px)] flex-col gap-3"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-header-load ${style.shell}`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black shadow-sm ${style.icon}`}
              >
                {style.symbol}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                {"\u00d7"}
              </button>
            </div>
          );
        })}
      </div>

      {dialog && dialogOptions && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.3)] animate-header-load"
          >
            <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 py-5">
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg ${
                    isDanger
                      ? "bg-gradient-to-br from-rose-500 to-red-600"
                      : "bg-gradient-to-br from-blue-600 to-indigo-600"
                  }`}
                >
                  {isDanger ? "!" : "\u2713"}
                </span>
                <div>
                  <h2
                    id="feedback-dialog-title"
                    className="text-lg font-black text-slate-900"
                  >
                    {dialogOptions.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {dialogOptions.message}
                  </p>
                </div>
              </div>
            </div>

            {dialog.mode === "prompt" && (
              <div className="px-6 pt-5">
                <label className="space-y-2 text-xs font-bold text-slate-600">
                  {(dialogOptions as PromptOptions).inputLabel ?? "Value"}
                  <input
                    autoFocus
                    value={promptValue}
                    onChange={(event) => setPromptValue(event.target.value)}
                    placeholder={(dialogOptions as PromptOptions).placeholder}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && promptValue.trim()) {
                        closeDialog(promptValue.trim());
                      }
                    }}
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 px-6 py-5">
              <button
                type="button"
                onClick={() => closeDialog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                {dialogOptions.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                disabled={
                  dialog.mode === "prompt" && !promptValue.trim()
                }
                onClick={() =>
                  closeDialog(
                    dialog.mode === "prompt"
                      ? promptValue.trim()
                      : true,
                  )
                }
                className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDanger
                    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:shadow-rose-500/25"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25"
                }`}
              >
                {dialogOptions.confirmLabel ??
                  (dialog.mode === "prompt" ? "Continue" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return context;
}
