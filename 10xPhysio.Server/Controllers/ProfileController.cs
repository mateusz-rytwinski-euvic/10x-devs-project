using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Profiles;
using _10xPhysio.Server.Services.Profiles;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Microsoft.Net.Http.Headers;

using System.Net.Mime;
using System.Security.Claims;

namespace _10xPhysio.Server.Controllers
{
    /// <summary>
    /// Exposes therapist profile endpoints secured by Supabase authentication.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    [Produces(MediaTypeNames.Application.Json)]
    public sealed class ProfileController : ControllerBase
    {
        private readonly IProfileService profileService;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileController"/> class.
        /// </summary>
        /// <param name="profileService">Service responsible for retrieving and updating profiles.</param>
        public ProfileController(IProfileService profileService)
        {
            ArgumentNullException.ThrowIfNull(profileService);

            this.profileService = profileService;
        }

        /// <summary>
        /// Retrieves the authenticated therapist profile alongside a weak ETag header.
        /// </summary>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The therapist profile projection.</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ProfileSummaryDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetAsync(CancellationToken cancellationToken)
        {
            var userId = GetCurrentUserId();
            var profile = await profileService.GetAsync(userId, cancellationToken).ConfigureAwait(false);

            ApplyEtag(profile.ETag);
            return Ok(profile);
        }

        /// <summary>
        /// Applies profile updates guarded by the supplied weak ETag header.
        /// </summary>
        /// <param name="command">Payload containing the requested profile changes.</param>
        /// <param name="cancellationToken">Token used to cancel the async operation.</param>
        /// <returns>The updated therapist profile projection.</returns>
        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ProfileSummaryDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> PatchAsync([FromBody] ProfileUpdateCommand command, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var ifMatch = ExtractIfMatchHeader();
            var userId = GetCurrentUserId();
            var profile = await profileService.UpdateAsync(userId, command, ifMatch, cancellationToken).ConfigureAwait(false);

            ApplyEtag(profile.ETag);
            return Ok(profile);
        }

        private Guid GetCurrentUserId()
        {
            var userIdValue = User.FindFirstValue("sub")
                ?? User.FindFirstValue("user_id")
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var userId))
            {
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }

            return userId;
        }

        private string ExtractIfMatchHeader()
        {
            if (!Request.Headers.TryGetValue("If-Match", out var headerValues))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            var rawValue = headerValues.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));

            if (string.IsNullOrWhiteSpace(rawValue))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            var candidate = rawValue.Split(',')[0].Trim();

            if (string.IsNullOrWhiteSpace(candidate))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            return candidate;
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
