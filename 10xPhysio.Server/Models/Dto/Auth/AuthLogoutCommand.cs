using System.ComponentModel.DataAnnotations;

namespace _10xPhysio.Server.Models.Dto.Auth
{
    /// <summary>
    /// Command payload responsible for revoking an active refresh token via Supabase GoTrue.
    /// </summary>
    public class AuthLogoutCommand
    {
        /// <summary>
        /// Gets or sets the refresh token to revoke.
        /// </summary>
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
