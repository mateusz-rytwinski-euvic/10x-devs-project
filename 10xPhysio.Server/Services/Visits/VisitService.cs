using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Visits;
using _10xPhysio.Server.Services.Supabase;

using Microsoft.AspNetCore.Http;

using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Interfaces;

using System.Collections.ObjectModel;

using PostgrestOperator = Supabase.Postgrest.Constants.Operator;
using PostgrestOrdering = Supabase.Postgrest.Constants.Ordering;
using QueryOptions = Supabase.Postgrest.QueryOptions;
using SupabaseClient = Supabase.Client;

namespace _10xPhysio.Server.Services.Visits
{
    /// <summary>
    /// Coordinates Supabase interactions for visit creation, retrieval, updates, deletion, and recommendation
    /// persistence. The service enforces therapist ownership, applies business validation, and shields controllers from
    /// PostgREST-specific exceptions.
    /// </summary>
    public sealed class VisitService : IVisitService
    {
        private readonly ISupabaseClientFactory clientFactory;
        private readonly ILogger<VisitService> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="VisitService"/> class.
        /// </summary>
        /// <param name="clientFactory">Factory used to obtain Supabase clients on demand.</param>
        /// <param name="logger">Logs validation and persistence events.</param>
        public VisitService(ISupabaseClientFactory clientFactory, ILogger<VisitService> logger)
        {
            ArgumentNullException.ThrowIfNull(clientFactory);
            ArgumentNullException.ThrowIfNull(logger);

            this.clientFactory = clientFactory;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<VisitDto> CreateAsync(Guid therapistId, Guid patientId, VisitCreateCommand command, CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidatePatientId(patientId);
            ArgumentNullException.ThrowIfNull(command);

            var utcNow = DateTimeOffset.UtcNow;
            DateTimeOffset? visitDateCandidate = command.VisitDate == default ? null : command.VisitDate;
            var normalizedVisitDate = VisitValidation.NormalizeVisitDate(visitDateCandidate, utcNow);
            var normalizedInterview = VisitValidation.NormalizeOptionalContent(command.Interview, "interview");
            var normalizedDescription = VisitValidation.NormalizeOptionalContent(command.Description, "description");
            var normalizedRecommendations = VisitValidation.NormalizeOptionalContent(command.Recommendations, "recommendations");

            VisitValidation.EnsureAnyContentProvided(normalizedInterview, normalizedDescription, normalizedRecommendations);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            await EnsurePatientOwnershipAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);

            var payload = new Visit
            {
                PatientId = patientId,
                VisitDate = normalizedVisitDate,
                Interview = normalizedInterview,
                Description = normalizedDescription,
                Recommendations = normalizedRecommendations,
                RecommendationsGeneratedByAi = false,
                RecommendationsGeneratedAt = null
            };

            Visit createdVisit;

            try
            {
                var insertResponse = await client
                    .From<Visit>()
                    .Insert(payload, new QueryOptions { Returning = QueryOptions.ReturnType.Representation }, cancellationToken)
                    .ConfigureAwait(false);

                createdVisit = insertResponse.Models?.FirstOrDefault()
                    ?? throw new ApiException(StatusCodes.Status502BadGateway, "visit_create_failed");
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(
                    postgrestException,
                    "Supabase visit creation failed for patient {PatientId} (therapist {TherapistId}).",
                    patientId,
                    therapistId);

                throw new ApiException(StatusCodes.Status502BadGateway, "visit_create_failed", postgrestException);
            }

            var refreshed = await FetchVisitAsync(client, createdVisit.Id, cancellationToken).ConfigureAwait(false);
            var dto = VisitDto.FromEntity(refreshed, 0, null);
            return dto;
        }

        /// <inheritdoc />
        public async Task<PaginatedResponseDto<VisitDto>> ListAsync(
            Guid therapistId,
            Guid patientId,
            int page,
            int pageSize,
            DateTimeOffset? from,
            DateTimeOffset? to,
            bool includeRecommendations,
            string order,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidatePatientId(patientId);

            var (normalizedPage, normalizedPageSize, normalizedFrom, normalizedTo, normalizedIncludeRecommendations, normalizedOrder) =
                VisitValidation.NormalizeListOptions(page, pageSize, from, to, includeRecommendations, order);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            await EnsurePatientOwnershipAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);

