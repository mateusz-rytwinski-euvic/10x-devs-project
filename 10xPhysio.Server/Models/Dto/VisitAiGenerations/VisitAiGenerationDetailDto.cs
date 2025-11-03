using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.VisitAiGenerations
{
    /// <summary>
    /// Represents the AI generation payload returned by <c>GET /api/visits/{{visitId}}/ai-generations/{{generationId}}</c>.
    /// </summary>
    public class VisitAiGenerationDetailDto
    {
        /// <summary>
        /// Gets or sets the generation identifier (<see cref="VisitAiGeneration.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the visit identifier (<see cref="VisitAiGeneration.VisitId"/>).
        /// </summary>
        public Guid VisitId { get; set; }

        /// <summary>
        /// Gets or sets the therapist identifier (<see cref="VisitAiGeneration.TherapistId"/>).
        /// </summary>
        public Guid TherapistId { get; set; }

        /// <summary>
        /// Gets or sets the AI model used for the generation.
        /// </summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the applied temperature.
        /// </summary>
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Gets or sets the prompt sent to the AI provider.
        /// </summary>
        public string Prompt { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the raw AI response captured for auditing.
        /// </summary>
        public string AiResponse { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the creation timestamp (<see cref="VisitAiGeneration.CreatedAt"/>).
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Materializes a detail DTO from a persistence entity.
        /// </summary>
        /// <param name="entity">Visit AI generation entity.</param>
        /// <returns>Detail DTO.</returns>
        public static VisitAiGenerationDetailDto FromEntity(VisitAiGeneration entity)
        {
            if (entity == null)
            {
                throw new ArgumentNullException(nameof(entity));
            }

            return new VisitAiGenerationDetailDto
            {
                Id = entity.Id,
                VisitId = entity.VisitId,
                TherapistId = entity.TherapistId,
                Model = entity.ModelUsed,
                Temperature = entity.Temperature,
                Prompt = entity.Prompt,
                AiResponse = entity.AiResponse,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
