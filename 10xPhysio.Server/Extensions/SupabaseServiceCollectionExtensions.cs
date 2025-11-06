using _10xPhysio.Server.Configuration;
using _10xPhysio.Server.Services.Supabase;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using System.Text;

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

        /// <summary>
        /// Configures JWT Bearer authentication for Supabase.
        /// </summary>
        /// <param name="services">The service collection to mutate.</param>
        /// <param name="configuration">Application configuration root.</param>
        /// <returns>The same <see cref="IServiceCollection"/> instance for chaining.</returns>
        /// <exception cref="ArgumentNullException">Thrown when services or configuration are null.</exception>
        /// <exception cref="InvalidOperationException">Thrown when Supabase configuration is missing or invalid.</exception>
        public static IServiceCollection AddSupabaseAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            ArgumentNullException.ThrowIfNull(services);
            ArgumentNullException.ThrowIfNull(configuration);

            var supabaseSection = configuration.GetSection(SupabaseSettings.SectionName);
            var supabaseSettings = supabaseSection.Get<SupabaseSettings>() ?? throw new InvalidOperationException("Supabase configuration is missing.");

            var issuer = supabaseSettings.Url.TrimEnd('/') + "/auth/v1";
            var jwtSecretBytes = Encoding.UTF8.GetBytes(supabaseSettings.JwtSecret);

            if (jwtSecretBytes.Length == 0)
            {
                throw new InvalidOperationException("Supabase JWT secret is missing or empty.");
            }

            services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = issuer,
                        ValidateAudience = true,
                        ValidAudience = "authenticated",
                        ValidateIssuerSigningKey = true,
                        // Supabase access tokens are signed with the project's JWT secret, not the anon key.
                        IssuerSigningKey = new SymmetricSecurityKey(jwtSecretBytes),
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(1)
                    };

                    // Log signature or validation failures to aid in diagnosing invalid token issues during development.
                    options.Events = new JwtBearerEvents
                    {
                        OnAuthenticationFailed = context =>
                        {
                            var logger = context.HttpContext.RequestServices.GetService<ILogger<Program>>();
                            logger?.LogWarning(context.Exception, "JWT authentication failed for {Path}", context.Request.Path);

                            return Task.CompletedTask;
                        }
                    };
                });

            return services;
        }
    }
}
