using _10xPhysio.Server.Configuration;

using Microsoft.Extensions.Options;

using Supabase;

namespace _10xPhysio.Server.Services.Supabase
{
    /// <summary>
    /// Creates and caches a Supabase client instance that can be injected into higher-level services.
    /// </summary>
    public sealed class SupabaseClientFactory : ISupabaseClientFactory, IDisposable
    {
        private readonly SupabaseSettings settings;
        private readonly ILogger<SupabaseClientFactory> logger;
        private readonly SemaphoreSlim initializationLock = new(1, 1);

        private Client? cachedClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="SupabaseClientFactory"/> class.
        /// </summary>
        /// <param name="settingsAccessor">Provides access to the validated Supabase configuration.</param>
        /// <param name="logger">Logs failures during client creation.</param>
        public SupabaseClientFactory(IOptions<SupabaseSettings> settingsAccessor, ILogger<SupabaseClientFactory> logger)
        {
            ArgumentNullException.ThrowIfNull(settingsAccessor);
            ArgumentNullException.ThrowIfNull(logger);

            settings = settingsAccessor.Value;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<Client> GetClientAsync(CancellationToken cancellationToken = default)
        {
            if (cachedClient != null)
            {
                return cachedClient;
            }

            await initializationLock.WaitAsync(cancellationToken).ConfigureAwait(false);

            try
            {
                if (cachedClient != null)
                {
                    return cachedClient;
                }

                var clientOptions = new SupabaseOptions
                {
                    AutoRefreshToken = true,
                    AutoConnectRealtime = false,
                };

                // The Supabase C# client is provided by the Supabase community SDK.
                // We configure it once and reuse it across requests via dependency injection.
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

                cachedClient = client;
                return cachedClient;
            }
            finally
            {
                initializationLock.Release();
            }
        }
        /// <summary>
        /// Releases resources used by the factory.
        /// </summary>
        public void Dispose()
        {
            initializationLock.Dispose();
        }
    }
}