            var startIndex = (normalizedPage - 1) * normalizedPageSize;

            var query = client
                .From<Visit>()
                .Filter("patient_id", PostgrestOperator.Equals, patientId.ToString());

            if (normalizedFrom.HasValue)
            {
                query = query.Filter("visit_date", PostgrestOperator.GreaterThanOrEqual, normalizedFrom.Value.ToString("O"));
            }

            if (normalizedTo.HasValue)
            {
                query = query.Filter("visit_date", PostgrestOperator.LessThanOrEqual, normalizedTo.Value.ToString("O"));
            }

            var ordering = normalizedOrder == VisitValidation.OrderAscending ? PostgrestOrdering.Ascending : PostgrestOrdering.Descending;

            var response = await query
                .Order("visit_date", ordering)
                .Get(cancellationToken)
                .ConfigureAwait(false);

            var allVisits = response.Models ?? new List<Visit>();
            var totalItems = allVisits.Count;
            var totalPages = CalculateTotalPages(totalItems, normalizedPageSize);

            if (totalItems == 0)
            {
                return PaginatedResponseDto<VisitDto>.From([], normalizedPage, normalizedPageSize, totalItems, totalPages);
            }

            var pagedVisits = allVisits
                .Skip(startIndex)
                .Take(normalizedPageSize)
                .ToList();

            var visitIds = pagedVisits.Select(static visit => visit.Id).ToList();
            var aiMetadata = await FetchAiMetadataAsync(client, visitIds, cancellationToken).ConfigureAwait(false);

            var items = new List<VisitDto>(pagedVisits.Count);

            foreach (var visit in pagedVisits)
            {
                aiMetadata.TryGetValue(visit.Id, out var aggregate);

                var dto = VisitDto.FromEntity(
                    visit,
                    aggregate?.Count,
                    aggregate?.LatestGenerationId);

                if (!normalizedIncludeRecommendations)
                {
                    dto.Recommendations = null;
                }

                items.Add(dto);
            }

            return PaginatedResponseDto<VisitDto>.From(new ReadOnlyCollection<VisitDto>(items), normalizedPage, normalizedPageSize, totalItems, totalPages);
        }

        /// <inheritdoc />
        public async Task<VisitDto> GetAsync(Guid therapistId, Guid visitId, CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var (visit, _) = await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            var metadata = await FetchAiMetadataAsync(client, new[] { visit.Id }, cancellationToken).ConfigureAwait(false);
            metadata.TryGetValue(visit.Id, out var aggregate);

            return VisitDto.FromEntity(visit, aggregate?.Count, aggregate?.LatestGenerationId);
        }

        /// <inheritdoc />
        public async Task<VisitDto> UpdateAsync(
            Guid therapistId,
            Guid visitId,
            VisitUpdateCommand command,
            DateTimeOffset expectedTimestamp,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);
            ArgumentNullException.ThrowIfNull(command);

            if (expectedTimestamp == default)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_if_match");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var (currentVisit, _) = await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            if (!IsMatch(expectedTimestamp, currentVisit.UpdatedAt))
            {
                logger.LogWarning(
                    "Weak ETag mismatch detected for visit {VisitId} (therapist {TherapistId}). Provided: {Expected}. Actual: {Actual}.",
                    visitId,
                    therapistId,
                    expectedTimestamp,
                    currentVisit.UpdatedAt);

                throw new ApiException(StatusCodes.Status409Conflict, "etag_mismatch");
            }

            var utcNow = DateTimeOffset.UtcNow;
            var normalizedVisitDate = command.VisitDate.HasValue
                ? VisitValidation.NormalizeVisitDate(command.VisitDate, utcNow)
                : currentVisit.VisitDate;

