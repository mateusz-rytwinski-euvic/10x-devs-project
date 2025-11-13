/**
 * Allowed intents for toast notifications surfaced across the client.
 */
export type ToastIntent = 'success' | 'warning' | 'error' | 'info';

/**
 * ToastMessage standardizes payload metadata enqueued in the global toast store.
 */
export interface ToastMessage {
    id: string;
    intent: ToastIntent;
    text: string;
    /**
     * Optional hint describing whether the toast should dismiss itself.
     * In future steps this will unlock auto-dismiss behaviours without rewiring call sites.
     */
    autoDismissMs?: number;
}

/**
 * ToastInput accepts the data required to create a toast while keeping the id optional for callers.
 */
export type ToastInput = Omit<ToastMessage, 'id'> & { id?: string };
