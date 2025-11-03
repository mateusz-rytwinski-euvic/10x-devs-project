using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;

namespace _10xPhysio.Server.Models.Dto.Profiles
{
    /// <summary>
    /// Represents the API projection for therapist profile data backed by the <see cref="Profile"/> entity.
    /// Reused across authentication and profile endpoints to deliver consistent metadata and weak ETags.
    /// </summary>
    public class ProfileSummaryDto
    {
        /// <summary>
        /// Gets or sets the therapist identifier (matches Supabase auth user id / <see cref="Profile.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the therapist first name.
        /// </summary>
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the therapist last name.
        /// </summary>
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the creation timestamp mirrored from <see cref="Profile.CreatedAt"/>.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the last modification timestamp mirrored from <see cref="Profile.UpdatedAt"/>.
        /// </summary>
        public DateTimeOffset UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the weak ETag derived from <see cref="Profile.UpdatedAt"/>. Optional for auth responses.
        /// </summary>
        public string? ETag { get; set; }

        /// <summary>
        /// Creates a profile DTO with an automatically calculated ETag.
        /// </summary>
        /// <param name="profile">Database profile entity.</param>
        /// <returns>DTO representation with an <see cref="ETag"/> value populated.</returns>
        public static ProfileSummaryDto FromEntity(Profile profile)
        {
            ArgumentNullException.ThrowIfNull(profile);

            return new ProfileSummaryDto
            {
                Id = profile.Id,
                FirstName = profile.FirstName,
                LastName = profile.LastName,
                CreatedAt = profile.CreatedAt,
                UpdatedAt = profile.UpdatedAt,
                ETag = WeakEtag.FromTimestamp(profile.UpdatedAt)
            };
        }
    }
}
