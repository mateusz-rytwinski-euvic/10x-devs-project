/**
 * isValidGuid verifies whether the provided value is a well-formed GUID (version 1-5).
 */
export const isValidGuid = (value: string | undefined): boolean => {
    if (!value) {
        return false;
    }

    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
};
