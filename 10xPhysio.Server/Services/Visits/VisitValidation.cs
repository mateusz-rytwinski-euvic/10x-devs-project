using _10xPhysio.Server.Exceptions;

using Microsoft.AspNetCore.Http;

using System.Text.RegularExpressions;

namespace _10xPhysio.Server.Services.Visits
{
    /// <summary>
    /// Provides reusable normalization and guard clause helpers for visit-centric workflows. Centralizing validation
    /// logic keeps controllers thin and guarantees that services enforce a consistent business contract.
    /// </summary>
    internal static class VisitValidation
    {
        internal const int MaximumContentLength = 10_000;
        internal const int FutureVisitWindowDays = 30;

        internal const string OrderAscending = "asc";
        internal const string OrderDescending = "desc";

        private static readonly Regex CollapsibleWhitespace = new("[ \t\f\v]{2,}", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        /// <summary>
        /// Normalizes a visit date, defaulting to the supplied <paramref name="utcNow"/> when the value is missing and
        /// ensuring requests cannot schedule visits more than thirty days into the future.
        /// </summary>
        /// <param name="visitDate">Raw visit date supplied by the client (optional).</param>
        /// <param name="utcNow">Clock value used to enforce future constraints.</param>
        /// <returns>Normalized UTC visit date.</returns>
        /// <exception cref="ApiException">Thrown when the visit date exceeds the allowed future window.</exception>
        public static DateTimeOffset NormalizeVisitDate(DateTimeOffset? visitDate, DateTimeOffset utcNow)
        {
            var normalized = (visitDate ?? utcNow).ToUniversalTime();
            var latestAllowed = utcNow.ToUniversalTime().AddDays(FutureVisitWindowDays);

            if (normalized > latestAllowed)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "visit_date_future");
            }

            return normalized;
        }

        /// <summary>
        /// Normalizes optional long-form visit content by trimming and collapsing redundant whitespace. Empty strings
        /// are converted to <c>null</c> so that callers can clear persisted values.
        /// </summary>
        /// <param name="value">Raw string value provided by the client.</param>
        /// <param name="fieldCode">Field code used when emitting error messages.</param>
        /// <returns>Normalized string or <c>null</c> when the payload is empty.</returns>
        /// <exception cref="ApiException">Thrown when the content exceeds the maximum supported length.</exception>
        public static string? NormalizeOptionalContent(string? value, string fieldCode)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();
            var collapsed = CollapsibleWhitespace.Replace(trimmed, " ");

            if (collapsed.Length > MaximumContentLength)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, $"{fieldCode}_too_long");
            }

            return collapsed;
        }

        /// <summary>
        /// Normalizes required recommendation content, enforcing minimum and maximum length bounds.
        /// </summary>
        /// <param name="value">Raw recommendations payload.</param>
        /// <returns>Normalized recommendation string.</returns>
        /// <exception cref="ApiException">Thrown when the payload is missing or exceeds length constraints.</exception>
        public static string NormalizeRequiredRecommendation(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "recommendations_required");
            }

            var normalized = NormalizeOptionalContent(value, "recommendations");

            if (string.IsNullOrEmpty(normalized))
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "recommendations_required");
            }

            return normalized;
        }

        /// <summary>
        /// Ensures that at least one visit narrative field contains content so that empty visits are not persisted.
        /// </summary>
        /// <param name="interview">Normalized interview content.</param>
        /// <param name="description">Normalized description content.</param>
        /// <param name="recommendations">Normalized recommendations content.</param>
        /// <exception cref="ApiException">Thrown when all supplied values are empty.</exception>
        public static void EnsureAnyContentProvided(string? interview, string? description, string? recommendations)
        {
            if (!string.IsNullOrEmpty(interview) || !string.IsNullOrEmpty(description) || !string.IsNullOrEmpty(recommendations))
            {
                return;
            }

            throw new ApiException(StatusCodes.Status422UnprocessableEntity, "visit_content_required");
        }

        /// <summary>
        /// Normalizes pagination and date filter values emitted by the list endpoint, enforcing API defaults.
        /// </summary>
        /// <param name="page">Requested page number (1-based).</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="from">Optional lower bound filter.</param>
        /// <param name="to">Optional upper bound filter.</param>
        /// <param name="includeRecommendations">Optional flag controlling whether recommendations are returned.</param>
        /// <param name="order">Requested ordering token.</param>
        /// <returns>Normalized query options.</returns>
        /// <exception cref="ApiException">Thrown when pagination or date filters are invalid.</exception>
        public static (
            int Page,
            int PageSize,
            DateTimeOffset? From,
            DateTimeOffset? To,
            bool IncludeRecommendations,
            string Order) NormalizeListOptions(
            int page,
            int pageSize,
            DateTimeOffset? from,
            DateTimeOffset? to,
            bool includeRecommendations,
            string order)
        {
            var normalizedPage = page;

            if (normalizedPage < 1)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_pagination");
            }

            var normalizedPageSize = pageSize;

            if (normalizedPageSize is < 1 or > 100)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_pagination");
            }

            var normalizedFrom = from?.ToUniversalTime();
            var normalizedTo = to?.ToUniversalTime();

            if (normalizedFrom.HasValue && normalizedTo.HasValue && normalizedTo.Value < normalizedFrom.Value)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_date_range");
            }

            var normalizedIncludeRecommendations = includeRecommendations;

            var normalizedOrder = string.IsNullOrWhiteSpace(order)
                ? OrderDescending
                : order.Trim().ToLowerInvariant();

            if (normalizedOrder is not OrderAscending and not OrderDescending)
            {
                normalizedOrder = OrderDescending;
            }

            return (normalizedPage, normalizedPageSize, normalizedFrom, normalizedTo, normalizedIncludeRecommendations, normalizedOrder);
        }

        /// <summary>
        /// Validates the optional source generation identifier, ensuring it is only supplied when AI metadata is
        /// enabled.
        /// </summary>
        /// <param name="sourceGenerationId">Optional AI generation identifier.</param>
        /// <param name="aiGenerated">Flag indicating whether the recommendations originate from AI.</param>
        /// <exception cref="ApiException">Thrown when the identifier is missing or supplied without AI context.</exception>
        public static void ValidateSourceGeneration(Guid? sourceGenerationId, bool aiGenerated)
        {
            if (aiGenerated && sourceGenerationId is null)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "source_generation_required");
            }

            if (!aiGenerated && sourceGenerationId is not null)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "source_generation_not_allowed");
            }
        }
    }
}
