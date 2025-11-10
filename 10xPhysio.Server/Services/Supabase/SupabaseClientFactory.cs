using _10xPhysio.Server.Configuration;
using _10xPhysio.Server.Exceptions;

using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

using Supabase;

namespace _10xPhysio.Server.Services.Supabase
{
    /// <summary>
    /// Produces Supabase client instances scoped to the current HTTP request so that each authenticated call
    /// maintains its own access token for row-level security enforcement.
    /// </summary>
    public sealed class SupabaseClientFactory : ISupabaseClientFactory
    {
        private readonly SupabaseSettings settings;
        private readonly IHttpContextAccessor httpContextAccessor;
        private readonly ILogger<SupabaseClientFactory> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SupabaseClientFactory"/> class.
        /// </summary>
        /// <param name="settingsAccessor">Provides access to the validated Supabase configuration.</param>
        /// <param name="httpContextAccessor">Resolves the current HTTP context to capture bearer tokens.</param>
        /// <param name="logger">Logs failures during client creation.</param>
        public SupabaseClientFactory(
            IOptions<SupabaseSettings> settingsAccessor,
            IHttpContextAccessor httpContextAccessor,
            ILogger<SupabaseClientFactory> logger)
        {
            ArgumentNullException.ThrowIfNull(settingsAccessor);
            ArgumentNullException.ThrowIfNull(httpContextAccessor);
            ArgumentNullException.ThrowIfNull(logger);

            settings = settingsAccessor.Value;
            this.httpContextAccessor = httpContextAccessor;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<Client> GetClientAsync(CancellationToken cancellationToken = default)
        {
            var clientOptions = new SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = false,
            };

            // The Supabase C# client is provided by the Supabase community SDK. We intentionally create a fresh
            // instance per request so that tokens are not shared between concurrent users, which would violate RLS.
            var client = new Client(settings.Url, settings.AnonKey, clientOptions);

            try
            {
                await client.InitializeAsync().ConfigureAwait(false);
            }
            catch (Exception initializeException)
            {
                logger.LogError(initializeException, "Failed to initialize Supabase client.");
                throw;
            }

            BindAccessToken(client);
            return client;
        }

        private void BindAccessToken(Client client)
        {
            var httpContext = httpContextAccessor.HttpContext;
            var isAuthenticated = httpContext?.User?.Identity?.IsAuthenticated == true;
            var accessToken = ExtractBearerToken(httpContext);

            if (isAuthenticated && string.IsNullOrWhiteSpace(accessToken))
            {
                logger.LogWarning("Authenticated request missing bearer token for {Path}.", httpContext?.Request.Path);
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }

            if (string.IsNullOrWhiteSpace(accessToken))
            {
                return;
            }

            try
            {
                var postgrestOptions = client.Postgrest.Options;
                if (postgrestOptions is null)
                {
                    logger.LogWarning("Supabase PostgREST options not initialized when binding token for {Path}.", httpContext?.Request.Path);
                    throw new ApiException(StatusCodes.Status502BadGateway, "postgrest_unavailable");
                }

                var headers = postgrestOptions.Headers ?? new Dictionary<string, string>(StringComparer.Ordinal);
                headers[HeaderNames.Authorization] = $"Bearer {accessToken}";
                postgrestOptions.Headers = headers;
            }
            catch (Exception sessionException)
            {
                logger.LogWarning(
                    sessionException,
                    "Supabase session binding failed for token hash {TokenHash}.",
                    HashToken(accessToken));

                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token", sessionException);
            }
        }

        private static string? ExtractBearerToken(HttpContext? httpContext)
        {
            if (httpContext?.Request?.Headers is null)
            {
                return null;
            }

            if (!httpContext.Request.Headers.TryGetValue(HeaderNames.Authorization, out var headerValues))
            {
                return null;
            }

            var headerValue = headerValues.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));

            if (string.IsNullOrWhiteSpace(headerValue) || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var token = headerValue["Bearer ".Length..].Trim();
            return string.IsNullOrWhiteSpace(token) ? null : token;
        }

        private static string HashToken(string token)
        {
            var length = Math.Min(token.Length, 8);
            return token[..length];
        }
    }
}
