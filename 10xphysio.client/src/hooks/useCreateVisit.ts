import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createVisit, VisitsEndpointError } from '../services/visitService';
import type { VisitCreateCommand, VisitViewModel } from '../types/visit';
import { isValidGuid } from '../utils/guid';
import { useAuth } from './useAuth';
import { mapVisitDtoToViewModel } from './useVisitDetails';

interface UseCreateVisitOptions {
    patientId: string;
    onSuccess?: (visit: VisitViewModel) => void;
    onError?: (error: VisitsEndpointError | Error) => void;
}

interface UseCreateVisitResult {
    createVisit: (command: VisitCreateCommand) => Promise<VisitViewModel>;
    isCreating: boolean;
    error?: VisitsEndpointError | Error | null;
    reset: () => void;
}

/**
 * useCreateVisit exposes a mutation helper that posts new visits to the backend.
 */
export const useCreateVisit = ({ patientId, onSuccess, onError }: UseCreateVisitOptions): UseCreateVisitResult => {
    const { session } = useAuth();
    const token = session?.accessToken ?? null;
    const hasValidPatientId = isValidGuid(patientId);

    const mutation = useMutation({
        mutationFn: async (command: VisitCreateCommand) => {
            if (!hasValidPatientId) {
                throw new VisitsEndpointError('Nieprawidłowy identyfikator pacjenta.', 400);
            }

            if (!token) {
                throw new VisitsEndpointError('Brak tokenu autoryzacyjnego.', 401);
            }

            return createVisit(patientId, command, token);
        },
        onSuccess: (dto) => {
            const viewModel = mapVisitDtoToViewModel(dto);
            onSuccess?.(viewModel);
        },
        onError: (error) => {
            if (error instanceof Error) {
                onError?.(error);
            }
        },
    });

    return useMemo(
        () => ({
            createVisit: async (command: VisitCreateCommand) => {
                const dto = await mutation.mutateAsync(command);
                return mapVisitDtoToViewModel(dto);
            },
            isCreating: mutation.isPending,
            error: (mutation.error as VisitsEndpointError | Error | null) ?? null,
            reset: mutation.reset,
        }),
        [mutation],
    );
};
