using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Profiles
{
    /// <summary>
    /// Command payload for patching therapist profile metadata. The command mirrors the writable surface of
    /// <see cref="Profile"/> and is consumed alongside an <c>If-Match</c> weak ETag computed from
    /// <see cref="ProfileSummaryDto.ETag"/>.
    /// </summary>
    public class ProfileUpdateCommand
    {
        /// <summary>
        /// Gets or sets the updated first name value.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the updated last name value.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;
    }
}
