using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Auth;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Services.Supabase;

using Supabase.Gotrue;
using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest.Exceptions;

using SupabaseClient = Supabase.Client;

namespace _10xPhysio.Server.Services.Auth
{
    /// <summary>
    /// Coordinates Supabase GoTrue operations required by the authentication API endpoints.
    /// </summary>
    public sealed class AuthService : IAuthService
    {
        private readonly ISupabaseClientFactory clientFactory;
        private readonly ILogger<AuthService> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthService"/> class.
        /// </summary>
        /// <param name="clientFactory">Factory used to obtain Supabase client instances.</param>
        /// <param name="logger">Logs authentication telemetry.</param>
        public AuthService(ISupabaseClientFactory clientFactory, ILogger<AuthService> logger)
        {
            ArgumentNullException.ThrowIfNull(clientFactory);
            ArgumentNullException.ThrowIfNull(logger);

            this.clientFactory = clientFactory;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<OperationMessageDto> SignUpAsync(AuthSignupCommand command, CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(command);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    ["firstName"] = command.FirstName,
                    ["lastName"] = command.LastName
                }
            };

            try
            {
                await client.Auth.SignUp(command.Email, command.Password, options).ConfigureAwait(false);
            }
            catch (GotrueException gotrueException)
            {
                logger.LogWarning(gotrueException, "Supabase signup failed for {Email}.", command.Email);

                if (gotrueException.Message.Contains("User already registered", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ApiException(StatusCodes.Status409Conflict, "account_exists", gotrueException);
                }

                throw new ApiException(StatusCodes.Status502BadGateway, "signup_failed", gotrueException);
            }

            return new OperationMessageDto { Message = "account_created" };
        }

        /// <inheritdoc />
        public async Task<AuthSessionDto> LoginAsync(AuthLoginCommand command, CancellationToken cancellationToken)
        {
            ArgumentNullException.ThrowIfNull(command);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            Session session;

            try
            {
                session = await client.Auth.SignIn(command.Email, command.Password).ConfigureAwait(false)
                    ?? throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_credentials");
            }
            catch (GotrueException gotrueException)
            {
                logger.LogWarning(gotrueException, "Supabase login failed for {Email}.", command.Email);
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_credentials", gotrueException);
            }

            var userId = ParseUserId(session.User?.Id);
            var profile = await FetchProfileAsync(client, userId, cancellationToken).ConfigureAwait(false);

            return new AuthSessionDto
            {
                AccessToken = session.AccessToken ?? string.Empty,
                RefreshToken = session.RefreshToken ?? string.Empty,
                ExpiresIn = Convert.ToInt32(Math.Min(session.ExpiresIn, int.MaxValue)),
                User = new AuthUserDto
                {
                    Id = userId,
                    Email = session.User?.Email ?? command.Email,
                    FirstName = profile?.FirstName ?? string.Empty,
                    LastName = profile?.LastName ?? string.Empty
                }
            };
        }

        /// <inheritdoc />
        public async Task<OperationMessageDto> LogoutAsync(string accessToken, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            try
            {
                await client.Auth.SetSession(accessToken, string.Empty, false).ConfigureAwait(false);
                await client.Auth.SignOut(global::Supabase.Gotrue.Constants.SignOutScope.Global).ConfigureAwait(false);
            }
            catch (GotrueException gotrueException)
            {
                logger.LogWarning(gotrueException, "Supabase logout failed for token hash {TokenHash}.", HashToken(accessToken));

                if (IsUnauthorized(gotrueException))
                {
                    throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token", gotrueException);
                }

                throw new ApiException(StatusCodes.Status502BadGateway, "logout_failed", gotrueException);
            }

            return new OperationMessageDto { Message = "session_revoked" };
        }

        /// <inheritdoc />
        public async Task<SessionSnapshotDto> GetSessionAsync(string accessToken, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            User user;

            try
            {
                user = await client.Auth.GetUser(accessToken).ConfigureAwait(false)
                    ?? throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token");
            }
            catch (GotrueException gotrueException)
            {
                logger.LogWarning(gotrueException, "Supabase session lookup failed for token hash {TokenHash}.", HashToken(accessToken));

                if (IsUnauthorized(gotrueException))
                {
                    throw new ApiException(StatusCodes.Status401Unauthorized, "invalid_token", gotrueException);
                }

                throw new ApiException(StatusCodes.Status502BadGateway, "session_lookup_failed", gotrueException);
            }

            var userId = ParseUserId(user.Id);
            var profile = await FetchProfileAsync(client, userId, cancellationToken).ConfigureAwait(false);

            return new SessionSnapshotDto
            {
                Id = userId,
                Email = user.Email ?? string.Empty,
                FirstName = profile?.FirstName ?? string.Empty,
                LastName = profile?.LastName ?? string.Empty
            };
        }

        private static Guid ParseUserId(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ApiException(StatusCodes.Status502BadGateway, "missing_user_identifier");
            }

            if (!Guid.TryParse(value, out var userId))
            {
                throw new ApiException(StatusCodes.Status502BadGateway, "invalid_user_identifier");
            }

            return userId;
        }

        private static async Task<Profile?> FetchProfileAsync(SupabaseClient client, Guid userId, CancellationToken cancellationToken)
        {
            try
            {
                return await client
                    .From<Profile>()
                    .Filter("id", global::Supabase.Postgrest.Constants.Operator.Equals, userId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (PostgrestException)
            {
                return null;
            }
        }

        private string HashToken(string token)
        {
            var length = Math.Min(token.Length, 8);
            return token[..length];
        }

        private static bool IsUnauthorized(GotrueException gotrueException)
        {
            var message = gotrueException.Message ?? string.Empty;
            return message.Contains("invalid", StringComparison.OrdinalIgnoreCase)
                && (message.Contains("token", StringComparison.OrdinalIgnoreCase) || message.Contains("session", StringComparison.OrdinalIgnoreCase));
        }
    }
}
