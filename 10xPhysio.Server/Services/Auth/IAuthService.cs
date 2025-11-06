using _10xPhysio.Server.Models.Dto.Auth;
using _10xPhysio.Server.Models.Dto.Common;

namespace _10xPhysio.Server.Services.Auth
{
    /// <summary>
    /// Encapsulates authentication workflows executed against Supabase GoTrue.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Registers a new therapist account by delegating to Supabase GoTrue.
        /// </summary>
        /// <param name="command">Payload containing email, password, and therapist metadata.</param>
        /// <param name="cancellationToken">Token used to cancel the operation.</param>
        /// <returns>A message that signals whether the account was created successfully.</returns>
        Task<OperationMessageDto> SignUpAsync(AuthSignupCommand command, CancellationToken cancellationToken = default);

        /// <summary>
        /// Authenticates a therapist and returns session tokens issued by Supabase GoTrue.
        /// </summary>
        /// <param name="command">Payload containing the therapist credentials.</param>
        /// <param name="cancellationToken">Token used to cancel the operation.</param>
        /// <returns>An authentication session DTO including access and refresh tokens.</returns>
        Task<AuthSessionDto> LoginAsync(AuthLoginCommand command, CancellationToken cancellationToken = default);

        /// <summary>
        /// Revokes the session represented by the provided access token.
        /// </summary>
        /// <param name="accessToken">JWT access token extracted from the Authorization header.</param>
        /// <param name="cancellationToken">Token used to cancel the operation.</param>
        /// <returns>A message describing the outcome of the revocation request.</returns>
        Task<OperationMessageDto> LogoutAsync(string accessToken, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves the current therapist profile snapshot associated with the provided token.
        /// </summary>
        /// <param name="accessToken">JWT access token extracted from the Authorization header.</param>
        /// <param name="cancellationToken">Token used to cancel the operation.</param>
        /// <returns>A snapshot of the therapist session information.</returns>
        Task<SessionSnapshotDto> GetSessionAsync(string accessToken, CancellationToken cancellationToken = default);
    }
}
