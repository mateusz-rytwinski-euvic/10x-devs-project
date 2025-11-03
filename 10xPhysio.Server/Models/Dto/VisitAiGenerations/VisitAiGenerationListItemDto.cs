using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.VisitAiGenerations
{
    /// <summary>
    /// Represents the paginated list item view for AI generation logs.
    /// </summary>
    public class VisitAiGenerationListItemDto
    {
        /// <summary>
        /// Gets or sets the generation identifier (<see cref="VisitAiGeneration.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the AI model used.
        /// </summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the applied temperature.
        /// </summary>
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Gets or sets the prompt snippet recorded for the request.
        /// </summary>
        public string Prompt { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the AI response captured for auditing.
        /// </summary>
        public string AiResponse { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the creation timestamp (<see cref="VisitAiGeneration.CreatedAt"/>).
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Creates a list DTO from an entity.
        /// </summary>
        /// <param name="entity">Generation entity.</param>
        /// <returns>List item DTO.</returns>
        public static VisitAiGenerationListItemDto FromEntity(VisitAiGeneration entity)
        {
            ArgumentNullException.ThrowIfNull(entity);

            return new VisitAiGenerationListItemDto
            {
                Id = entity.Id,
                Model = entity.ModelUsed,
                Temperature = entity.Temperature,
                Prompt = entity.Prompt,
                AiResponse = entity.AiResponse,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
