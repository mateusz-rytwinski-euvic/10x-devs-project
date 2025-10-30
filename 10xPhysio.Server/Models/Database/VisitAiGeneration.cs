using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace _10xPhysio.Server.Models.Database
{
    /// <summary>
    /// Represents the public.visit_ai_generations table logging AI prompts and responses per visit.
    /// </summary>
    [Table("visit_ai_generations")]
    public class VisitAiGeneration : BaseModel
    {
        /// <summary>
        /// Unique identifier for each AI generation record.
        /// </summary>
        [PrimaryKey("id", false)]
        public Guid Id { get; set; }

        /// <summary>
        /// Foreign key linking the generation back to the originating visit.
        /// </summary>
        [Column("visit_id")]
        public Guid VisitId { get; set; }

        /// <summary>
        /// Foreign key referencing the owning therapist determined by database trigger.
        /// </summary>
        [Column("therapist_id")]
        public Guid TherapistId { get; set; }

        /// <summary>
        /// Prompt that was sent to the AI model.
        /// </summary>
        [Column("prompt")]
        public string Prompt { get; set; } = string.Empty;

        /// <summary>
        /// Raw AI response returned for the visit.
        /// </summary>
        [Column("ai_response")]
        public string AiResponse { get; set; } = string.Empty;

        /// <summary>
        /// Name of the AI model used to generate the recommendations.
        /// </summary>
        [Column("model_used")]
        public string ModelUsed { get; set; } = string.Empty;

        /// <summary>
        /// Optional generation temperature stored with two decimal precision.
        /// </summary>
        [Column("temperature")]
        public decimal? Temperature { get; set; }

        /// <summary>
        /// Timestamp indicating when the generation occurred.
        /// </summary>
        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; }
    }
}
