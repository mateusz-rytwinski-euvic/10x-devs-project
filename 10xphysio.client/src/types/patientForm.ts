/**
 * PatientFormData captures the controlled fields for patient create/edit flows.
 */
export interface PatientFormData {
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
}

/**
 * PatientFormErrors aggregates validation feedback for the patient form.
 */
export interface PatientFormErrors {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    general?: string;
}

/**
 * PatientFormViewModel defines the contract exposed by usePatientFormViewModel.
 */
export interface PatientFormViewModel {
    formData: PatientFormData;
    formErrors: PatientFormErrors;
    isEditMode: boolean;
    isLoading: boolean;
    isSaving: boolean;
    error: Error | null;
    etag: string | null;
    patientId: string | null;
    setFormField: <TKey extends keyof PatientFormData>(field: TKey, value: PatientFormData[TKey]) => void;
    handleSavePatient: () => Promise<void>;
    handleDeletePatient: (() => Promise<void>) | null;
    resetErrors: () => void;
}
