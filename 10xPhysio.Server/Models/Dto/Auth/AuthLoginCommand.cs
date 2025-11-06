using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Command payload issued when a therapist requests a session from Supabase GoTrue. Validates credentials prior
    /// to invoking the external API to keep error handling consistent across controllers.
    /// </summary>
    public class AuthLoginCommand
    {
        private string email = string.Empty;
        private string password = string.Empty;

        /// <summary>
        /// Gets or sets the therapist email used for authentication.
        /// </summary>
        [Required]
        [EmailAddress]
        [StringLength(256)]
        public string Email
        {
            get => email;
            set => email = (value ?? string.Empty).Trim().ToLowerInvariant();
        }

        /// <summary>
        /// Gets or sets the plaintext password supplied by the therapist.
        /// </summary>
        [Required]
        [MinLength(8)]
        [RegularExpression("^(?=.*[A-Z])(?=.*\\d).+$", ErrorMessage = "Password must contain at least one uppercase letter and one digit.")]
        public string Password
        {
            get => password;
            set => password = value ?? string.Empty;
        }
    }
}
