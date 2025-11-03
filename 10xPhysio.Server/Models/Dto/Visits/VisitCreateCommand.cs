using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Visits
{
    /// <summary>
    /// Command payload for creating a visit row in <see cref="Visit"/>.
    /// </summary>
    public class VisitCreateCommand
    {
        /// <summary>
        /// Gets or sets the visit date/time in UTC. Defaults to now when omitted at the API layer.
        /// </summary>
        [Required]
        public DateTimeOffset VisitDate { get; set; } = DateTimeOffset.UtcNow;

        /// <summary>
        /// Gets or sets the optional interview narrative.
        /// </summary>
        public string? Interview { get; set; }

        /// <summary>
        /// Gets or sets the optional visit description.
        /// </summary>
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets the optional therapist-authored recommendations.
        /// </summary>
        public string? Recommendations { get; set; }
    }
}
