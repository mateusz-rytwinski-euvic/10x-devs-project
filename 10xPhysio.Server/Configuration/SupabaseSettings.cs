using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Configuration
{
    /// <summary>
    /// Holds Supabase connection parameters bound from configuration.
    /// </summary>
    public class SupabaseSettings : IValidatableObject
    {
        public const string SectionName = "Supabase";

        /// <summary>
        /// Gets or sets the Supabase project URL.
        /// </summary>
        [Required]
        [Url]
        public string Url { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the Supabase anon public key.
        /// </summary>
        [Required]
        public string AnonKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the Supabase JWT secret used to validate access tokens.
        /// </summary>
        [Required]
        public string JwtSecret { get; set; } = string.Empty;

        /// <inheritdoc />
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(Url))
            {
                yield return new ValidationResult("Supabase URL must be provided.", [nameof(Url)]);
            }

            if (string.IsNullOrWhiteSpace(AnonKey))
            {
                yield return new ValidationResult("Supabase anon key must be provided.", [nameof(AnonKey)]);
            }

            if (string.IsNullOrWhiteSpace(JwtSecret))
            {
                yield return new ValidationResult("Supabase JWT secret must be provided.", [nameof(JwtSecret)]);
            }
        }
    }
}
