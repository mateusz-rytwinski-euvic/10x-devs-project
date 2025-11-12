import { Button, Text } from '@fluentui/react-components';
import { ArrowLeft16Filled, ArrowRight16Filled } from '@fluentui/react-icons';
import { memo, useCallback, useMemo } from 'react';

interface PatientsPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

// PatientsPagination surfaces previous/next controls and current paging metadata.
export const PatientsPagination = memo(({ currentPage, totalPages, onPageChange }: PatientsPaginationProps) => {
    const canGoPrevious = currentPage > 1;
    const canGoNext = totalPages > 0 && currentPage < totalPages;

    const gotoPrevious = useCallback(() => {
        if (!canGoPrevious) {
            return;
        }

        onPageChange(currentPage - 1);
    }, [canGoPrevious, currentPage, onPageChange]);

    const gotoNext = useCallback(() => {
        if (!canGoNext) {
            return;
        }

        onPageChange(currentPage + 1);
    }, [canGoNext, currentPage, onPageChange]);

    const summary = useMemo(() => {
        if (totalPages === 0) {
            return 'Brak wyników';
        }

        return `Strona ${currentPage} z ${totalPages}`;
    }, [currentPage, totalPages]);

    if (totalPages <= 1) {
        return (
            <div className="flex justify-end" aria-label="Informacja o paginacji pacjentów">
                <Text className="text-sm text-slate-600">{summary}</Text>
            </div>
        );
    }

    return (
        <nav className="flex flex-col items-center justify-between gap-4 sm:flex-row" aria-label="Paginacja listy pacjentów">
            <Text className="text-sm text-slate-600">{summary}</Text>
            <div className="flex items-center gap-2">
                <Button
                    onClick={gotoPrevious}
                    appearance="subtle"
                    icon={<ArrowLeft16Filled />}
                    disabled={!canGoPrevious}
                >
                    Poprzednia
                </Button>
                <Button
                    onClick={gotoNext}
                    appearance="subtle"
                    icon={<ArrowRight16Filled />}
                    iconPosition="after"
                    disabled={!canGoNext}
                >
                    Następna
                </Button>
            </div>
        </nav>
    );
});

PatientsPagination.displayName = 'PatientsPagination';