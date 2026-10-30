import { Download } from "lucide-react";
import { useConversion } from "../../stores/conversion.ts";
import { ENGINE_SIZE_LABEL, useEngine } from "../../stores/engine.ts";
import { Button } from "../ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog.tsx";

/** Asks before the first ffmpeg download; stays open to show its progress. */
export function EngineDialog() {
  const gate = useConversion((state) => state.gate);
  const confirmGate = useConversion((state) => state.confirmGate);
  const cancelGate = useConversion((state) => state.cancelGate);
  const { status, pct, error } = useEngine();
  const loading = status === "loading";

  return (
    <Dialog open={gate !== null} onOpenChange={(open) => !open && !loading && cancelGate()}>
      <DialogContent onEscapeKeyDown={(event) => loading && event.preventDefault()}>
        <div className="label flex items-center justify-between border-b border-ink px-6 py-3">
          <span className="font-bold">§ ENGINE REQUIRED</span>
          <span>FFMPEG.WASM · {ENGINE_SIZE_LABEL}</span>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <DialogTitle>ONE-TIME DOWNLOAD.</DialogTitle>
          <DialogDescription>
            Audio and video are converted by ffmpeg compiled to WebAssembly. Your browser downloads it once ({ENGINE_SIZE_LABEL}) from the
            unpkg CDN, then keeps it cached and loads it from disk next time.
          </DialogDescription>
          <p className="label text-ink-mute">YOUR FILES ARE NOT SENT ANYWHERE. CLEAR THE CACHE ANYTIME IN SETTINGS.</p>

          {loading && (
            <div className="flex items-center gap-3" role="status">
              <div className="h-4 flex-1 border-2 border-ink">
                {pct === null ? (
                  <div className="pattern-stripes h-full w-full" />
                ) : (
                  <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                )}
              </div>
              <span className="label font-bold">{pct === null ? "DOWNLOADING" : `DOWNLOADING ${Math.round(pct)}%`}</span>
            </div>
          )}
          {status === "error" && error && (
            <p role="alert" className="selectable label border-2 border-error p-3 font-bold text-error">
              ERROR: {error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 border-t border-ink">
          <Button variant="ghost" className="h-14" disabled={loading} onClick={cancelGate}>
            CANCEL
          </Button>
          <Button variant="signal" className="h-14 hover:translate-x-0 hover:translate-y-0 hover:shadow-none" disabled={loading} onClick={() => void confirmGate()}>
            <Download /> {status === "error" ? "RETRY" : "DOWNLOAD AND CONVERT"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
