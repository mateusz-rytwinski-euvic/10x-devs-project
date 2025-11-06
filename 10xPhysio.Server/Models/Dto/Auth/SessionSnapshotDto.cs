namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Represents a validated Supabase session echo used by <c>GET /api/auth/session</c>.
    /// </summary>
    public class SessionSnapshotDto
    {
        /// <summary>
        /// Gets or sets the authenticated user identifier resolved from the JWT (<c>auth.uid()</c>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the email recovered from Supabase token claims.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist first name sourced from the metadata table.
        /// </summary>
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist last name sourced from the metadata table.
        /// </summary>
        public string LastName { get; set; } = string.Empty;
    }
}
