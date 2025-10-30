using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace _10xPhysio.Server.Models.Database
{
    /// <summary>
    /// Represents the public.profiles table used to hydrate therapist identities from Supabase auth.
    /// </summary>
    [Table("profiles")]
    public class Profile : BaseModel
    {
        /// <summary>
        /// Primary key aligned with the Supabase auth user identifier.
        /// </summary>
        [PrimaryKey("id", false)]
        public Guid Id { get; set; }

        /// <summary>
        /// Therapist first name captured during onboarding metadata sync.
        /// </summary>
        [Column("first_name")]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Therapist last name captured during onboarding metadata sync.
        /// </summary>
        [Column("last_name")]
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Timestamp of when the profile record was created within Supabase.
        /// </summary>
        [Column("created_at")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Timestamp of the last profile update, managed by database triggers.
        /// </summary>
        [Column("updated_at")]
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
