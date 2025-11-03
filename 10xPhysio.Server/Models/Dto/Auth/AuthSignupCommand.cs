using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Command payload passed to Supabase GoTrue during therapist sign up. Mirrors the <see cref="Profile"/> metadata
    /// captured in <c>public.profiles</c> and enforces the password policy documented in the API plan before reaching
    /// the external provider.
    /// </summary>
    public class AuthSignupCommand
    {
        /// <summary>
        /// Gets or sets the therapist email. Normalized to lowercase before persistence.
        /// </summary>
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the candidate password. Validation ensures at least one uppercase letter and one digit.
        /// </summary>
        [Required]
        [MinLength(8)]
        [RegularExpression("^(?=.*[A-Z])(?=.*\\d).+$", ErrorMessage = "Password must contain at least one uppercase letter and one digit.")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist first name seeded into <see cref="Profile.FirstName"/>.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist last name seeded into <see cref="Profile.LastName"/>.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;
    }
}
