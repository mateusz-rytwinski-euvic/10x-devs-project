using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;

namespace _10xPhysio.Server.Models.Dto.Patients
{
    /// <summary>
    /// Represents the canonical patient response payload used for create/update flows. Mirrors the writable columns
    /// on <see cref="Patient"/> and includes the weak ETag required for concurrency-aware PATCH/PUT operations.
    /// </summary>
    public class PatientDto
    {
        /// <summary>
        /// Gets or sets the patient identifier (<see cref="Patient.Id"/>).
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the owning therapist identifier (<see cref="Patient.TherapistId"/>).
        /// </summary>
        public Guid TherapistId { get; set; }

        /// <summary>
        /// Gets or sets the patient first name.
        /// </summary>
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the patient last name.
        /// </summary>
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the patient date of birth in ISO format. Converted from <see cref="Patient.DateOfBirth"/>.
        /// </summary>
        public DateOnly? DateOfBirth { get; set; }

        /// <summary>
        /// Gets or sets the creation timestamp mirrored from <see cref="Patient.CreatedAt"/>.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the last update timestamp mirrored from <see cref="Patient.UpdatedAt"/>.
        /// </summary>
        public DateTimeOffset UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the weak ETag derived from <see cref="UpdatedAt"/>.
        /// </summary>
        public string ETag { get; set; } = string.Empty;

        /// <summary>
        /// Builds a DTO projection from a database entity ensuring date conversions and concurrency metadata are present.
        /// </summary>
        /// <param name="patient">Concrete database entity.</param>
        /// <returns>Rich DTO ready for transport.</returns>
        public static PatientDto FromEntity(Patient patient)
        {
            ArgumentNullException.ThrowIfNull(patient);

            return new PatientDto
            {
                Id = patient.Id,
                TherapistId = patient.TherapistId,
                FirstName = patient.FirstName,
                LastName = patient.LastName,
                DateOfBirth = patient.DateOfBirth.HasValue
                    ? DateOnly.FromDateTime(DateTime.SpecifyKind(patient.DateOfBirth.Value, DateTimeKind.Utc))
                    : null,
                CreatedAt = patient.CreatedAt,
                UpdatedAt = patient.UpdatedAt,
                ETag = WeakEtag.FromTimestamp(patient.UpdatedAt)
            };
        }
    }
}
