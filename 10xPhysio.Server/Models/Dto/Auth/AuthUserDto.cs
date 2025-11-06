using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Represents the user payload returned alongside Supabase session data. Mirrors the columns managed by the
    /// <see cref="Profile"/> table to keep authentication responses consistent with profile projections.
    /// </summary>
    public class AuthUserDto
    {
        /// <summary>
        /// Gets or sets the Supabase auth identifier (<c>auth.uid()</c>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the therapist email address resolved from Supabase metadata.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist first name.
        /// </summary>
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist last name.
        /// </summary>
        public string LastName { get; set; } = string.Empty;
    }
}
