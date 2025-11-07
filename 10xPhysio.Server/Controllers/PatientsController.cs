using _10xPhysio.Server.Extensions;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Patients;
using _10xPhysio.Server.Services.Patients;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Microsoft.Net.Http.Headers;

using System.Net.Mime;

namespace _10xPhysio.Server.Controllers
{
    /// <summary>
    /// Exposes therapist-scoped patient management endpoints backed by Supabase.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    [Produces(MediaTypeNames.Application.Json)]
    public sealed class PatientsController : ControllerBase
    {
        private readonly IPatientService patientService;

        /// <summary>
        /// Initializes a new instance of the <see cref="PatientsController"/> class.
        /// </summary>
        /// <param name="patientService">Domain service orchestrating patient persistence.</param>
        public PatientsController(IPatientService patientService)
        {
            ArgumentNullException.ThrowIfNull(patientService);

            this.patientService = patientService;
        }

        /// <summary>
        /// Creates a new patient bound to the authenticated therapist.
        /// </summary>
        /// <param name="command">Payload describing the patient demographic data.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The created patient projection with concurrency metadata.</returns>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(PatientDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> CreateAsync([FromBody] PatientCreateCommand command, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var patient = await patientService.CreateAsync(therapistId, command, cancellationToken).ConfigureAwait(false);

            ApplyEtag(patient.ETag);

            // Named route avoids runtime link generation failures when producing the Location header.
            return CreatedAtRoute(
                nameof(GetByIdAsync),
                new { patientId = patient.Id },
                patient);
        }

        /// <summary>
        /// Retrieves a paginated list of patients for the authenticated therapist.
        /// </summary>
        /// <param name="page">Page number (1-based).</param>
        /// <param name="pageSize">Requested page size.</param>
        /// <param name="search">Optional search term applied to patient names.</param>
        /// <param name="sort">Sort field.</param>
        /// <param name="order">Sort order.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>Paginated patient list items including visit aggregates.</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PaginatedResponseDto<PatientListItemDto>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetAsync(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string sort = "lastName",
            [FromQuery] string order = "")
        {
            var therapistId = User.GetRequiredTherapistId();
            var patients = await patientService.ListAsync(therapistId, page, pageSize, search, sort, order, HttpContext.RequestAborted).ConfigureAwait(false);
            return Ok(patients);
        }

        /// <summary>
        /// Retrieves a patient detail projection optionally enriched with visit summaries.
        /// </summary>
        /// <param name="patientId">Patient identifier.</param>
        /// <param name="includeVisits">Flag indicating whether recent visits should be included.</param>
        /// <param name="visitsLimit">Maximum number of visits to embed.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>Detailed patient payload.</returns>
    [HttpGet("{patientId:guid}", Name = nameof(GetByIdAsync))]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PatientDetailsDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetByIdAsync(
            Guid patientId,
            [FromQuery] bool includeVisits = false,
            [FromQuery] int? visitsLimit = null,
            CancellationToken cancellationToken = default)
        {
            var therapistId = User.GetRequiredTherapistId();
            var patient = await patientService.GetAsync(therapistId, patientId, includeVisits, visitsLimit, cancellationToken).ConfigureAwait(false);

            ApplyEtag(patient.ETag);
            return Ok(patient);
        }

        /// <summary>
        /// Applies demographic updates to an existing patient guarded by a weak ETag.
        /// </summary>
        /// <param name="patientId">Patient identifier.</param>
        /// <param name="command">Update payload.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The refreshed patient projection.</returns>
        [HttpPatch("{patientId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PatientDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> UpdateAsync(
            Guid patientId,
            [FromBody] PatientUpdateCommand command,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var therapistId = User.GetRequiredTherapistId();
            var ifMatch = Request.GetRequiredIfMatch();

            var patient = await patientService.UpdateAsync(therapistId, patientId, command, ifMatch, cancellationToken).ConfigureAwait(false);

            ApplyEtag(patient.ETag);
            return Ok(patient);
        }

        /// <summary>
        /// Deletes a patient and associated records within the therapist scope.
        /// </summary>
        /// <param name="patientId">Patient identifier.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>No content response on success.</returns>
        [HttpDelete("{patientId:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> DeleteAsync(Guid patientId, CancellationToken cancellationToken)
        {
            var therapistId = User.GetRequiredTherapistId();
            await patientService.DeleteAsync(therapistId, patientId, cancellationToken).ConfigureAwait(false);
            return NoContent();
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