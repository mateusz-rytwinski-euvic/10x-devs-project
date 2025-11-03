using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.Visits
{
    /// <summary>
    /// Represents a condensed visit projection used when embedding visit data inside a patient payload.
    /// </summary>
    public class VisitSummaryDto
    {
        /// <summary>
        /// Gets or sets the visit identifier (<see cref="Visit.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the parent patient identifier (<see cref="Visit.PatientId"/>).
        /// </summary>
        public Guid PatientId { get; set; }

        /// <summary>
        /// Gets or sets the visit date/timestamp.
        /// </summary>
        public DateTimeOffset VisitDate { get; set; }

        /// <summary>
        /// Gets or sets the optional interview narrative.
        /// </summary>
        public string? Interview { get; set; }

        /// <summary>
        /// Gets or sets the optional visit description.
        /// </summary>
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets the optional recommendations captured for the visit.
        /// </summary>
        public string? Recommendations { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the recommendations were AI generated.
        /// </summary>
        public bool RecommendationsGeneratedByAi { get; set; }

        /// <summary>
        /// Gets or sets the timestamp capturing when AI recommendations were generated.
        /// </summary>
        public DateTimeOffset? RecommendationsGeneratedAt { get; set; }

        /// <summary>
        /// Materializes a summary DTO from a visit entity for embedding scenarios.
        /// </summary>
        /// <param name="visit">Visit entity backing the DTO.</param>
        /// <returns>Summary DTO.</returns>
        public static VisitSummaryDto FromEntity(Visit visit)
        {
            ArgumentNullException.ThrowIfNull(visit);

            return new VisitSummaryDto
            {
                Id = visit.Id,
                PatientId = visit.PatientId,
                VisitDate = visit.VisitDate,
                Interview = visit.Interview,
                Description = visit.Description,
                Recommendations = visit.Recommendations,
                RecommendationsGeneratedByAi = visit.RecommendationsGeneratedByAi,
                RecommendationsGeneratedAt = visit.RecommendationsGeneratedAt
            };
        }
    }
}
