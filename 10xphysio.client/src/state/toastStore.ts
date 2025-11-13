import { create } from 'zustand';
import type { ToastInput, ToastMessage } from '../types/toast';

interface ToastState {
    toasts: ToastMessage[];
    pushToast: (toast: ToastInput) => ToastMessage | null;
    dismissToast: (toastId: string) => void;
    clearToasts: () => void;
}

/**
 * generateToastId produces a collision-resistant identifier leveraging the Web Crypto API when available.
 */
const generateToastId = (): string => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * normalizeToast sanitizes user-facing text and guarantees an identifier for downstream consumers.
 */
const normalizeToast = (toast: ToastInput): ToastMessage | null => {
    const text = toast.text?.trim();

    if (!text) {
        console.error('Attempted to enqueue a toast without message text. Toast skipped.');
        return null;
    }

    return {
        id: toast.id ?? generateToastId(),
        intent: toast.intent,
        text,
        autoDismissMs: toast.autoDismissMs,
    };
};

/**
 * useToastStore centralizes toast lifecycle management to be reused by hooks and providers.
 */
export const useToastStore = create<ToastState>()((set, get) => ({
    toasts: [],
    /**
     * pushToast adds a toast message to the queue and returns the normalized payload for reference.
     */
    pushToast: (toast) => {
        const normalized = normalizeToast(toast);

        if (!normalized) {
            return null;
        }

        set((state) => ({
            toasts: [...state.toasts, normalized],
        }));

        return normalized;
    },
    /**
     * dismissToast removes a toast from the queue when the user dismisses it or auto-dismiss triggers.
     */
    dismissToast: (toastId) => {
        if (!toastId) {
            console.error('Attempted to dismiss a toast without providing an id.');
            return;
        }

        set((state) => ({
            toasts: state.toasts.filter((toastItem) => toastItem.id !== toastId),
        }));
    },
    /**
     * clearToasts empties the queue, useful when navigating to a new page where stale messages would be confusing.
     */
    clearToasts: () => {
        if (get().toasts.length === 0) {
            return;
        }

        set({ toasts: [] });
    },
}));
