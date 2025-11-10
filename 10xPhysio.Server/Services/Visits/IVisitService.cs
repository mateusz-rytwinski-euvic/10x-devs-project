using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Visits;

namespace _10xPhysio.Server.Services.Visits
{
    /// <summary>
    /// Defines the visit management contract used by API controllers to orchestrate therapist-scoped operations.
    /// Each method is responsible for enforcing ownership, validation, and optimistic concurrency guarantees when
    /// interacting with the Supabase backing store.
    /// </summary>
    public interface IVisitService
    {
        /// <summary>
        /// Creates a new visit record bound to the supplied patient and therapist identifiers, ensuring ownership and
        /// business-rule validation before persisting the entity.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="patientId">Identifier of the patient receiving the visit.</param>
        /// <param name="command">Payload containing visit metadata captured during creation.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>The materialized visit DTO enriched with concurrency metadata and AI analytics.</returns>
        Task<VisitDto> CreateAsync(Guid therapistId, Guid patientId, VisitCreateCommand command, CancellationToken cancellationToken);

        /// <summary>
        /// Retrieves a paginated collection of visits scoped to the patient owned by the therapist, applying filtering
        /// and ordering options negotiated with the client.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="patientId">Identifier of the patient whose visit timeline is being queried.</param>
        /// <param name="page">Requested page number (1-based).</param>
        /// <param name="pageSize">Requested page size constrained to API bounds.</param>
        /// <param name="from">Optional inclusive lower bound for visit dates.</param>
        /// <param name="to">Optional inclusive upper bound for visit dates.</param>
        /// <param name="includeRecommendations">Flag indicating whether recommendations should be emitted.</param>
        /// <param name="order">Requested ordering token (<c>asc</c> or <c>desc</c>).</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>A paginated response containing visit DTO projections.</returns>
        Task<PaginatedResponseDto<VisitDto>> ListAsync(
            Guid therapistId,
            Guid patientId,
            int page,
            int pageSize,
            DateTimeOffset? from,
            DateTimeOffset? to,
            bool includeRecommendations,
            string order,
            CancellationToken cancellationToken);

        /// <summary>
        /// Retrieves a detailed visit projection scoped to the therapist, augmenting the response with AI generation
        /// telemetry when available.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="visitId">Identifier of the visit to retrieve.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>The visit DTO containing concurrency metadata.</returns>
        Task<VisitDto> GetAsync(Guid therapistId, Guid visitId, CancellationToken cancellationToken);

        /// <summary>
        /// Applies visit metadata updates guarded by weak ETag concurrency checks and the supplied validation rules.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="visitId">Identifier of the visit being updated.</param>
        /// <param name="command">Payload containing the updated visit fields.</param>
        /// <param name="expectedTimestamp">Timestamp extracted from the client's weak ETag.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>The refreshed visit DTO with regenerated concurrency metadata.</returns>
        Task<VisitDto> UpdateAsync(
            Guid therapistId,
            Guid visitId,
            VisitUpdateCommand command,
            DateTimeOffset expectedTimestamp,
            CancellationToken cancellationToken);

        /// <summary>
        /// Deletes a visit scoped to the therapist after enforcing ownership checks. The operation succeeds silently
        /// when the visit is removed.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="visitId">Identifier of the visit to delete.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>A task representing the asynchronous delete operation.</returns>
        Task DeleteAsync(Guid therapistId, Guid visitId, CancellationToken cancellationToken);

        /// <summary>
        /// Persists therapist-approved recommendations associated with the visit while updating AI tracking metadata
        /// and enforcing optimistic concurrency with weak ETags.
        /// </summary>
        /// <param name="therapistId">Identifier of the authenticated therapist issuing the request.</param>
        /// <param name="visitId">Identifier of the visit whose recommendations are being saved.</param>
        /// <param name="command">Payload containing the finalized recommendations state.</param>
        /// <param name="expectedTimestamp">Timestamp extracted from the client's weak ETag.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>The recommendation snapshot DTO with refreshed concurrency metadata.</returns>
        Task<VisitRecommendationStateDto> SaveRecommendationsAsync(
            Guid therapistId,
            Guid visitId,
            VisitRecommendationCommand command,
            DateTimeOffset expectedTimestamp,
            CancellationToken cancellationToken);
    }
}
