const POLISH_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
};

const POLISH_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
};

const POLISH_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    ...POLISH_DATE_OPTIONS,
    ...POLISH_TIME_OPTIONS,
};

const formatSafe = (value: string | null | undefined, fallback: string, options: Intl.DateTimeFormatOptions): string => {
    if (!value) {
        return fallback;
    }

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return fallback;
        }

        return new Intl.DateTimeFormat('pl-PL', options).format(date);
    } catch (error) {
        console.error('Failed to format date value.', { value, error });
        return fallback;
    }
};

/**
 * formatPolishDate returns a human-friendly date (DD.MM.YYYY) or a fallback string when parsing fails.
 */
export const formatPolishDate = (value: string | null | undefined, fallback: string): string => {
    return formatSafe(value, fallback, POLISH_DATE_OPTIONS);
};

/**
 * formatPolishDateTime returns a human-friendly date/time string or a fallback when parsing fails.
 */
export const formatPolishDateTime = (value: string | null | undefined, fallback: string): string => {
    return formatSafe(value, fallback, POLISH_DATE_TIME_OPTIONS);
};

/**
 * formatPolishTime returns HH:MM or the fallback when parsing fails.
 */
export const formatPolishTime = (value: string | null | undefined, fallback: string): string => {
    return formatSafe(value, fallback, POLISH_TIME_OPTIONS);
};
