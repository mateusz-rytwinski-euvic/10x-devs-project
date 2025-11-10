using _10xPhysio.Server.Configuration;
using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Services.Visits;

using System.Text.RegularExpressions;

namespace _10xPhysio.Server.Services.VisitAiGenerations
{
    /// <summary>
    /// Provides guard clause helpers for AI generation workflows. Centralizing validation ensures controllers and
    /// services share consistent business rules when interacting with OpenRouter and Supabase persistence.
    /// </summary>
    internal static class VisitAiGenerationValidation
    {
        private static readonly Regex DisallowedMarkupPattern = new("<(script|style|iframe)[^>]*>", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

        /// <summary>
        /// Computes the AI model to use for a generation, falling back to configuration defaults when clients do not
        /// supply a value.
        /// </summary>
        /// <param name="requestedModel">Optional model override provided by the client.</param>
        /// <param name="options">Resolved AI generation options.</param>
        /// <returns>Normalized model token.</returns>
        public static string ResolveModel(string? requestedModel, AiGenerationOptions options)
        {
            ArgumentNullException.ThrowIfNull(options);

            if (string.IsNullOrWhiteSpace(requestedModel))
            {
                return options.DefaultModel;
            }

            var normalized = requestedModel.Trim();

            if (DisallowedMarkupPattern.IsMatch(normalized))
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "model_override_invalid");
            }

            return normalized;
        }

        /// <summary>
        /// Normalizes the requested temperature by clamping the value to configured bounds.
        /// </summary>
        /// <param name="requestedTemperature">Optional temperature supplied by the client.</param>
        /// <param name="options">Resolved AI generation options.</param>
        /// <returns>Normalized temperature value.</returns>
        public static decimal ResolveTemperature(decimal? requestedTemperature, AiGenerationOptions options)
        {
            ArgumentNullException.ThrowIfNull(options);

            if (!requestedTemperature.HasValue)
            {
                return options.DefaultTemperature;
            }

            var clamped = decimal.Clamp(requestedTemperature.Value, options.MinTemperature, options.MaxTemperature);
            return Math.Round(clamped, 2, MidpointRounding.AwayFromZero);
        }

        /// <summary>
        /// Sanitizes prompt override key/value pairs, removing empty entries and enforcing size constraints.
        /// </summary>
        /// <param name="overrides">Optional prompt override collection provided by the client.</param>
        /// <param name="options">Resolved AI generation options.</param>
        /// <returns>Read-only sanitized dictionary suitable for downstream prompt composition.</returns>
        public static IReadOnlyDictionary<string, string> NormalizePromptOverrides(
            IDictionary<string, string>? overrides,
            AiGenerationOptions options)
        {
            ArgumentNullException.ThrowIfNull(options);

            if (overrides is null || overrides.Count == 0)
            {
                return new Dictionary<string, string>(0, StringComparer.OrdinalIgnoreCase);
            }

            var sanitized = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var kvp in overrides)
            {
                if (string.IsNullOrWhiteSpace(kvp.Key))
                {
                    continue;
                }

                var normalizedKey = kvp.Key.Trim();
                var normalizedValue = VisitValidation.NormalizeOptionalContent(kvp.Value, "prompt_override");

                if (string.IsNullOrEmpty(normalizedValue))
                {
                    continue;
                }

                if (normalizedValue.Length > options.PromptOverrideLimit)
                {
                    throw new ApiException(StatusCodes.Status422UnprocessableEntity, "prompt_override_too_long");
                }

                if (DisallowedMarkupPattern.IsMatch(normalizedValue))
                {
                    throw new ApiException(StatusCodes.Status422UnprocessableEntity, "prompt_override_invalid");
                }

                sanitized[normalizedKey] = normalizedValue;
            }

            return sanitized;
        }

        /// <summary>
        /// Ensures the visit narrative contains at least the configured minimum number of characters before AI
        /// generation proceeds. Only interview and description fields contribute toward this threshold.
        /// </summary>
        /// <param name="interview">Normalized interview notes.</param>
        /// <param name="description">Normalized visit description.</param>
        /// <param name="minimumContextLength">Minimum number of characters required across both fields.</param>
        public static void EnsureMinimumContextLength(string? interview, string? description, int minimumContextLength)
        {
            if (minimumContextLength <= 0)
            {
                throw new ApiException(StatusCodes.Status500InternalServerError, "generation_configuration_invalid");
            }

            var totalLength = (interview?.Length ?? 0) + (description?.Length ?? 0);

            if (totalLength < minimumContextLength)
            {
                throw new ApiException(StatusCodes.Status422UnprocessableEntity, "insufficient_visit_context");
            }
        }

        /// <summary>
        /// Validates the optional regeneration source identifier, ensuring empty GUIDs are never propagated.
        /// </summary>
        /// <param name="generationId">Generation identifier supplied by the client.</param>
        public static void ValidateRegenerationSource(Guid? generationId)
        {
            if (!generationId.HasValue)
            {
                return;
            }

            if (generationId.Value == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_generation_id");
            }
        }
    }
}
