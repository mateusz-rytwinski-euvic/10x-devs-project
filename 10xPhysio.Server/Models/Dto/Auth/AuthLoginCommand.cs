using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Command payload issued when a therapist requests a session from Supabase GoTrue. Validates credentials prior
    /// to invoking the external API to keep error handling consistent across controllers.
    /// </summary>
    public class AuthLoginCommand
    {
        /// <summary>
        /// Gets or sets the therapist email used for authentication.
        /// </summary>
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the plaintext password supplied by the therapist.
        /// </summary>
        [Required]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;
    }
}
