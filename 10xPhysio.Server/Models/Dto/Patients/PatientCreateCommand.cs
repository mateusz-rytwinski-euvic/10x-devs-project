using _10xPhysio.Server.Models.Database;

using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Patients
{
    /// <summary>
    /// Command payload for creating a new patient in <see cref="Patient"/>. Validates the demographic inputs prior to
    /// executing the uniqueness constraint on <c>(therapist_id, lower(first_name), lower(last_name), date_of_birth)</c>.
    /// </summary>
    public class PatientCreateCommand
    {
        /// <summary>
        /// Gets or sets the patient first name.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the patient last name.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional patient date of birth. Incoming ISO strings are converted to <see cref="DateOnly"/>
        /// while persistence occurs as <see cref="Patient.DateOfBirth"/> (<see cref="DateTime"/>) for Postgres compatibility.
        /// </summary>
        [DataType(DataType.Date)]
        public DateOnly? DateOfBirth { get; set; }
    }
}
