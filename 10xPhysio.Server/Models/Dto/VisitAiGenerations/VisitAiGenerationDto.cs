using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.VisitAiGenerations
{
    /// <summary>
    /// Represents the persisted AI generation log used by list and detail endpoints. Directly maps
    /// to <see cref="VisitAiGeneration"/> fields.
    /// </summary>
    public class VisitAiGenerationDto
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
        /// Gets or sets the model used for generation.
        /// </summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the applied temperature.
        /// </summary>
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Gets or sets the prompt sent to the model.
        /// </summary>
        public string Prompt { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the AI response text.
        /// </summary>
        public string AiResponse { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the creation timestamp (<see cref="VisitAiGeneration.CreatedAt"/>).
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Materializes a DTO from an AI generation entity.
        /// </summary>
        /// <param name="entity">Persisted generation entity.</param>
        /// <returns>DTO aligned with API plan.</returns>
        public static VisitAiGenerationDto FromEntity(VisitAiGeneration entity)
        {
            ArgumentNullException.ThrowIfNull(entity);

            return new VisitAiGenerationDto
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
