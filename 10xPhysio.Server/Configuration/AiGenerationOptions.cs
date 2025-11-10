using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Configuration
{
    /// <summary>
    /// Represents configuration settings controlling AI recommendation generation behavior and OpenRouter client
    /// defaults. The options expose sensible bounds so validation logic can clamp incoming requests reliably.
    /// </summary>
    public class AiGenerationOptions : IValidatableObject
    {
        /// <summary>
        /// Provides the configuration section name used during options binding.
        /// </summary>
        public const string SectionName = "AiGeneration";

        /// <summary>
        /// Gets or sets the OpenRouter API base URL. Must include the API version segment.
        /// </summary>
        [Required]
        [Url]
        public string ApiBaseUrl { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the OpenRouter API key used for authenticated requests.
        /// </summary>
        [Required]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the default AI model identifier used when the client omits a model override.
        /// </summary>
        [Required]
        public string DefaultModel { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the default sampling temperature applied to AI generations.
        /// </summary>
        [Range(0, 2)]
        public decimal DefaultTemperature { get; set; } = 0.7m;

        /// <summary>
        /// Gets or sets the minimum temperature allowed for incoming requests.
        /// </summary>
        [Range(0, 2)]
        public decimal MinTemperature { get; set; } = 0;

        /// <summary>
        /// Gets or sets the maximum temperature allowed for incoming requests.
        /// </summary>
        [Range(0, 2)]
        public decimal MaxTemperature { get; set; } = 1.2m;

        /// <summary>
        /// Gets or sets the minimum amount of visit narrative characters required before AI generation is permitted.
        /// </summary>
        [Range(1, 1000)]
        public int MinimumContextLength { get; set; } = 120;

        /// <summary>
        /// Gets or sets the maximum combined character count of each prompt override value.
        /// </summary>
        [Range(16, 2000)]
        public int PromptOverrideLimit { get; set; } = 256;

        /// <summary>
        /// Gets or sets the HTTP timeout in seconds for OpenRouter requests.
        /// </summary>
        [Range(5, 300)]
        public int ProviderTimeoutSeconds { get; set; } = 60;

        /// <summary>
        /// Gets or sets the optional referer header sent to OpenRouter for telemetry and abuse mitigation.
        /// </summary>
        public string? Referer { get; set; }

        /// <inheritdoc />
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(ApiKey))
            {
                yield return new ValidationResult("OpenRouter API key must be provided.", [nameof(ApiKey)]);
            }

            if (string.IsNullOrWhiteSpace(DefaultModel))
            {
                yield return new ValidationResult("Default model must be provided.", [nameof(DefaultModel)]);
            }

            if (MinTemperature > MaxTemperature)
            {
                yield return new ValidationResult("Minimum temperature cannot exceed maximum temperature.", [nameof(MinTemperature), nameof(MaxTemperature)]);
            }

            if (DefaultTemperature < MinTemperature || DefaultTemperature > MaxTemperature)
            {
                yield return new ValidationResult("Default temperature must fall within the configured range.", [nameof(DefaultTemperature)]);
            }

            if (MinimumContextLength < 1)
            {
                yield return new ValidationResult("Minimum context length must be positive.", [nameof(MinimumContextLength)]);
            }

            if (PromptOverrideLimit < 1)
            {
                yield return new ValidationResult("Prompt override limit must be positive.", [nameof(PromptOverrideLimit)]);
            }
        }
    }
}
