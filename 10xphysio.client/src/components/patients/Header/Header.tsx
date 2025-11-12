import type { InputOnChangeData } from '@fluentui/react-components';
import { Button, SearchBox, tokens } from '@fluentui/react-components';
import { memo, useCallback, useEffect, useState } from 'react';

interface PatientsHeaderProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onAddPatient: () => void;
}

// PatientsHeader renders the search input and the "Add Patient" button for the patients dashboard header.
export const PatientsHeader = memo(({ searchQuery, onSearch, onAddPatient }: PatientsHeaderProps) => {
    const [localQuery, setLocalQuery] = useState<string>(searchQuery);

    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    const handleSearchChange = useCallback(
        (_event: unknown, data: InputOnChangeData) => {
            const value = data.value ?? '';
            setLocalQuery(value);
            onSearch(value);
        },
        [onSearch],
    );

    const handleAddPatient = useCallback(() => {
        onAddPatient();
    }, [onAddPatient]);

    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
                <SearchBox
                    value={localQuery}
                    onChange={handleSearchChange}
                    placeholder="Szukaj pacjenta po imieniu lub nazwisku"
                    aria-label="Wyszukaj pacjenta"
                    size="medium"
                    className="w-full"
                    appearance="outline"
                />
            </div>
            <Button
                appearance="primary"
                size="large"
                style={{ backgroundColor: tokens.colorBrandBackground }}
                onClick={handleAddPatient}
            >
                Dodaj pacjenta
            </Button>
        </header>
    );
});

PatientsHeader.displayName = 'PatientsHeader';