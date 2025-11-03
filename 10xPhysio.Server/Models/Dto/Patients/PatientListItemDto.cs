using System;

using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;

namespace _10xPhysio.Server.Models.Dto.Patients
{
    /// <summary>
    /// Represents a lightweight patient projection used by list endpoints. The DTO stitches together
    /// fields from <see cref="Patient"/> and aggregated visit metadata (e.g. latest visit timestamp).
    /// </summary>
    public class PatientListItemDto
    {
        /// <summary>
        /// Gets or sets the patient identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the patient first name.
        /// </summary>
        public string FirstName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the patient last name.
        /// </summary>
        public string LastName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional patient date of birth.
        /// </summary>
        public DateOnly? DateOfBirth { get; set; }

        /// <summary>
        /// Gets or sets the creation timestamp taken from <see cref="Patient.CreatedAt"/>.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the last update timestamp taken from <see cref="Patient.UpdatedAt"/>.
        /// </summary>
        public DateTimeOffset UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the most recent visit date associated with the patient. Computed from <see cref="Visit"/> records.
        /// </summary>
        public DateTimeOffset? LatestVisitDate { get; set; }

        /// <summary>
        /// Gets or sets the total visit count per patient. Derived from <see cref="Visit"/> rows owned by the patient.
        /// </summary>
        public int VisitCount { get; set; }

        /// <summary>
        /// Gets or sets the weak ETag derived from <see cref="UpdatedAt"/>.
        /// </summary>
        public string ETag { get; set; } = string.Empty;

        /// <summary>
        /// Hydrates a list item DTO from the core patient entity and aggregated visit metrics.
        /// </summary>
        /// <param name="patient">Patient entity used for base fields.</param>
        /// <param name="latestVisit">Latest visit timestamp if available.</param>
        /// <param name="visitCount">Total visit count for the patient.</param>
        /// <returns>DTO ready for serialization.</returns>
        public static PatientListItemDto FromEntity(
            Patient patient,
            DateTimeOffset? latestVisit,
            int visitCount)
        {
            ArgumentNullException.ThrowIfNull(patient);

            return new PatientListItemDto
            {
                Id = patient.Id,
                FirstName = patient.FirstName,
                LastName = patient.LastName,
                DateOfBirth = patient.DateOfBirth.HasValue
                    ? DateOnly.FromDateTime(DateTime.SpecifyKind(patient.DateOfBirth.Value, DateTimeKind.Utc))
                    : null,
                CreatedAt = patient.CreatedAt,
                UpdatedAt = patient.UpdatedAt,
                LatestVisitDate = latestVisit,
                VisitCount = visitCount,
                ETag = WeakEtag.FromTimestamp(patient.UpdatedAt)
            };
        }
    }
}
