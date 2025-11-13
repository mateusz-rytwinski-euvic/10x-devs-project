import { useMemo } from 'react';
import { useToastStore } from '../state/toastStore';
import type { ToastInput, ToastMessage } from '../types/toast';

interface UseToastResult {
    toasts: ToastMessage[];
    pushToast: (toast: ToastInput) => ToastMessage | null;
    dismissToast: (toastId: string) => void;
    clearToasts: () => void;
}

/**
 * useToast exposes the toast store to components, memoizing callbacks to avoid needless re-renders downstream.
 * The hook purposefully surfaces the queue for providers while keeping mutation helpers close to UI call sites.
 */
export const useToast = (): UseToastResult => {
    const toasts = useToastStore((state) => state.toasts);
    const pushToast = useToastStore((state) => state.pushToast);
    const dismissToast = useToastStore((state) => state.dismissToast);
    const clearToasts = useToastStore((state) => state.clearToasts);

    return useMemo(
        () => ({
            toasts,
            pushToast,
            dismissToast,
            clearToasts,
        }),
        [clearToasts, dismissToast, pushToast, toasts],
    );
};
