import { useRef, useState } from "react";
import { ArrowDown, ArrowRight, RotateCcw, X } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { FORMAT_SPECS } from "../../lib/format-options.ts";
import { formatBytes, formatLabel, outputName } from "../../lib/format.ts";
import { download, jobNeedsEngine, useConversion } from "../../stores/conversion.ts";
import type { Job } from "../../stores/conversion.ts";
import { useFormatValues, useSettings } from "../../stores/settings.ts";
import { Reveal } from "../motion/Reveal.tsx";
import { Button } from "../ui/button.tsx";

function Progress({ pct }: { pct: number | null }) {
  return (
    <div className="flex w-full items-center gap-3" role="status">
      <div className="h-3 flex-1 border-2 border-ink">
        {pct === null ? (
          <div className="pattern-stripes h-full w-full" />
        ) : (
          <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
        )}
      </div>
      <span className="label font-bold">{pct === null ? "CONVERTING" : `CONVERTING ${Math.round(pct)}%`}</span>
    </div>
  );
}

/** What this row will produce: file name plus the active format options. */
function OutputLine({ job, to }: { job: Job; to: string }) {
  const values = useFormatValues(to);
  const suffix = useSettings((state) => state.nameSuffix);
  const summary = FORMAT_SPECS[to]?.summary(values);
  return (
    <p className="label flex min-w-0 items-center gap-2 text-ink-mute">
      <ArrowRight aria-hidden className="size-3 shrink-0" />
      <span className="selectable truncate">
        <span className="normal-case">{outputName(job.file.name, to, suffix)}</span>
        {summary && ` · ${summary}`}
        {jobNeedsEngine(job) && " · FFMPEG"}
      </span>
    </p>
  );
}

function QueueRow({ job, index }: { job: Job; index: number }) {
  const setTarget = useConversion((state) => state.setTarget);
  const remove = useConversion((state) => state.remove);
  const requestStart = useConversion((state) => state.requestStart);
  const leaving = useConversion((state) => state.leaving.includes(job.id));
  const select = useRef<HTMLSelectElement>(null);
  const [needsFormat, setNeedsFormat] = useState(false);
  const busy = job.status === "converting" || job.status === "queued";
  const supported = job.targets.length > 0;

  const onConvert = () => {
    if (!job.to) {
      setNeedsFormat(true);
      select.current?.focus();
      return;
    }
    void requestStart([job.id]);
  };

  return (
    <li className="collapse-box border-b border-bone-deep last:border-b-0" data-open={!leaving} inert={leaving}>
      {/* Padding lives below the collapsing child so the row can shrink to zero. */}
      <div>
        <Reveal i={index} className={cn("flex flex-col gap-3 px-4 py-4", job.status === "done" && "bg-bone")}>
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4">
              <p className="selectable truncate text-sm font-bold" title={job.file.name}>
                {job.file.name}
              </p>
              <p className="label flex items-center gap-1 text-ink-mute">
                {formatBytes(job.file.size)} · {job.from ? formatLabel(job.from) : "UNKNOWN FORMAT"}
                {job.outputSize !== undefined && (
                  <>
                    <ArrowRight aria-hidden className="size-3" />
                    <span className="sr-only">to</span>
                    {formatBytes(job.outputSize)}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-1 md:col-span-3">
              {supported ? (
                <select
                  ref={select}
                  aria-label={`Output format for ${job.file.name}`}
                  aria-invalid={needsFormat && !job.to}
                  value={job.to ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    setTarget(job.id, event.target.value);
                    setNeedsFormat(false);
                  }}
                  className={cn(
                    "label h-9 w-full border bg-bone px-2 font-bold disabled:opacity-50 md:w-32",
                    needsFormat && !job.to ? "border-2 border-error" : "border-ink",
                  )}
                >
                  <option value="" disabled>
                    FORMAT
                  </option>
                  {job.targets.map((to) => (
                    <option key={to} value={to}>
                      {formatLabel(to)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="label">NO OUTPUT AVAILABLE</span>
              )}
              {needsFormat && !job.to && (
                <span role="alert" className="label font-bold text-error">
                  ERROR: PICK A FORMAT FIRST
                </span>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-2 md:col-span-4 md:justify-end">
              {job.status === "converting" && <Progress pct={job.pct} />}
              {job.status === "queued" && <span className="label">QUEUED</span>}
              {job.status === "error" && supported && (
                <span className="selectable label truncate font-bold text-error" title={job.error}>
                  ERROR: {job.error ?? "FAILED"}
                </span>
              )}
              {job.status === "error" && !supported && <span className="label font-bold text-error">ERROR: UNSUPPORTED FORMAT</span>}
              {job.status === "done" && job.url && job.outputName && (
                <Button variant="signal" size="sm" onClick={() => download(job.url ?? "", job.outputName ?? "")}>
                  <ArrowDown /> DOWNLOAD
                </Button>
              )}
              {(job.status === "ready" || (job.status === "error" && supported)) && (
                <Button variant="signal" size="sm" onClick={onConvert}>
                  {job.status === "error" ? <RotateCcw /> : <ArrowRight />}
                  {job.status === "error" ? "RETRY" : "CONVERT"}
                </Button>
              )}
            </div>

            <div className="flex md:col-span-1 md:justify-end">
              <button
                type="button"
                onClick={() => remove(job.id)}
                disabled={job.status === "converting"}
                aria-label={`Remove ${job.file.name}`}
                className="flex size-9 items-center justify-center border border-ink bg-bone hover:bg-ink hover:text-bone disabled:opacity-30"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {job.to && job.status !== "done" && <OutputLine job={job} to={job.to} />}
        </Reveal>
      </div>
    </li>
  );
}

export function Queue() {
  const jobs = useConversion((state) => state.jobs);

  if (jobs.length === 0) {
    return (
      <div className="border border-ink bg-bone-soft px-4 py-6">
        <p className="label text-ink-mute">§ QUEUE EMPTY. ADD FILES ABOVE.</p>
      </div>
    );
  }

  return (
    <div className="border border-ink bg-bone-soft">
      <p className="label border-b border-ink px-4 py-3 font-bold">
        § QUEUE · {jobs.length} {jobs.length === 1 ? "FILE" : "FILES"}
      </p>
      <ul>
        {jobs.map((job, index) => (
          <QueueRow key={job.id} job={job} index={index} />
        ))}
      </ul>
    </div>
  );
}
