using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.VisitAiGenerations;

namespace _10xPhysio.Server.Services.VisitAiGenerations
{
    /// <summary>
    /// Defines the contract for coordinating AI recommendation generation workflows. Implementations are responsible
    /// for enforcing therapist ownership, invoking the external AI provider, and persisting generation logs.
    /// </summary>
    public interface IVisitAiGenerationService
    {
        /// <summary>
        /// Triggers a new AI recommendation generation for the specified visit.
        /// </summary>
        /// <param name="therapistId">Authenticated therapist identifier owning the visit.</param>
        /// <param name="visitId">Visit identifier receiving the generated recommendations.</param>
        /// <param name="command">Command payload containing model overrides and generation options.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>Details about the persisted AI generation.</returns>
        Task<VisitAiGenerationCreatedDto> GenerateAsync(
            Guid therapistId,
            Guid visitId,
            VisitAiGenerationCommand command,
            CancellationToken cancellationToken);

        /// <summary>
        /// Lists AI generation logs associated with a visit using normalized pagination semantics.
        /// </summary>
        /// <param name="therapistId">Authenticated therapist identifier owning the visit.</param>
        /// <param name="visitId">Visit identifier whose logs should be enumerated.</param>
        /// <param name="page">Requested page index (1-based).</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="order">Requested chronological ordering token (asc or desc).</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>Paginated list of AI generation summaries.</returns>
        Task<PaginatedResponseDto<VisitAiGenerationListItemDto>> ListAsync(
            Guid therapistId,
            Guid visitId,
            int page,
            int pageSize,
            string? order,
            CancellationToken cancellationToken);

        /// <summary>
        /// Retrieves a specific AI generation log entry, enforcing therapist ownership.
        /// </summary>
        /// <param name="therapistId">Authenticated therapist identifier owning the visit.</param>
        /// <param name="visitId">Visit identifier owning the AI generation.</param>
        /// <param name="generationId">AI generation identifier.</param>
        /// <param name="cancellationToken">Token used to cancel the asynchronous operation.</param>
        /// <returns>Detailed AI generation log entry.</returns>
        Task<VisitAiGenerationDetailDto> GetAsync(
            Guid therapistId,
            Guid visitId,
            Guid generationId,
            CancellationToken cancellationToken);
    }
}
