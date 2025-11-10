using _10xPhysio.Server.Configuration;

using Microsoft.Extensions.Options;

using System.Net.Http.Headers;

namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Provides extension methods for registering HTTP clients used by the application.
    /// </summary>
    public static class HttpClientServiceCollectionExtensions
    {
        /// <summary>
        /// Registers the named OpenRouter <see cref="HttpClient"/> with authentication and default headers.
        /// </summary>
        /// <param name="services">The service collection to mutate.</param>
        /// <returns>The same <see cref="IServiceCollection"/> instance for chaining.</returns>
        /// <exception cref="ArgumentNullException">Thrown when the service collection is null.</exception>
        /// <exception cref="InvalidOperationException">Thrown when essential OpenRouter configuration is missing.</exception>
        public static IServiceCollection AddOpenRouterHttpClient(this IServiceCollection services)
        {
            ArgumentNullException.ThrowIfNull(services);

            services.AddHttpClient("OpenRouter", (serviceProvider, client) =>
            {
                var options = serviceProvider
                    .GetRequiredService<IOptions<AiGenerationOptions>>()
                    .Value;

                if (string.IsNullOrWhiteSpace(options.ApiBaseUrl))
                {
                    throw new InvalidOperationException("OpenRouter API base URL is missing.");
                }

                if (string.IsNullOrWhiteSpace(options.ApiKey))
                {
                    throw new InvalidOperationException("OpenRouter API key is missing.");
                }

                if (options.ProviderTimeoutSeconds <= 0)
                {
                    throw new InvalidOperationException("OpenRouter provider timeout must be greater than zero.");
                }

                var baseUri = new Uri(options.ApiBaseUrl, UriKind.Absolute);
                client.BaseAddress = baseUri;
                client.Timeout = TimeSpan.FromSeconds(options.ProviderTimeoutSeconds);

                client.DefaultRequestHeaders.Accept.Clear();
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

                // The Referer header is optional but improves provider-side analytics when supplied.
                if (!string.IsNullOrWhiteSpace(options.Referer) && Uri.TryCreate(options.Referer, UriKind.Absolute, out var refererUri))
                {
                    client.DefaultRequestHeaders.Referrer = refererUri;
                }
            });

            return services;
        }
    }
}
