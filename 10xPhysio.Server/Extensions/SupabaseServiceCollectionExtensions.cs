using _10xPhysio.Server.Configuration;
using _10xPhysio.Server.Services.Supabase;

namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Provides extension methods for registering Supabase-related services.
    /// </summary>
    public static class SupabaseServiceCollectionExtensions
    {
        /// <summary>
        /// Registers Supabase options and a reusable client factory for dependency injection.
        /// </summary>
        /// <param name="services">The service collection to mutate.</param>
        /// <param name="configuration">Application configuration root.</param>
        /// <returns>The same <see cref="IServiceCollection"/> instance for chaining.</returns>
        /// <exception cref="ArgumentNullException">Thrown when services or configuration are null.</exception>
        public static IServiceCollection AddSupabaseClient(this IServiceCollection services, IConfiguration configuration)
        {
            ArgumentNullException.ThrowIfNull(services);
            ArgumentNullException.ThrowIfNull(configuration);

            services
                .AddOptions<SupabaseSettings>()
                .Bind(configuration.GetSection(SupabaseSettings.SectionName))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            services.AddSingleton<ISupabaseClientFactory, SupabaseClientFactory>();

            return services;
        }
    }
}
