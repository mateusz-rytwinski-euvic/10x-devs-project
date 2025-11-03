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
    }
}
