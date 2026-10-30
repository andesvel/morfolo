import { toast } from "sonner";
import { getMessages } from "../i18n/index.ts";

/**
 * App notifications, worded in the current locale. Callable from stores and
 * event handlers; the Toaster mounted in App renders them.
 */
export const notify = {
  converted(done: number, failed: number, onZip?: () => void) {
    const n = getMessages().toasts;
    toast.success(n.converted(done), {
      description: failed > 0 ? n.someFailed(failed) : undefined,
      action: onZip && done > 1 ? { label: n.zipAction, onClick: onZip } : undefined,
    });
  },
  failed(name: string, message: string) {
    toast.error(getMessages().toasts.failed(name), { description: message, duration: 8000 });
  },
  unsupported(names: readonly string[]) {
    const n = getMessages().toasts;
    toast.warning(n.unsupported(names.length), { description: names.join(", ") });
  },
  engineReady() {
    toast.success(getMessages().toasts.engineReady);
  },
  engineFailed(message: string) {
    toast.error(getMessages().toasts.engineFailed, { description: message });
  },
  cacheCleared() {
    toast.info(getMessages().toasts.cacheCleared);
  },
  queueCleared(count: number) {
    toast.info(getMessages().toasts.queueCleared(count));
  },
  preferencesReset() {
    toast.info(getMessages().toasts.preferencesReset);
  },
  /** Loading toast that resolves to the zip result. */
  zip<T>(work: Promise<T>, count: number) {
    const n = getMessages().toasts;
    toast.promise(work, {
      loading: n.zipping(count),
      success: () => n.zipReady(count),
      error: (caught: unknown) => ({
        message: n.zipFailed,
        description: caught instanceof Error ? caught.message : undefined,
      }),
    });
  },
};
