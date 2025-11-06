using _10xPhysio.Server.Models.Dto.Auth;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Services.Auth;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using System.Net.Mime;

namespace _10xPhysio.Server.Controllers
{
    /// <summary>
    /// Proxies authentication workflows to Supabase GoTrue while enforcing validation and consistent HTTP responses.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces(MediaTypeNames.Application.Json)]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAuthService authService;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthController"/> class.
        /// </summary>
        /// <param name="authService">Domain service responsible for executing Supabase operations.</param>
        public AuthController(IAuthService authService)
        {
            ArgumentNullException.ThrowIfNull(authService);

            this.authService = authService;
        }

        /// <summary>
        /// Registers a new therapist account and returns a status message describing the outcome.
        /// </summary>
        /// <param name="command">Payload containing email, password, and therapist metadata.</param>
        /// <param name="cancellationToken">Token used to cancel the async request.</param>
        /// <returns>A <see cref="OperationMessageDto"/> with a success or failure message.</returns>
        [HttpPost("signup")]
        [EnableRateLimiting("AuthThrottle")]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status409Conflict, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> SignUpAsync([FromBody] AuthSignupCommand command, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var response = await authService.SignUpAsync(command, cancellationToken).ConfigureAwait(false);
            return Created(string.Empty, response);
        }

        /// <summary>
        /// Authenticates a therapist and returns a Supabase session projection.
        /// </summary>
        /// <param name="command">Login payload containing credentials.</param>
        /// <param name="cancellationToken">Token used to cancel the async request.</param>
        /// <returns>An <see cref="AuthSessionDto"/> containing session information.</returns>
        [HttpPost("login")]
        [EnableRateLimiting("AuthThrottle")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(AuthSessionDto))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> LoginAsync([FromBody] AuthLoginCommand command, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var session = await authService.LoginAsync(command, cancellationToken).ConfigureAwait(false);
            return Ok(session);
        }

        /// <summary>
        /// Revokes the session associated with the supplied bearer token.
        /// </summary>
        /// <param name="cancellationToken">Token used to cancel the async request.</param>
        /// <returns>A <see cref="OperationMessageDto"/> confirming session revocation.</returns>
        [HttpPost("logout")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> LogoutAsync(CancellationToken cancellationToken)
        {
            if (!TryGetBearerToken(out var accessToken))
            {
                return Unauthorized(new OperationMessageDto { Message = "missing_access_token" });
            }

            var response = await authService.LogoutAsync(accessToken, cancellationToken).ConfigureAwait(false);
            return Ok(response);
        }

        /// <summary>
        /// Returns a snapshot of the authenticated therapist resolved from the supplied bearer token.
        /// </summary>
        /// <param name="cancellationToken">Token used to cancel the async request.</param>
        /// <returns>A <see cref="SessionSnapshotDto"/> describing the authenticated user.</returns>
        [HttpGet("session")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(SessionSnapshotDto))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized, Type = typeof(OperationMessageDto))]
        [ProducesResponseType(StatusCodes.Status502BadGateway, Type = typeof(OperationMessageDto))]
        public async Task<IActionResult> GetSessionAsync(CancellationToken cancellationToken)
        {
            if (!TryGetBearerToken(out var accessToken))
            {
                return Unauthorized(new OperationMessageDto { Message = "missing_access_token" });
            }

            var session = await authService.GetSessionAsync(accessToken, cancellationToken).ConfigureAwait(false);
            return Ok(session);
        }

        private bool TryGetBearerToken(out string token)
        {
            token = string.Empty;

            if (!Request.Headers.TryGetValue("Authorization", out var authorizationHeader))
            {
                return false;
            }

            var headerValue = authorizationHeader.ToString();

            if (string.IsNullOrWhiteSpace(headerValue) || !headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            token = headerValue[7..].Trim();
            return !string.IsNullOrWhiteSpace(token);
        }
    }
}