            var normalizedInterview = command.Interview is not null
                ? VisitValidation.NormalizeOptionalContent(command.Interview, "interview")
                : currentVisit.Interview;

            var normalizedDescription = command.Description is not null
                ? VisitValidation.NormalizeOptionalContent(command.Description, "description")
                : currentVisit.Description;

            VisitValidation.EnsureAnyContentProvided(normalizedInterview, normalizedDescription, currentVisit.Recommendations);

            var hasChanges = !IsSameTimestamp(currentVisit.VisitDate, normalizedVisitDate)
                || !AreEqual(currentVisit.Interview, normalizedInterview)
                || !AreEqual(currentVisit.Description, normalizedDescription);

            if (!hasChanges)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "no_changes_submitted");
            }

            var payload = new Visit
            {
                Id = currentVisit.Id,
                PatientId = currentVisit.PatientId,
                VisitDate = normalizedVisitDate,
                Interview = normalizedInterview,
                Description = normalizedDescription,
                Recommendations = currentVisit.Recommendations,
                RecommendationsGeneratedByAi = currentVisit.RecommendationsGeneratedByAi,
                RecommendationsGeneratedAt = currentVisit.RecommendationsGeneratedAt
            };

            try
            {
                await client
                    .From<Visit>()
                    .Update(payload, cancellationToken: cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(
                    postgrestException,
                    "Supabase visit update failed for {VisitId} (therapist {TherapistId}).",
                    visitId,
                    therapistId);

                throw new ApiException(StatusCodes.Status502BadGateway, "visit_update_failed", postgrestException);
            }

            var refreshed = await FetchVisitAsync(client, currentVisit.Id, cancellationToken).ConfigureAwait(false);
            var metadata = await FetchAiMetadataAsync(client, new[] { refreshed.Id }, cancellationToken).ConfigureAwait(false);
            metadata.TryGetValue(refreshed.Id, out var aggregate);

            return VisitDto.FromEntity(refreshed, aggregate?.Count, aggregate?.LatestGenerationId);
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid therapistId, Guid visitId, CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var (visit, _) = await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            try
            {
                await client
                    .From<Visit>()
                    .Filter("id", PostgrestOperator.Equals, visit.Id.ToString())
                    .Filter("patient_id", PostgrestOperator.Equals, visit.PatientId.ToString())
                    .Delete(cancellationToken: cancellationToken)
                    .ConfigureAwait(false);

                logger.LogDebug(
                    "Supabase visit delete executed for {VisitId} (patient {PatientId}, therapist {TherapistId}).",
                    visitId,
                    visit.PatientId,
                    therapistId);
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(
                    postgrestException,
                    "Supabase visit delete failed for {VisitId} (therapist {TherapistId}).",
                    visitId,
                    therapistId);

                throw new ApiException(StatusCodes.Status502BadGateway, "visit_delete_failed", postgrestException);
            }
        }

        /// <inheritdoc />
        public async Task<VisitRecommendationStateDto> SaveRecommendationsAsync(
            Guid therapistId,
            Guid visitId,
            VisitRecommendationCommand command,
            DateTimeOffset expectedTimestamp,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);
            ArgumentNullException.ThrowIfNull(command);

            if (expectedTimestamp == default)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_if_match");
            }

            var normalizedRecommendations = VisitValidation.NormalizeRequiredRecommendation(command.Recommendations);
            VisitValidation.ValidateSourceGeneration(command.SourceGenerationId, command.AiGenerated);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var (currentVisit, _) = await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            if (!IsMatch(expectedTimestamp, currentVisit.UpdatedAt))
            {
                logger.LogWarning(
                    "Weak ETag mismatch detected for visit {VisitId} during recommendation save (therapist {TherapistId}). Provided: {Expected}. Actual: {Actual}.",
                    visitId,
                    therapistId,
                    expectedTimestamp,
                    currentVisit.UpdatedAt);

                throw new ApiException(StatusCodes.Status409Conflict, "etag_mismatch");
            }

            Guid? sourceGenerationId = command.SourceGenerationId;

            if (command.AiGenerated && sourceGenerationId.HasValue)
            {
                await EnsureGenerationOwnershipAsync(client, therapistId, visitId, sourceGenerationId.Value, cancellationToken).ConfigureAwait(false);
            }

            DateTimeOffset? normalizedGeneratedAt = command.AiGenerated ? DateTimeOffset.UtcNow : null;
            var hasChanges = !AreEqual(currentVisit.Recommendations, normalizedRecommendations)
                || currentVisit.RecommendationsGeneratedByAi != command.AiGenerated
                || !IsSameNullableTimestamp(currentVisit.RecommendationsGeneratedAt, normalizedGeneratedAt);

            if (!hasChanges)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "no_changes_submitted");
            }

            if (!command.AiGenerated)
            {
                sourceGenerationId = null;
            }

            var payload = new Visit
            {
                Id = currentVisit.Id,
                PatientId = currentVisit.PatientId,
                VisitDate = currentVisit.VisitDate,
                Interview = currentVisit.Interview,
                Description = currentVisit.Description,
                Recommendations = normalizedRecommendations,
                RecommendationsGeneratedByAi = command.AiGenerated,
                RecommendationsGeneratedAt = normalizedGeneratedAt
            };

            try
            {
                await client
                    .From<Visit>()
                    .Update(payload, cancellationToken: cancellationToken)
                    .ConfigureAwait(false);
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(
                    postgrestException,
                    "Supabase recommendation save failed for {VisitId} (therapist {TherapistId}).",
                    visitId,
                    therapistId);

                throw new ApiException(StatusCodes.Status502BadGateway, "visit_recommendations_failed", postgrestException);
            }

            var refreshed = await FetchVisitAsync(client, currentVisit.Id, cancellationToken).ConfigureAwait(false);
            return VisitRecommendationStateDto.FromVisit(refreshed);
        }

        private static void ValidateTherapistId(Guid therapistId)
        {
            if (therapistId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_user_identifier");
            }
        }

        private static void ValidatePatientId(Guid patientId)
        {
            if (patientId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_patient_id");
            }
        }

        private static void ValidateVisitId(Guid visitId)
        {
            if (visitId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_visit_id");
            }
        }

        private async Task<Patient> EnsurePatientOwnershipAsync(
            SupabaseClient client,
            Guid therapistId,
            Guid patientId,
            CancellationToken cancellationToken)
        {
            try
            {
                var patient = await client
                    .From<Patient>()
                    .Filter("id", PostgrestOperator.Equals, patientId.ToString())
                    .Filter("therapist_id", PostgrestOperator.Equals, therapistId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (patient is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "patient_missing");
                }

                return patient;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(
                    postgrestException,
                    "Supabase patient ownership validation failed for {PatientId} (therapist {TherapistId}).",
                    patientId,
                    therapistId);

                var exists = await DoesPatientExistAsync(client, patientId, cancellationToken).ConfigureAwait(false);

                if (exists)
                {
                    throw new ApiException(StatusCodes.Status403Forbidden, "patient_not_owned", postgrestException);
                }

                throw new ApiException(StatusCodes.Status404NotFound, "patient_missing", postgrestException);
            }
        }

        private async Task<(Visit Visit, Patient Patient)> FetchVisitWithOwnershipAsync(
            SupabaseClient client,
            Guid therapistId,
            Guid visitId,
            CancellationToken cancellationToken)
        {
            var visit = await FetchVisitAsync(client, visitId, cancellationToken).ConfigureAwait(false);
            var patient = await EnsurePatientOwnershipAsync(client, therapistId, visit.PatientId, cancellationToken).ConfigureAwait(false);
            return (visit, patient);
        }

        private async Task<Visit> FetchVisitAsync(SupabaseClient client, Guid visitId, CancellationToken cancellationToken)
        {
            try
            {
                var visit = await client
                    .From<Visit>()
                    .Filter("id", PostgrestOperator.Equals, visitId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (visit is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "visit_missing");
                }

                return visit;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(postgrestException, "Supabase visit lookup failed for {VisitId}.", visitId);
                throw new ApiException(StatusCodes.Status404NotFound, "visit_missing", postgrestException);
            }
        }

        private async Task EnsureGenerationOwnershipAsync(
            SupabaseClient client,
            Guid therapistId,
            Guid visitId,
            Guid generationId,
            CancellationToken cancellationToken)
        {
            try
            {
                var generation = await client
                    .From<VisitAiGeneration>()
                    .Filter("id", PostgrestOperator.Equals, generationId.ToString())
                    .Filter("visit_id", PostgrestOperator.Equals, visitId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (generation is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "ai_generation_missing");
                }

                if (generation.TherapistId != therapistId)
                {
                    throw new ApiException(StatusCodes.Status403Forbidden, "visit_not_owned");
                }
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(
                    postgrestException,
                    "Supabase AI generation lookup failed for {GenerationId} (visit {VisitId}, therapist {TherapistId}).",
                    generationId,
                    visitId,
                    therapistId);

                throw new ApiException(StatusCodes.Status404NotFound, "ai_generation_missing", postgrestException);
            }
        }

        private async Task<IReadOnlyDictionary<Guid, VisitAiAggregate>> FetchAiMetadataAsync(
            SupabaseClient client,
            IReadOnlyCollection<Guid> visitIds,
            CancellationToken cancellationToken)
        {
            if (visitIds.Count == 0)
            {
                return new Dictionary<Guid, VisitAiAggregate>();
            }

            var filterValues = visitIds.Select(static id => id.ToString()).ToArray();

            var response = await client
                .From<VisitAiGeneration>()
                .Filter("visit_id", PostgrestOperator.In, filterValues)
                .Order("created_at", PostgrestOrdering.Descending)
                .Get(cancellationToken)
                .ConfigureAwait(false);

            var models = response.Models ?? new List<VisitAiGeneration>();
            var aggregates = new Dictionary<Guid, VisitAiAggregate>(visitIds.Count);

            foreach (var generation in models)
            {
                if (!aggregates.TryGetValue(generation.VisitId, out var existing))
                {
                    aggregates[generation.VisitId] = new VisitAiAggregate(1, generation.Id);
                    continue;
                }

                aggregates[generation.VisitId] = existing with { Count = existing.Count + 1 };
            }

            return aggregates;
        }

        private static int CalculateTotalPages(int totalItems, int pageSize)
        {
            if (pageSize <= 0 || totalItems == 0)
            {
                return 0;
            }

            return (int)Math.Ceiling(totalItems / (double)pageSize);
        }

        private static bool AreEqual(string? left, string? right)
        {
            return string.Equals(left, right, StringComparison.Ordinal);
        }

        private static bool IsSameTimestamp(DateTimeOffset left, DateTimeOffset right)
        {
            return left.ToUniversalTime() == right.ToUniversalTime();
        }

        private static bool IsSameNullableTimestamp(DateTimeOffset? left, DateTimeOffset? right)
        {
            if (left is null && right is null)
            {
                return true;
            }

            if (left is null || right is null)
            {
                return false;
            }

            return left.Value.ToUniversalTime() == right.Value.ToUniversalTime();
        }

        private static bool IsMatch(DateTimeOffset expected, DateTimeOffset actual)
        {
            return expected.ToUniversalTime().Equals(actual.ToUniversalTime());
        }

        private async Task<bool> DoesPatientExistAsync(
            SupabaseClient client,
            Guid patientId,
            CancellationToken cancellationToken)
        {
            try
            {
                var response = await client
                    .From<Patient>()
                    .Filter("id", PostgrestOperator.Equals, patientId.ToString())
                    .Limit(1)
                    .Get(cancellationToken)
                    .ConfigureAwait(false);

                return response.Models is not null && response.Models.Count > 0;
            }
            catch (PostgrestException)
            {
                return false;
            }
        }

        private sealed record VisitAiAggregate(int Count, Guid? LatestGenerationId);
    }
}
