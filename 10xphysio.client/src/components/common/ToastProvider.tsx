import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { memo, useMemo } from 'react';
import { useToast } from '../../hooks/useToast';

/**
 * ToastProvider renders the global toast queue in a fixed-position layer so that notifications stay anchored to the viewport
 * without leaving the FluentProvider subtree. Keeping the toasts inside the provider ensures Fluent UI tokens and intent
 * styling remain intact when we display MessageBar notifications.
 */
export const ToastProvider = memo(() => {
    const { toasts, dismissToast } = useToast();

    const content = useMemo(() => {
        if (toasts.length === 0) {
            return null;
        }

        return (
            <div className="pointer-events-auto flex w-full max-w-xl flex-col gap-2">
                {toasts.map((toast) => (
                    <MessageBar key={toast.id} intent={toast.intent} shape="rounded" className="shadow-lg">
                        <MessageBarBody className="flex items-center justify-between gap-3 text-sm">
                            <span>{toast.text}</span>
                            <Button
                                appearance="outline"
                                size="small"
                                onClick={() => dismissToast(toast.id)}
                            >
                                Zamknij
                            </Button>
                        </MessageBarBody>
                    </MessageBar>
                ))}
            </div>
        );
    }, [dismissToast, toasts]);

    if (!content) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[1050] flex justify-center px-4">
            {content}
        </div>
    );
});

ToastProvider.displayName = 'ToastProvider';
