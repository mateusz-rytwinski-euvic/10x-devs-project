using _10xPhysio.Server.Exceptions;

using System.Text.RegularExpressions;

namespace _10xPhysio.Server.Services.Patients
{
    /// <summary>
    /// Provides reusable normalization and validation helpers for patient inputs ensuring consistency across
    /// controller and service layers.
    /// </summary>
    internal static class PatientValidation
    {
        internal const string SortLastName = "lastName";
        internal const string SortCreatedAt = "createdAt";
        internal const string SortLatestVisitDate = "latestVisitDate";

        internal const string OrderAscending = "asc";
        internal const string OrderDescending = "desc";

        private static readonly Regex AllowedNameCharacters = new("^[\\p{L}\\- ]+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        /// <summary>
        /// Normalizes and validates a patient name segment, enforcing length and character rules.
        /// </summary>
        /// <param name="value">Raw input value.</param>
        /// <param name="fieldCode">Field code emitted in error messages (e.g. <c>first_name</c>).</param>
        /// <returns>Normalized name string.</returns>
        public static string NormalizeName(string value, string fieldCode)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_required");
            }

            var trimmed = value.Trim();
            var collapsed = Regex.Replace(trimmed, "\\s+", " ");

            if (collapsed.Length > 100)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_too_long");
            }

            if (!AllowedNameCharacters.IsMatch(collapsed))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_invalid");
            }

            return collapsed;
        }

        /// <summary>
        /// Normalizes and validates the optional date of birth avoiding future dates.
        /// </summary>
        /// <param name="value">Optional DateOnly supplied by the client.</param>
        /// <returns>Corresponding UTC <see cref="DateTime"/> or <c>null</c>.</returns>
        public static DateTime? NormalizeDateOfBirth(DateOnly? value)
        {
            if (value is null)
            {
                return null;
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            if (value > today)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "date_of_birth_future");
            }

            return value.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        }

        /// <summary>
        /// Normalizes the sort parameter, defaulting to last name when unspecified or unsupported.
        /// </summary>
        /// <param name="sort">Sort field provided by the client.</param>
        /// <returns>Normalized sort token.</returns>
        public static string NormalizeSort(string sort)
        {
            var candidate = string.IsNullOrWhiteSpace(sort) ? SortLastName : sort.Trim();

            return candidate switch
            {
                SortCreatedAt => SortCreatedAt,
                SortLatestVisitDate => SortLatestVisitDate,
                _ => SortLastName
            };
        }

        /// <summary>
        /// Normalizes the order parameter, enforcing API defaults per sort field.
        /// </summary>
        /// <param name="order">Order token provided by the client.</param>
        /// <param name="sort">Normalized sort field.</param>
        /// <returns>Normalized order token.</returns>
        public static string NormalizeOrder(string order, string sort)
        {
            if (string.IsNullOrWhiteSpace(order))
            {
                return sort == SortLastName ? OrderAscending : OrderDescending;
            }

            var normalized = order.Trim().ToLowerInvariant();

            return normalized is OrderAscending or OrderDescending
                ? normalized
                : (sort == SortLastName ? OrderAscending : OrderDescending);
        }

        /// <summary>
        /// Normalizes the optional search parameter, enforcing length bounds.
        /// </summary>
        /// <param name="search">Raw search term.</param>
        /// <returns>Normalized search token or <c>null</c>.</returns>
        public static string? NormalizeSearch(string? search)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                return null;
            }

            var trimmed = Regex.Replace(search.Trim(), "\\s+", " ");

            if (trimmed.Length > 100)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "search_too_long");
            }

            return trimmed;
        }
    }
}