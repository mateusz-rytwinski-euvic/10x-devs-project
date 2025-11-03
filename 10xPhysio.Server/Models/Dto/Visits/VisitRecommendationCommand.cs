using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Visits
{
    /// <summary>
    /// Command payload for persisting therapist-approved recommendations on a visit. Updates
    /// <see cref="Visit.Recommendations"/> and the related AI tracking columns.
    /// </summary>
    public class VisitRecommendationCommand
    {
        /// <summary>
        /// Gets or sets the finalized recommendations body.
        /// </summary>
        [Required]
        public string Recommendations { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a value indicating whether the recommendations originate from an AI generation.
        /// </summary>
        public bool AiGenerated { get; set; }

        /// <summary>
        /// Gets or sets the optional AI generation identifier used to populate <see cref="VisitDto.LatestAiGenerationId"/>.
        /// </summary>
        public Guid? SourceGenerationId { get; set; }
    }
}
