using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Models.Dto.VisitAiGenerations
{
    /// <summary>
    /// Represents the payload returned immediately after an AI generation completes. Aligns with audit data stored in
    /// <see cref="VisitAiGeneration"/> while adding transient status information consumed by the client.
    /// </summary>
    public class VisitAiGenerationCreatedDto
    {
        /// <summary>
        /// Gets or sets the AI generation identifier.
        /// </summary>
        public Guid GenerationId { get; set; }

        /// <summary>
        /// Gets or sets the generation status (e.g. completed, queued).
        /// </summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the AI model name used.
        /// </summary>
        public string Model { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the applied temperature.
        /// </summary>
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Gets or sets the prompt dispatched to the AI provider.
        /// </summary>
        public string Prompt { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the raw AI response.
        /// </summary>
        public string AiResponse { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the preview text shown to therapists. Typically derived from <see cref="AiResponse"/>.
        /// </summary>
        public string RecommendationsPreview { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the creation timestamp (<see cref="VisitAiGeneration.CreatedAt"/>).
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }
    }
}
