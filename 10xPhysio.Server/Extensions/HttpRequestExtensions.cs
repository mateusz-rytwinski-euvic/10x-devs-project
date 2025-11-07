using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Dto.Common;

using System.Security.Claims;

namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Provides reusable helpers for extracting authentication and concurrency headers from HTTP requests. Centralizing
    /// this logic keeps controllers lean and guarantees consistent error responses across endpoints.
    /// </summary>
    public static class HttpRequestExtensions
    {
        /// <summary>
        /// Resolves the authenticated therapist identifier from the supplied <see cref="ClaimsPrincipal"/>.
        /// </summary>
        /// <param name="user">Authenticated principal sourced from the HTTP context.</param>
        /// <returns>Therapist identifier represented as a <see cref="Guid"/>.</returns>
        /// <exception cref="ApiException">Thrown when the token is missing or malformed.</exception>
        public static Guid GetRequiredTherapistId(this ClaimsPrincipal user)
        {
            ArgumentNullException.ThrowIfNull(user);

            var userIdValue = user.FindFirstValue("sub")
                ?? user.FindFirstValue("user_id")
                ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var therapistId))
            {
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }

            return therapistId;
        }

        /// <summary>
        /// Extracts the first <c>If-Match</c> header value present on the request, trimming whitespace and validating
        /// the header contract required for conditional updates.
        /// </summary>
        /// <param name="request">HTTP request containing headers.</param>
        /// <returns>Normalized weak ETag string.</returns>
        /// <exception cref="ApiException">Thrown when the header is missing or empty.</exception>
        public static string GetRequiredIfMatch(this HttpRequest request)
        {
            ArgumentNullException.ThrowIfNull(request);

            if (!request.Headers.TryGetValue("If-Match", out var headerValues))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            var rawValue = headerValues.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));

            if (string.IsNullOrWhiteSpace(rawValue))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            var candidate = rawValue.Split(',')[0].Trim();

            if (string.IsNullOrWhiteSpace(candidate))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            return candidate;
        }

        /// <summary>
        /// Extracts and parses the <c>If-Match</c> header into a <see cref="DateTimeOffset"/> timestamp for weak ETag
        /// comparisons used by services.
        /// </summary>
        /// <param name="request">HTTP request containing headers.</param>
        /// <returns>Parsed timestamp sourced from the weak ETag.</returns>
        /// <exception cref="ApiException">Thrown when the header is missing or malformed.</exception>
        public static DateTimeOffset GetRequiredIfMatchTimestamp(this HttpRequest request)
        {
            var ifMatch = GetRequiredIfMatch(request);

            try
            {
                return WeakEtag.Parse(ifMatch);
            }
            catch (FormatException)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_if_match");
            }
        }
    }
}
