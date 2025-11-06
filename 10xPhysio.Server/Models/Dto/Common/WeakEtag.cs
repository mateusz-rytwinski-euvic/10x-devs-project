using System.Globalization;

namespace _10xPhysio.Server.Models.Dto.Common
{
    /// <summary>
    /// Utility helpers for building weak ETag strings relied upon by PATCH and PUT endpoints. Each ETag is derived
    /// from timestamp columns (e.g. <c>profiles.updated_at</c> or <c>visits.updated_at</c>) to maintain a stable
    /// optimistic concurrency contract between DTOs and Postgres entities.
    /// </summary>
    public static class WeakEtag
    {
        /// <summary>
        /// Produces a weak ETag (<c>W/"timestamp"</c>) that mirrors the values emitted in the API documentation.
        /// </summary>
        /// <param name="timestamp">Timestamp sourced from the backing database entity.</param>
        /// <returns>A formatted weak ETag string that can be sent in <c>If-Match</c> headers.</returns>
        public static string FromTimestamp(DateTimeOffset timestamp)
        {
            return FormattableString.Invariant($"W/\"{timestamp:O}\"");
        }

        /// <summary>
        /// Attempts to parse a weak ETag (<c>W/"timestamp"</c>) string into a <see cref="DateTimeOffset"/> value.
        /// </summary>
        /// <param name="value">Weak ETag string provided by an <c>If-Match</c> header.</param>
        /// <param name="timestamp">Normalized timestamp output when parsing succeeds.</param>
        /// <returns><c>true</c> when the ETag is well-formed; otherwise <c>false</c>.</returns>
        public static bool TryParse(string? value, out DateTimeOffset timestamp)
        {
            timestamp = default;

            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var trimmed = value.Trim();

            if (!trimmed.StartsWith("W/\"", StringComparison.OrdinalIgnoreCase) || !trimmed.EndsWith('\"'))
            {
                return false;
            }

            var inner = trimmed[3..^1];

            if (!DateTimeOffset.TryParseExact(inner, "O", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
            {
                return false;
            }

            timestamp = parsed.ToUniversalTime();
            return true;
        }
    }
}
