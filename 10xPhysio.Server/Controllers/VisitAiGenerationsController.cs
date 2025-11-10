using _10xPhysio.Server.Extensions;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.VisitAiGenerations;
using _10xPhysio.Server.Services.VisitAiGenerations;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using System.Net.Mime;

namespace _10xPhysio.Server.Controllers
{
    /// <summary>
    /// Exposes visit-scoped AI recommendation generation endpoints for therapists.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api")]
    [Produces(MediaTypeNames.Application.Json)]
    public sealed class VisitAiGenerationsController : ControllerBase
    {
        private readonly IVisitAiGenerationService generationService;

        /// <summary>
        /// Initializes a new instance of the <see cref="VisitAiGenerationsController"/> class.
        /// </summary>
        /// <param name="generationService">Domain service orchestrating AI generation workflows.</param>
        public VisitAiGenerationsController(IVisitAiGenerationService generationService)
        {
            ArgumentNullException.ThrowIfNull(generationService);
            this.generationService = generationService;
        }

        /// <summary>
        /// Triggers a new AI recommendation generation for the specified visit.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="command">Generation command payload.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>Details of the generated AI recommendation.</returns>
        [HttpPost("visits/{visitId:guid}/ai-generation")]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(VisitAiGenerationCreatedDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GenerateAsync(
            Guid visitId,
            [FromBody] VisitAiGenerationCommand command,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var generation = await generationService.GenerateAsync(therapistId, visitId, command, cancellationToken).ConfigureAwait(false);

            return CreatedAtRoute(
                nameof(GetGenerationByIdAsync),
                new { visitId, generationId = generation.GenerationId },
                generation);
        }

        /// <summary>
        /// Lists AI generation logs for the specified visit.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="page">Requested page number.</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="order">Sort direction (asc or desc).</param>
        /// <returns>Paginated list of AI generation summaries.</returns>
        [HttpGet("visits/{visitId:guid}/ai-generations")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PaginatedResponseDto<VisitAiGenerationListItemDto>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> ListAsync(
            Guid visitId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string order = "desc")
        {
            var therapistId = User.GetRequiredTherapistId();
            var generations = await generationService.ListAsync(
                    therapistId,
                    visitId,
                    page,
                    pageSize,
                    order,
                    HttpContext.RequestAborted)
                .ConfigureAwait(false);

            return Ok(generations);
        }

        /// <summary>
        /// Retrieves a specific AI generation log entry for the visit.
        /// </summary>
        /// <param name="visitId">Identifier of the visit.</param>
        /// <param name="generationId">Identifier of the AI generation.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>AI generation detail DTO.</returns>
        [HttpGet("visits/{visitId:guid}/ai-generations/{generationId:guid}", Name = nameof(GetGenerationByIdAsync))]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(VisitAiGenerationDetailDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status403Forbidden, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetGenerationByIdAsync(
            Guid visitId,
            Guid generationId,
            CancellationToken cancellationToken)
        {
            var therapistId = User.GetRequiredTherapistId();
            var generation = await generationService.GetAsync(therapistId, visitId, generationId, cancellationToken).ConfigureAwait(false);
            return Ok(generation);
        }
    }
}
