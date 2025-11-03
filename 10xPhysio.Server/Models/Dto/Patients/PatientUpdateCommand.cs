using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Patients
{
    /// <summary>
    /// Command payload for updating a patient demographic record. Consumed together with the weak ETag calculated
    /// from <c>patients.updated_at</c> and emitted through <see cref="PatientSummaryDto"/> derivatives.
    /// </summary>
    public class PatientUpdateCommand
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
        /// Gets or sets the optional patient date of birth.
        /// </summary>
        [DataType(DataType.Date)]
        public DateOnly? DateOfBirth { get; set; }
    }
}
