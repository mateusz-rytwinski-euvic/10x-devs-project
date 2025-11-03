using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Visits;

using System.Collections.ObjectModel;

namespace _10xPhysio.Server.Models.Dto.Patients
{
    /// <summary>
    /// Represents the detailed patient payload returned by <c>GET /api/patients/{{patientId}}</c>. Augments the core
    /// <see cref="Patient"/> projection with recent <see cref="Visit"/> data when requested.
    /// </summary>
    public class PatientDetailsDto
    {
        /// <summary>
        /// Gets or sets the patient identifier (<see cref="Patient.Id"/>).
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
        /// Gets or sets the patient creation timestamp.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the timestamp of the last patient update.
        /// </summary>
        public DateTimeOffset UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the weak ETag derived from <see cref="UpdatedAt"/> to support conditional updates.
        /// </summary>
        public string ETag { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional visit summaries (ordered DESC by visit date per API contract).
        /// </summary>
        public IReadOnlyList<VisitSummaryDto> Visits { get; set; } = [];

        /// <summary>
        /// Builds a detailed patient DTO including optional visit summaries.
        /// </summary>
        /// <param name="patient">Structured patient entity.</param>
        /// <param name="visits">Optional visit summaries requested via <c>includeVisits</c>.</param>
        /// <returns>Hydrated patient detail DTO.</returns>
        public static PatientDetailsDto FromEntity(
            Patient patient,
            IEnumerable<VisitSummaryDto>? visits)
        {
            ArgumentNullException.ThrowIfNull(patient);

            return new PatientDetailsDto
            {
                Id = patient.Id,
                FirstName = patient.FirstName,
                LastName = patient.LastName,
                DateOfBirth = patient.DateOfBirth.HasValue
                    ? DateOnly.FromDateTime(DateTime.SpecifyKind(patient.DateOfBirth.Value, DateTimeKind.Utc))
                    : null,
                CreatedAt = patient.CreatedAt,
                UpdatedAt = patient.UpdatedAt,
                ETag = WeakEtag.FromTimestamp(patient.UpdatedAt),
                Visits = visits != null
                    ? new ReadOnlyCollection<VisitSummaryDto>(visits.ToList())
                    : Array.Empty<VisitSummaryDto>()
            };
        }
    }
}
