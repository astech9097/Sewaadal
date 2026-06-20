"use client";

export type LoadingStep =
  | "location"
  | "upload"
  | "submit"
  | "done"
  | "generic";

const stepLabels: Record<LoadingStep, string> = {
  location: "Verifying your GPS location…",
  upload: "Uploading live selfie…",
  submit: "Submitting attendance…",
  done: "Success!",
  generic: "Please wait…",
};

const stepOrder: LoadingStep[] = ["location", "upload", "submit", "done"];

export default function LoadingOverlay({
  active,
  step = "generic",
  title = "Processing",
}: {
  active: boolean;
  step?: LoadingStep;
  title?: string;
}) {
  if (!active) return null;

  const currentIndex = stepOrder.indexOf(step);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-busy="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/30">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-500" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-600">
              S
            </div>
          </div>
        </div>

        <h2 className="text-center text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          {stepLabels[step]}
        </p>

        <ul className="mt-6 space-y-2">
          {(["location", "upload", "submit"] as LoadingStep[]).map(
            (s, i) => {
              const done = currentIndex > i;
              const current = step === s;
              return (
                <li
                  key={s}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    current
                      ? "bg-brand-50 text-brand-800 font-medium"
                      : done
                        ? "text-emerald-700"
                        : "text-slate-400",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      done
                        ? "bg-emerald-500 text-white"
                        : current
                          ? "bg-brand-500 text-white animate-pulse"
                          : "bg-slate-200 text-slate-500",
                    ].join(" ")}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {stepLabels[s].replace("…", "")}
                </li>
              );
            }
          )}
        </ul>

        <p className="mt-6 text-center text-xs text-slate-400">
          Do not close this page
        </p>
      </div>
    </div>
  );
}
