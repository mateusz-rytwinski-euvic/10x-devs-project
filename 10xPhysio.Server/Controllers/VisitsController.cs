using _10xPhysio.Server.Extensions;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Visits;
using _10xPhysio.Server.Services.Visits;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Microsoft.Net.Http.Headers;

using System.Net.Mime;

namespace _10xPhysio.Server.Controllers
{
    /// <summary>
    /// Exposes therapist-scoped visit management endpoints backed by Supabase storage.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api")]
    [Produces(MediaTypeNames.Application.Json)]
    public sealed class VisitsController : ControllerBase
    {
        private readonly IVisitService visitService;

        /// <summary>
        /// Initializes a new instance of the <see cref="VisitsController"/> class.
        /// </summary>
        /// <param name="visitService">Domain service orchestrating visit persistence and AI metadata.</param>
        public VisitsController(IVisitService visitService)
        {
            ArgumentNullException.ThrowIfNull(visitService);

            this.visitService = visitService;
        }

        /// <summary>
        /// Creates a new visit bound to the supplied patient identifier within the therapist scope.
        /// </summary>
        /// <param name="patientId">Identifier of the patient receiving the visit.</param>
        /// <param name="command">Payload describing visit metadata.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The created visit projection enriched with concurrency metadata.</returns>
        [HttpPost("patients/{patientId:guid}/visits")]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(VisitDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> CreateAsync(
            Guid patientId,
            [FromBody] VisitCreateCommand command,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var visit = await visitService.CreateAsync(therapistId, patientId, command, cancellationToken).ConfigureAwait(false);

            ApplyEtag(visit.ETag);

            return CreatedAtRoute(
                nameof(GetVisitByIdAsync),
                new { visitId = visit.Id },
                visit);
        }

        /// <summary>
        /// Retrieves a paginated timeline of visits for the specified patient within the therapist scope.
        /// </summary>
        /// <param name="patientId">Identifier of the patient.</param>
        /// <param name="page">Requested page number (1-based).</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="from">Optional inclusive lower bound timestamp.</param>
        /// <param name="to">Optional inclusive upper bound timestamp.</param>
        /// <param name="includeRecommendations">Flag indicating whether recommendations should be returned.</param>
        /// <param name="order">Sort order applied to visit dates.</param>
        /// <returns>Paginated visit DTOs.</returns>
        [HttpGet("patients/{patientId:guid}/visits")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PaginatedResponseDto<VisitDto>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetByPatientAsync(
            Guid patientId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] DateTimeOffset? from = null,
            [FromQuery] DateTimeOffset? to = null,
            [FromQuery] bool includeRecommendations = true,
            [FromQuery] string order = "desc")
        {
            var therapistId = User.GetRequiredTherapistId();
            var visits = await visitService.ListAsync(
                    therapistId,
                    patientId,
                    page,
                    pageSize,
                    from,
                    to,
                    includeRecommendations,
                    order,
                    HttpContext.RequestAborted)
                .ConfigureAwait(false);

            return Ok(visits);
        }

        /// <summary>
        /// Retrieves a detailed visit projection along with AI metadata.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>Visit payload enriched with telemetry and concurrency metadata.</returns>
        [HttpGet("visits/{visitId:guid}", Name = nameof(GetVisitByIdAsync))]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VisitDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetVisitByIdAsync(Guid visitId, CancellationToken cancellationToken = default)
        {
            var therapistId = User.GetRequiredTherapistId();
            var visit = await visitService.GetAsync(therapistId, visitId, cancellationToken).ConfigureAwait(false);

            ApplyEtag(visit.ETag);
            return Ok(visit);
        }

        /// <summary>
        /// Applies metadata updates to an existing visit guarded by the weak ETag contract.
        /// </summary>
        /// <param name="visitId">Identifier of the visit being updated.</param>
        /// <param name="command">Payload containing visit metadata changes.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The refreshed visit projection.</returns>
        [HttpPatch("visits/{visitId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VisitDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> UpdateAsync(
            Guid visitId,
            [FromBody] VisitUpdateCommand command,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var expectedTimestamp = Request.GetRequiredIfMatchTimestamp();

            var visit = await visitService.UpdateAsync(
                    therapistId,
                    visitId,
                    command,
                    expectedTimestamp,
                    cancellationToken)
                .ConfigureAwait(false);

            ApplyEtag(visit.ETag);
            return Ok(visit);
        }

        /// <summary>
        /// Deletes a visit within the therapist scope.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>No content response when deletion succeeds.</returns>
        [HttpDelete("visits/{visitId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> DeleteAsync(Guid visitId, CancellationToken cancellationToken)
        {
            var therapistId = User.GetRequiredTherapistId();
            await visitService.DeleteAsync(therapistId, visitId, cancellationToken).ConfigureAwait(false);
            return NoContent();
        }

        /// <summary>
        /// Persists therapist-approved recommendations for the visit, updating AI tracking metadata.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="command">Payload containing the recommendation state.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The refreshed recommendation state DTO.</returns>
        [HttpPut("visits/{visitId:guid}/recommendations")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VisitRecommendationStateDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> SaveRecommendationsAsync(
            Guid visitId,
            [FromBody] VisitRecommendationCommand command,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var expectedTimestamp = Request.GetRequiredIfMatchTimestamp();

            var recommendation = await visitService.SaveRecommendationsAsync(
                    therapistId,
                    visitId,
                    command,
                    expectedTimestamp,
                    cancellationToken)
                .ConfigureAwait(false);

            ApplyEtag(recommendation.ETag);
            return Ok(recommendation);
        }

        private void ApplyEtag(string? etag)
        {
            if (string.IsNullOrWhiteSpace(etag))
            {
                return;
            }

            Response.Headers[HeaderNames.ETag] = etag;
        }
    }
}
