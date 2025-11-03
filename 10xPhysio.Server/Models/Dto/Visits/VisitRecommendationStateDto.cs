using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;

namespace _10xPhysio.Server.Models.Dto.Visits
{
    /// <summary>
    /// Represents the recommendation-focused response payload returned after persisting therapist approval.
    /// </summary>
    public class VisitRecommendationStateDto
    {
        /// <summary>
        /// Gets or sets the visit identifier (<see cref="Visit.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the visit recommendations snapshot.
        /// </summary>
        public string Recommendations { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the AI generated flag (<see cref="Visit.RecommendationsGeneratedByAi"/>).
        /// </summary>
        public bool RecommendationsGeneratedByAi { get; set; }

        /// <summary>
        /// Gets or sets the timestamp describing when recommendations were generated.
        /// </summary>
        public DateTimeOffset? RecommendationsGeneratedAt { get; set; }

        /// <summary>
        /// Gets or sets the update timestamp (<see cref="Visit.UpdatedAt"/>).
        /// </summary>
        public DateTimeOffset UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the weak ETag derived from <see cref="UpdatedAt"/>.
        /// </summary>
        public string ETag { get; set; } = string.Empty;

        /// <summary>
        /// Materializes a recommendation DTO from the visit entity.
        /// </summary>
        /// <param name="visit">Visit entity with persisted recommendation data.</param>
        /// <returns>Recommendation state DTO.</returns>
        public static VisitRecommendationStateDto FromVisit(Visit visit)
        {
            ArgumentNullException.ThrowIfNull(visit);

            return new VisitRecommendationStateDto
            {
                Id = visit.Id,
                Recommendations = visit.Recommendations ?? string.Empty,
                RecommendationsGeneratedByAi = visit.RecommendationsGeneratedByAi,
                RecommendationsGeneratedAt = visit.RecommendationsGeneratedAt,
                UpdatedAt = visit.UpdatedAt,
                ETag = WeakEtag.FromTimestamp(visit.UpdatedAt)
            };
        }
    }
}
