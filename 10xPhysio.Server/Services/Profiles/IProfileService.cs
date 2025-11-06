using _10xPhysio.Server.Models.Dto.Profiles;

namespace _10xPhysio.Server.Services.Profiles
{
    /// <summary>
    /// Exposes therapist profile operations used by API controllers to interact with Supabase-backed data.
    /// </summary>
    public interface IProfileService
    {
        /// <summary>
        /// Retrieves the profile associated with the supplied therapist identifier.
        /// </summary>
        /// <param name="userId">Therapist identifier sourced from the authenticated principal.</param>
        /// <param name="cancellationToken">Token used to cancel the retrieval request.</param>
        /// <returns>The therapist profile summary with a weak ETag.</returns>
        Task<ProfileSummaryDto> GetAsync(Guid userId, CancellationToken cancellationToken);

        /// <summary>
        /// Applies profile updates with optimistic concurrency protection via weak ETags.
        /// </summary>
        /// <param name="userId">Therapist identifier sourced from the authenticated principal.</param>
        /// <param name="command">Payload containing the updated profile fields.</param>
        /// <param name="ifMatch">Weak ETag provided through the If-Match header.</param>
        /// <param name="cancellationToken">Token used to cancel the update request.</param>
        /// <returns>The refreshed profile summary with a new weak ETag.</returns>
        Task<ProfileSummaryDto> UpdateAsync(Guid userId, ProfileUpdateCommand command, string ifMatch, CancellationToken cancellationToken);
    }
}
