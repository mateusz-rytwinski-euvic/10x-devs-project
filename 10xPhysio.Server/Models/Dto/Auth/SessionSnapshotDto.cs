using _10xPhysio.Server.Models.Dto.Profiles;

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
        public Guid UserId { get; set; }

        /// <summary>
        /// Gets or sets the email recovered from Supabase token claims.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the issued at timestamp extracted from the JWT.
        /// </summary>
        public DateTimeOffset IssuedAt { get; set; }

        /// <summary>
        /// Gets or sets the expiration timestamp extracted from the JWT.
        /// </summary>
        public DateTimeOffset ExpiresAt { get; set; }

        /// <summary>
        /// Gets or sets the therapist profile snapshot used for UI hydration.
        /// </summary>
        public ProfileSummaryDto Profile { get; set; } = new();
    }
}
