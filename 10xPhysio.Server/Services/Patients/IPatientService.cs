using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Patients;

namespace _10xPhysio.Server.Services.Patients
{
    /// <summary>
    /// Exposes patient-focused operations required by the API controllers. Each method enforces therapist scoping
    /// and wraps Supabase data access with validation and concurrency checks.
    /// </summary>
    public interface IPatientService
    {
        /// <summary>
        /// Creates a new patient bound to the supplied therapist identifier after performing duplicate detection and
        /// input normalization.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist.</param>
        /// <param name="command">Payload containing the patient demographic data.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The materialized patient DTO enriched with concurrency metadata.</returns>
        Task<PatientDto> CreateAsync(Guid therapistId, PatientCreateCommand command, CancellationToken cancellationToken);

        /// <summary>
        /// Retrieves a paginated collection of patients filtered to the therapist scope and augmented with visit metrics.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist.</param>
        /// <param name="page">Requested page number (1-based).</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="search">Optional free-text search applied to first and last name.</param>
        /// <param name="sort">Sort field requested by the client.</param>
        /// <param name="order">Sort order requested by the client.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>A paginated response containing patient list items.</returns>
        Task<PaginatedResponseDto<PatientListItemDto>> ListAsync(
            Guid therapistId,
            int page,
            int pageSize,
            string? search,
            string sort,
            string order,
            CancellationToken cancellationToken);

        /// <summary>
        /// Retrieves a detailed patient projection scoped to the therapist, optionally embedding visit summaries.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist.</param>
        /// <param name="patientId">Identifier of the patient to retrieve.</param>
        /// <param name="includeVisits">Flag indicating whether visit summaries should be included.</param>
        /// <param name="visitsLimit">Optional limit applied when visits are requested.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The detailed patient DTO.</returns>
        Task<PatientDetailsDto> GetAsync(
            Guid therapistId,
            Guid patientId,
            bool includeVisits,
            int? visitsLimit,
            CancellationToken cancellationToken);

        /// <summary>
        /// Applies patient updates guarded by the provided weak ETag header, revalidating duplicates when demographic
        /// fields change.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist.</param>
        /// <param name="patientId">Identifier of the patient being updated.</param>
        /// <param name="command">Payload containing the updated patient fields.</param>
        /// <param name="ifMatch">Weak ETag value supplied by the client.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The refreshed patient DTO with a regenerated weak ETag.</returns>
        Task<PatientDto> UpdateAsync(
            Guid therapistId,
            Guid patientId,
            PatientUpdateCommand command,
            string ifMatch,
            CancellationToken cancellationToken);

        /// <summary>
        /// Deletes a patient scoped to the therapist, returning silently when the operation succeeds.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist.</param>
        /// <param name="patientId">Identifier of the patient to delete.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>A task representing the asynchronous delete operation.</returns>
        Task DeleteAsync(Guid therapistId, Guid patientId, CancellationToken cancellationToken);
    }
}
