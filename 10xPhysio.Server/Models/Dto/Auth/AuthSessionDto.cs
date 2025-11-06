
namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Represents the composite response payload returned from signup and login endpoints. Couples Supabase session
    /// tokens with the therapist identity metadata expected by the REST contract.
    /// </summary>
    public class AuthSessionDto
    {
        /// <summary>
        /// Gets or sets the short-lived access token issued by Supabase GoTrue.
        /// </summary>
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the refresh token used to renew the session.
        /// </summary>
        public string RefreshToken { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the token expiry in seconds.
        /// </summary>
        public int ExpiresIn { get; set; }

        /// <summary>
        /// Gets or sets the therapist account information associated with the authenticated session.
        /// </summary>
        public AuthUserDto User { get; set; } = new();
    }
}
