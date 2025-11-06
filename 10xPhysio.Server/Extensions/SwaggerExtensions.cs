using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;

namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Extension methods for configuring Swagger/OpenAPI documentation.
    /// </summary>
    public static class SwaggerExtensions
    {
        /// <summary>
        /// Adds Swagger generation with JWT Bearer authentication support.
        /// </summary>
        /// <param name="services">The service collection.</param>
        /// <param name="title">The API title.</param>
        /// <param name="version">The API version.</param>
        /// <param name="description">The API description.</param>
        /// <returns>The service collection for chaining.</returns>
        public static IServiceCollection AddSwaggerWithJwtAuth(
            this IServiceCollection services,
            string title = "API",
            string version = "v1",
            string description = "API Documentation")
        {
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc(version, new OpenApiInfo
                {
                    Title = title,
                    Version = version,
                    Description = description
                });

                var bearerScheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Description = "Enter the access token. Example: `eyJ0eXAiO...`",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = JwtBearerDefaults.AuthenticationScheme,
                    BearerFormat = "JWT",
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = JwtBearerDefaults.AuthenticationScheme
                    }
                };

                // Enables Swagger UI to send JWT tokens through the Authorization header when calling secured endpoints.
                options.AddSecurityDefinition(bearerScheme.Reference.Id, bearerScheme);
                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    { bearerScheme, Array.Empty<string>() }
                });
            });

            return services;
        }
    }
}