import { useEffect, type RefObject } from 'react';

/** Keeps a scroll container pinned to its bottom while `enabled` and `dep` changes (AI live edit typing). */
export function useFollowScroll(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  dep: unknown,
) {
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const frame = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ref, enabled, dep]);
}
