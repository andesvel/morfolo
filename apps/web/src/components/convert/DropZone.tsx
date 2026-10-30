import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { useMessages } from "../../i18n/index.ts";
import { ACCEPT } from "../../lib/format.ts";

type DropZoneProps = {
  onFiles: (files: File[]) => void;
  compact?: boolean;
};

const CORNERS = [
  "top-0 left-0 border-t-4 border-l-4",
  "top-0 right-0 border-t-4 border-r-4",
  "bottom-0 left-0 border-b-4 border-l-4",
  "bottom-0 right-0 border-b-4 border-r-4",
];

export function DropZone({ onFiles, compact = false }: DropZoneProps) {
  const t = useMessages();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const files = [...event.dataTransfer.files];
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "pattern-hazard relative border border-ink",
        over && "shadow-hard-signal",
      )}
    >
      {CORNERS.map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn("absolute size-6", over ? "border-signal" : "border-ink", corner)}
        />
      ))}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "ease-size flex w-full cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center",
          // Fixed heights, so wrapped text never stretches the zone.
          compact ? "h-48" : "h-64 md:h-72",
        )}
      >
        {/* Text and icon sit on the zone's own fill so they cut the stripes, like .cut on the page grid. */}
        <span className="bg-bone-soft p-1">
          <Crosshair aria-hidden className="size-8" strokeWidth={1.5} />
        </span>
        <span className={cn("display ease-size", compact ? "display-md" : "display-md md:display-lg")}>
          <span className="cut bg-bone-soft">{over ? t.dropzone.over : t.dropzone.idle}</span>
        </span>
        <span className="label">
          <span className="cut bg-bone-soft">{t.dropzone.hint}</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
