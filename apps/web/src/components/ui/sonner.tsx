import { AlertTriangle, Check, Info, LoaderCircle, X } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useMessages } from "../../i18n/index.ts";
import { resolveTheme } from "../../lib/theme.ts";
import { useSettings } from "../../stores/settings.ts";

/**
 * sonner, unstyled and redrawn with our tokens: square, hard border, hard
 * shadow. Each type has its own icon shape so state never relies on color;
 * per-type icon fills live in app.css ([data-sonner-toast][data-type]).
 */
export function Toaster() {
  const t = useMessages();
  const theme = useSettings((state) => state.theme);

  return (
    <Sonner
      theme={resolveTheme(theme)}
      position="bottom-right"
      duration={5000}
      gap={12}
      offset={24}
      mobileOffset={16}
      containerAriaLabel={t.toasts.region}
      icons={{
        success: <Check className="size-4" />,
        error: <X className="size-4" />,
        warning: <AlertTriangle className="size-4" />,
        info: <Info className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
        close: <X className="size-3" />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: t.toasts.close,
        classNames: {
          toast:
            "group flex w-full items-start gap-3 border-2 border-ink bg-bone p-4 font-sans text-sm text-ink shadow-hard-md sm:w-96",
          icon: "mt-px flex size-6 shrink-0 items-center justify-center border border-ink",
          content: "flex min-w-0 flex-1 flex-col gap-1",
          title: "label font-bold",
          description: "selectable text-sm leading-snug text-ink-soft",
          actionButton:
            "label ease-press shrink-0 self-center bg-signal px-3 py-2 font-bold text-on-signal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-sm active:translate-x-0 active:translate-y-0 active:shadow-none",
          cancelButton: "label shrink-0 self-center border border-ink px-3 py-2",
          closeButton:
            "absolute -top-2 -right-2 flex size-5 items-center justify-center border border-ink bg-bone hover:bg-ink hover:text-bone",
          error: "border-error",
        },
      }}
    />
  );
}
