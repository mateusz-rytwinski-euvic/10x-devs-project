using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Profiles;
using _10xPhysio.Server.Services.Supabase;

using Supabase.Postgrest.Exceptions;

using System.Text.RegularExpressions;

using SupabaseClient = Supabase.Client;

namespace _10xPhysio.Server.Services.Profiles
{
    /// <summary>
    /// Coordinates Supabase Postgrest interactions required to expose therapist profile data safely via the API.
    /// </summary>
    public sealed class ProfileService : IProfileService
    {
        private static readonly Regex AllowedNameCharacters = new("^[\\p{L}\\- ]+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private readonly ISupabaseClientFactory clientFactory;
        private readonly ILogger<ProfileService> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileService"/> class.
        /// </summary>
        /// <param name="clientFactory">Factory that provides initialized Supabase clients.</param>
        /// <param name="logger">Logs security and validation events.</param>
        public ProfileService(ISupabaseClientFactory clientFactory, ILogger<ProfileService> logger)
        {
            ArgumentNullException.ThrowIfNull(clientFactory);
            ArgumentNullException.ThrowIfNull(logger);

            this.clientFactory = clientFactory;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<ProfileSummaryDto> GetAsync(Guid userId, CancellationToken cancellationToken)
        {
            if (userId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_user_identifier");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var profile = await FetchProfileAsync(client, userId, cancellationToken).ConfigureAwait(false);

            return ProfileSummaryDto.FromEntity(profile);
        }

        /// <inheritdoc />
        public async Task<ProfileSummaryDto> UpdateAsync(Guid userId, ProfileUpdateCommand command, string ifMatch, CancellationToken cancellationToken)
        {
            if (userId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_user_identifier");
            }

            ArgumentNullException.ThrowIfNull(command);

            if (string.IsNullOrWhiteSpace(ifMatch))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            if (!WeakEtag.TryParse(ifMatch, out var ifMatchTimestamp))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_if_match");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var profile = await FetchProfileAsync(client, userId, cancellationToken).ConfigureAwait(false);

            if (!IsMatch(ifMatchTimestamp, profile.UpdatedAt))
            {
                logger.LogWarning("Weak ETag mismatch detected for profile {ProfileId}. Provided: {ProvidedTimestamp}. Actual: {ActualTimestamp}.", userId, ifMatchTimestamp, profile.UpdatedAt);
                throw new ApiException(StatusCodes.Status409Conflict, "etag_mismatch");
            }

            var normalizedFirstName = NormalizeName(command.FirstName, "first_name");
            var normalizedLastName = NormalizeName(command.LastName, "last_name");

            if (string.Equals(normalizedFirstName, profile.FirstName, StringComparison.Ordinal)
                && string.Equals(normalizedLastName, profile.LastName, StringComparison.Ordinal))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "no_changes_submitted");
            }

            await ApplyUpdateAsync(client, profile.Id, normalizedFirstName, normalizedLastName, cancellationToken).ConfigureAwait(false);

            var refreshedProfile = await FetchProfileAsync(client, userId, cancellationToken).ConfigureAwait(false);
            return ProfileSummaryDto.FromEntity(refreshedProfile);
        }

        private async Task<Profile> FetchProfileAsync(SupabaseClient client, Guid userId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await client
                    .From<Profile>()
                    .Filter("id", global::Supabase.Postgrest.Constants.Operator.Equals, userId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (result is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "profile_missing");
                }

                return result;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(postgrestException, "Supabase profile lookup failed for {ProfileId}.", userId);
                throw new ApiException(StatusCodes.Status404NotFound, "profile_missing", postgrestException);
            }
        }

        private async Task ApplyUpdateAsync(SupabaseClient client, Guid profileId, string firstName, string lastName, CancellationToken cancellationToken)
        {
            var payload = new Profile
            {
                Id = profileId,
                FirstName = firstName,
                LastName = lastName
            };

            try
            {
                var response = await client
                    .From<Profile>()
                    .Update(payload, cancellationToken: cancellationToken)
                    .ConfigureAwait(false);

                if (response.Models is null || response.Models.Count == 0)
                {
                    logger.LogWarning("Supabase profile update affected no rows for {ProfileId}.", profileId);
                    throw new ApiException(StatusCodes.Status404NotFound, "profile_missing");
                }
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(postgrestException, "Supabase profile update failed for {ProfileId}.", profileId);
                throw new ApiException(StatusCodes.Status502BadGateway, "profile_update_failed", postgrestException);
            }
        }

        private static bool IsMatch(DateTimeOffset expected, DateTimeOffset actual)
        {
            return expected.ToUniversalTime().Equals(actual.ToUniversalTime());
        }

        private static string NormalizeName(string value, string fieldCode)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_required");
            }

            var trimmed = value.Trim();
            var collapsed = Regex.Replace(trimmed, "\\s+", " ");

            if (collapsed.Length > 100)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_too_long");
            }

            if (!AllowedNameCharacters.IsMatch(collapsed))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, $"{fieldCode}_invalid");
            }

            return collapsed;
        }
    }
}
