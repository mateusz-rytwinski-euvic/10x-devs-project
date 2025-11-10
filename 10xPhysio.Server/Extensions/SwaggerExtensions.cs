using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi.Models;

using Swashbuckle.AspNetCore.SwaggerGen;

namespace _10xPhysio.Server.Extensions
{
    /// <summary>
    /// Operation filter to add If-Match header parameter for specific endpoints.
    /// </summary>
    public class IfMatchOperationFilter : IOperationFilter
    {
        /// <summary>
        /// Applies the If-Match header parameter to operations that require optimistic concurrency headers.
        /// </summary>
        /// <param name="operation">The OpenAPI operation.</param>
        /// <param name="context">The operation filter context.</param>
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            ArgumentNullException.ThrowIfNull(operation);
            ArgumentNullException.ThrowIfNull(context);

            var httpMethod = context.ApiDescription.HttpMethod;
            if (!IsConcurrencyProtectedMethod(httpMethod))
            {
                return;
            }

            var relativePath = context.ApiDescription.RelativePath;
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return;
            }

            if (!RequiresIfMatchHeader(relativePath))
            {
                return;
            }

            operation.Parameters ??= new List<OpenApiParameter>();
            if (operation.Parameters.Any(parameter => string.Equals(parameter.Name, HeaderNames.IfMatch, StringComparison.OrdinalIgnoreCase)))
            {
                return;
            }

            // Adding the If-Match header enables Swagger UI to surface the weak ETag required for optimistic concurrency.
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = HeaderNames.IfMatch,
                In = ParameterLocation.Header,
                Description = "ETag for optimistic concurrency control",
                Required = true,
                Schema = new OpenApiSchema { Type = "string" }
            });
        }

        private static bool RequiresIfMatchHeader(string relativePath)
        {
            return relativePath.Contains("Profile", StringComparison.OrdinalIgnoreCase)
                || relativePath.Contains("Patient", StringComparison.OrdinalIgnoreCase)
                || relativePath.Contains("Visit", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsConcurrencyProtectedMethod(string? httpMethod)
        {
            if (string.IsNullOrWhiteSpace(httpMethod))
            {
                return false;
            }

            return string.Equals(httpMethod, HttpMethods.Patch, StringComparison.OrdinalIgnoreCase)
                || string.Equals(httpMethod, HttpMethods.Put, StringComparison.OrdinalIgnoreCase);
        }
    }

    /// <summary>
    /// Operation filter to surface the optional X-Correlation-Id header across API endpoints.
    /// </summary>
    public class CorrelationIdOperationFilter : IOperationFilter
    {
        /// <inheritdoc />
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            ArgumentNullException.ThrowIfNull(operation);
            ArgumentNullException.ThrowIfNull(context);

            if (!IsCorrelationIdAwareOperation(context))
            {
                return;
            }

            operation.Parameters ??= new List<OpenApiParameter>();

            if (operation.Parameters.Any(static parameter => string.Equals(parameter.Name, "X-Correlation-Id", StringComparison.OrdinalIgnoreCase)))
            {
                return;
            }

            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "X-Correlation-Id",
                In = ParameterLocation.Header,
                Description = "Optional correlation identifier used for distributed tracing.",
                Required = false,
                Schema = new OpenApiSchema { Type = "string" }
            });
        }

        private static bool IsCorrelationIdAwareOperation(OperationFilterContext context)
        {
            var apiDescription = context.ApiDescription;
            var relativePath = apiDescription?.RelativePath;

            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return false;
            }

            // Correlation identifiers are only surfaced for AI generation workflows, where the downstream AI provider
            // expects the header to propagate distributed tracing metadata. Matching against the dedicated route keeps
            // the documentation focused and avoids misleading consumers on unrelated endpoints.
            return relativePath.Contains("ai-generation", StringComparison.OrdinalIgnoreCase);
        }
    }

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

                options.OperationFilter<IfMatchOperationFilter>();
                options.OperationFilter<CorrelationIdOperationFilter>();
            });

            return services;
        }
    }
}