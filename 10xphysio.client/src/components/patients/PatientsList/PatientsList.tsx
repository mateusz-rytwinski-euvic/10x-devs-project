import {
    Button,
    Skeleton,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
} from '@fluentui/react-components';
import { ArrowSortFilled } from '@fluentui/react-icons';
import { memo, useCallback } from 'react';
import type { SortState } from '../../../hooks/usePatientsViewModel';
import type { PatientListItem, PatientSortField } from '../../../types/patient';

interface PatientsListProps {
    items: PatientListItem[];
    isLoading: boolean;
    isFetching: boolean;
    sort: SortState;
    onSort: (field: PatientSortField) => void;
    onItemClick: (patientId: string) => void;
}

const renderSortIcon = (isActive: boolean, direction: SortState['order']) => {
    if (!isActive) {
        return null;
    }

    return <ArrowSortFilled className="ml-1 text-sm" style={{ transform: direction === 'desc' ? 'rotate(180deg)' : 'none' }} />;
};

const LoadingState = () => (
    <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded-lg" appearance="translucent" />
        ))}
    </div>
);

const EmptyState = () => (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
        <Text weight="semibold" className="text-lg text-slate-800">
            Brak pacjentów
        </Text>
        <br />
        <Text className="mt-2 text-slate-600">Kliknij "Dodaj pacjenta", aby rozpocząć.</Text>
    </div>
);

// PatientsList renders the patients table with sortable headers and row navigation handlers.
export const PatientsList = memo(
    ({ items, isLoading, isFetching, sort, onSort, onItemClick }: PatientsListProps) => {
        const handleSort = useCallback(
            (field: PatientSortField) => {
                onSort(field);
            },
            [onSort],
        );

        const handleRowClick = useCallback(
            (id: string) => {
                onItemClick(id);
            },
            [onItemClick],
        );

        if (isLoading) {
            return <LoadingState />;
        }

        if (items.length === 0) {
            return <EmptyState />;
        }

        return (
            <div
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                role="region"
                aria-live="polite"
                aria-label="Lista pacjentów"
            >
                <Table role="grid" aria-busy={isFetching}>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell aria-sort={sort.field === 'lastName' ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Button
                                    appearance="transparent"
                                    onClick={() => handleSort('lastName')}
                                    className="flex items-center text-left text-slate-700 hover:text-slate-900"
                                >
                                    Pacjent
                                    {renderSortIcon(sort.field === 'lastName', sort.order)}
                                </Button>
                            </TableHeaderCell>
                            <TableHeaderCell aria-sort={sort.field === 'latestVisitDate' ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Button
                                    appearance="transparent"
                                    onClick={() => handleSort('latestVisitDate')}
                                    className="flex items-center text-left text-slate-700 hover:text-slate-900"
                                >
                                    Ostatnia wizyta
                                    {renderSortIcon(sort.field === 'latestVisitDate', sort.order)}
                                </Button>
                            </TableHeaderCell>
                            <TableHeaderCell aria-sort={sort.field === 'createdAt' ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Button
                                    appearance="transparent"
                                    onClick={() => handleSort('createdAt')}
                                    className="flex items-center text-left text-slate-700 hover:text-slate-900"
                                >
                                    Dodano
                                    {renderSortIcon(sort.field === 'createdAt', sort.order)}
                                </Button>
                            </TableHeaderCell>
                            <TableHeaderCell>
                                <Text weight="semibold" className="text-slate-700">
                                    Wizyty
                                </Text>
                            </TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow
                                key={item.id}
                                className="cursor-pointer transition-colors hover:bg-slate-50"
                                onClick={() => handleRowClick(item.id)}
                            >
                                <TableCell>
                                    <Text weight="semibold" className="text-slate-800">
                                        {item.firstName} {item.lastName}
                                    </Text>
                                </TableCell>
                                <TableCell>
                                    <Text className="text-slate-600">{item.lastVisitDate}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text className="text-slate-600">{item.createdAtLabel}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text className="text-slate-600">{item.visitsCount}</Text>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {isFetching ? (
                    <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                        <Spinner size="small" label="Odświeżanie danych" labelPosition="after" />
                    </div>
                ) : null}
            </div>
        );
    },
);

PatientsList.displayName = 'PatientsList';