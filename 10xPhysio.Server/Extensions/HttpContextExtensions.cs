namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Provides helpers for managing correlation identifiers across the request pipeline.
    /// </summary>
    public static class HttpContextExtensions
    {
        private const string CorrelationIdHeader = "X-Correlation-Id";
        private const string CorrelationItemKey = "__CorrelationId";

        /// <summary>
        /// Retrieves the correlation identifier associated with the current HTTP context, creating and caching a value
        /// when none was supplied by the caller. The identifier is also echoed back to callers through the response
        /// header to support client-side tracing.
        /// </summary>
        /// <param name="context">Active HTTP context.</param>
        /// <returns>Correlation identifier string.</returns>
        public static string GetOrCreateCorrelationId(this HttpContext context)
        {
            ArgumentNullException.ThrowIfNull(context);

            if (context.Items.TryGetValue(CorrelationItemKey, out var cached) && cached is string cachedCorrelationId)
            {
                EnsureResponseHeader(context, cachedCorrelationId);
                return cachedCorrelationId;
            }

            var correlationId = ResolveCorrelationId(context);
            context.Items[CorrelationItemKey] = correlationId;
            EnsureResponseHeader(context, correlationId);
            return correlationId;
        }

        private static string ResolveCorrelationId(HttpContext context)
        {
            if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var headerValues))
            {
                var candidate = headerValues.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));

                if (!string.IsNullOrWhiteSpace(candidate) && candidate.Length <= 128)
                {
                    return candidate.Trim();
                }
            }

            return Guid.NewGuid().ToString("N");
        }

        private static void EnsureResponseHeader(HttpContext context, string correlationId)
        {
            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.Headers[CorrelationIdHeader] = correlationId;
        }
    }
}
