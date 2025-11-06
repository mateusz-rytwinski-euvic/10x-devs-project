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
        private string email = string.Empty;
        private string password = string.Empty;
        private string firstName = string.Empty;
        private string lastName = string.Empty;

        /// <summary>
        /// Gets or sets the therapist email. Normalized to lowercase before persistence.
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
        /// Gets or sets the candidate password. Validation ensures at least one uppercase letter and one digit.
        /// </summary>
        [Required]
        [MinLength(8)]
        [RegularExpression("^(?=.*[A-Z])(?=.*\\d).+$", ErrorMessage = "Password must contain at least one uppercase letter and one digit.")]
        public string Password
        {
            get => password;
            set => password = value ?? string.Empty;
        }

        /// <summary>
        /// Gets or sets the therapist first name seeded into <see cref="Profile.FirstName"/>.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string FirstName
        {
            get => firstName;
            set => firstName = (value ?? string.Empty).Trim();
        }

        /// <summary>
        /// Gets or sets the therapist last name seeded into <see cref="Profile.LastName"/>.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string LastName
        {
            get => lastName;
            set => lastName = (value ?? string.Empty).Trim();
        }
    }
}
