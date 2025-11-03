using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.VisitAiGenerations
{
    /// <summary>
    /// Command payload for triggering a new AI recommendation generation. The command is linked to <see cref="VisitAiGeneration"/>
    /// records and influences the AI provider invocation.
    /// </summary>
    public class VisitAiGenerationCommand
    {
        /// <summary>
        /// Gets or sets the optional model override (falls back to configuration defaults when absent).
        /// </summary>
        public string? Model { get; set; }

        /// <summary>
        /// Gets or sets the optional temperature used by the AI provider. Clamped by validation attributes.
        /// </summary>
        [Range(0, 2)]
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Gets or sets optional prompt override tokens for contextual tailoring. Serialized as a key/value payload.
        /// </summary>
        public IDictionary<string, string>? PromptOverrides { get; set; }

        /// <summary>
        /// Gets or sets the optional source generation identifier to support regeneration workflows.
        /// </summary>
        public Guid? RegenerateFromGenerationId { get; set; }
    }
}
