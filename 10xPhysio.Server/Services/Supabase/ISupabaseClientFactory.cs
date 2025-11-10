using Supabase;

namespace _10xPhysio.Server.Services.Supabase
{
    /// <summary>
    /// Exposes a minimal abstraction around the Supabase client for dependency injection.
    /// </summary>
    public interface ISupabaseClientFactory
    {
        /// <summary>
        /// Retrieves an initialized Supabase <see cref="Client"/> instance.
        /// </summary>
        /// <param name="cancellationToken">Token used to cancel the initialization request.</param>
        /// <returns>An initialized Supabase client scoped to the current request.</returns>
        Task<Client> GetClientAsync(CancellationToken cancellationToken = default);
    }
}
