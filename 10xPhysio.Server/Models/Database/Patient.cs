using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace _10xPhysio.Server.Models.Database
{
    /// <summary>
    /// Represents the public.patients table that binds a patient record to a therapist profile.
    /// </summary>
    [Table("patients")]
    public class Patient : BaseModel
    {
        /// <summary>
        /// Unique identifier generated via gen_random_uuid for each patient.
        /// </summary>
        [PrimaryKey("id", false)]
        public Guid Id { get; set; }

        /// <summary>
        /// Foreign key pointing to the owning therapist profile.
        /// </summary>
        [Column("therapist_id")]
        public Guid TherapistId { get; set; }

        /// <summary>
        /// Patient first name used in therapist-centric search results.
        /// </summary>
        [Column("first_name")]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Patient surname paired with the first name and date of birth uniqueness constraint.
        /// </summary>
        [Column("last_name")]
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Optional date of birth stored as a UTC-normalized DateTime for compatibility with Supabase serializers.
        /// </summary>
        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        /// <summary>
        /// Timestamp of when the patient record was created.
        /// </summary>
        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Timestamp of the most recent patient update, kept in sync by database triggers.
        /// </summary>
        [Column("updated_at")]
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
