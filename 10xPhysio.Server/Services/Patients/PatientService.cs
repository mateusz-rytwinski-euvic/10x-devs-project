using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Patients;
using _10xPhysio.Server.Models.Dto.Visits;
using _10xPhysio.Server.Services.Supabase;

using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using Supabase.Postgrest.Interfaces;

using System.Collections.ObjectModel;

using PostgrestOperator = Supabase.Postgrest.Constants.Operator;
using PostgrestOrdering = Supabase.Postgrest.Constants.Ordering;
using SupabaseClient = Supabase.Client;

namespace _10xPhysio.Server.Services.Patients
{
    /// <summary>
    /// Coordinates Supabase Postgrest interactions required to expose patient CRUD operations with therapist scoping,
    /// validation, and optimistic concurrency protection.
    /// </summary>
    public sealed class PatientService : IPatientService
    {
        private readonly ISupabaseClientFactory clientFactory;
        private readonly ILogger<PatientService> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PatientService"/> class.
        /// </summary>
        /// <param name="clientFactory">Factory used to obtain Supabase clients on demand.</param>
        /// <param name="logger">Logs validation and persistence events.</param>
        public PatientService(ISupabaseClientFactory clientFactory, ILogger<PatientService> logger)
        {
            ArgumentNullException.ThrowIfNull(clientFactory);
            ArgumentNullException.ThrowIfNull(logger);

            this.clientFactory = clientFactory;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<PatientDto> CreateAsync(Guid therapistId, PatientCreateCommand command, CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ArgumentNullException.ThrowIfNull(command);

            var normalizedFirstName = PatientValidation.NormalizeName(command.FirstName, "first_name");
            var normalizedLastName = PatientValidation.NormalizeName(command.LastName, "last_name");
            var normalizedDateOfBirth = PatientValidation.NormalizeDateOfBirth(command.DateOfBirth);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            await EnsureDuplicateDoesNotExistAsync(
                client,
                therapistId,
                normalizedFirstName,
                normalizedLastName,
                normalizedDateOfBirth,
                cancellationToken).ConfigureAwait(false);

            var payload = new Patient
            {
                TherapistId = therapistId,
                FirstName = normalizedFirstName,
                LastName = normalizedLastName,
                DateOfBirth = normalizedDateOfBirth,
            };

            try
            {
                var response = await client
                    .From<Patient>()
                    .Insert(payload, new QueryOptions { Returning = QueryOptions.ReturnType.Representation }, cancellationToken)
                    .ConfigureAwait(false);

                var created = response.Models?.FirstOrDefault();

                if (created is null)
                {
                    logger.LogError("Supabase patient creation returned no representation for therapist {TherapistId}.", therapistId);
                    throw new ApiException(StatusCodes.Status502BadGateway, "patient_create_failed");
                }

                // Supabase's PostgREST client merges insert responses into the payload instance which leaves
                // trigger-populated columns (created_at/updated_at) at their default sentinel values. Reload the
                // patient to hydrate the database-generated timestamps before returning the DTO.
                var refreshed = await FetchPatientAsync(client, therapistId, created.Id, cancellationToken).ConfigureAwait(false);

                return PatientDto.FromEntity(refreshed);
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(postgrestException, "Supabase patient creation failed for therapist {TherapistId}.", therapistId);

                if (IsUniqueConstraintViolation(postgrestException))
                {
                    throw new ApiException(StatusCodes.Status409Conflict, "patient_duplicate", postgrestException);
                }

                throw new ApiException(StatusCodes.Status502BadGateway, "patient_create_failed", postgrestException);
            }
        }

        /// <inheritdoc />
        public async Task<PaginatedResponseDto<PatientListItemDto>> ListAsync(
            Guid therapistId,
            int page,
            int pageSize,
            string? search,
            string sort,
            string order,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);

            if (page < 1)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "page_invalid");
            }

            if (pageSize is < 1 or > 100)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "page_size_invalid");
            }

            var normalizedSort = PatientValidation.NormalizeSort(sort);
            var normalizedOrder = PatientValidation.NormalizeOrder(order, normalizedSort);
            var normalizedSearch = PatientValidation.NormalizeSearch(search);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var baseQuery = client
                .From<Patient>()
                .Filter("therapist_id", PostgrestOperator.Equals, therapistId.ToString());

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                var likePattern = FormattableString.Invariant($"%{normalizedSearch}%");
                var orFilters = new List<IPostgrestQueryFilter>
                {
                    new QueryFilter("first_name", PostgrestOperator.ILike, likePattern),
                    new QueryFilter("last_name", PostgrestOperator.ILike, likePattern)
                };

                baseQuery = baseQuery.Or(orFilters);
            }

            var response = await baseQuery
                .Get()
                .ConfigureAwait(false);

            var allPatients = response.Models ?? new List<Patient>();
            var totalItems = allPatients.Count;

            if (totalItems == 0)
            {
                return PaginatedResponseDto<PatientListItemDto>.From([], page, pageSize, 0, 0);
            }

            Dictionary<Guid, VisitAggregate> aggregatesForOrdering = [];
            List<Patient> orderedPatients;

            if (normalizedSort == PatientValidation.SortLatestVisitDate)
            {
                aggregatesForOrdering = await FetchVisitAggregatesAsync(client, allPatients.Select(static patient => patient.Id), cancellationToken)
                    .ConfigureAwait(false);

                orderedPatients = normalizedOrder == PatientValidation.OrderAscending
                    ? allPatients
                        .OrderBy(patient => aggregatesForOrdering.TryGetValue(patient.Id, out var aggregate) ? aggregate.LatestVisit : null)
                        .ThenBy(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(patient => patient.CreatedAt)
                        .ToList()
                    : allPatients
                        .OrderByDescending(patient => aggregatesForOrdering.TryGetValue(patient.Id, out var aggregate) ? aggregate.LatestVisit : null)
                        .ThenByDescending(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenByDescending(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ThenByDescending(patient => patient.CreatedAt)
                        .ToList();
            }
            else if (normalizedSort == PatientValidation.SortCreatedAt)
            {
                orderedPatients = normalizedOrder == PatientValidation.OrderAscending
                    ? allPatients
                        .OrderBy(patient => patient.CreatedAt)
                        .ThenBy(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ToList()
                    : allPatients
                        .OrderByDescending(patient => patient.CreatedAt)
                        .ThenByDescending(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenByDescending(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ToList();
            }
            else
            {
                orderedPatients = normalizedOrder == PatientValidation.OrderAscending
                    ? allPatients
                        .OrderBy(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(patient => patient.CreatedAt)
                        .ToList()
                    : allPatients
                        .OrderByDescending(patient => patient.LastName, StringComparer.OrdinalIgnoreCase)
                        .ThenByDescending(patient => patient.FirstName, StringComparer.OrdinalIgnoreCase)
                        .ThenByDescending(patient => patient.CreatedAt)
                        .ToList();
            }

            var pagedPatients = orderedPatients
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            Dictionary<Guid, VisitAggregate> visitAggregates;

            if (normalizedSort == PatientValidation.SortLatestVisitDate)
            {
                visitAggregates = FilterAggregatesForPage(aggregatesForOrdering, pagedPatients);
            }
            else
            {
                visitAggregates = await FetchVisitAggregatesAsync(client, pagedPatients.Select(static patient => patient.Id), cancellationToken)
                    .ConfigureAwait(false);
            }

            return PaginatedResponseDto<PatientListItemDto>.From(
                BuildPatientListItems(pagedPatients, visitAggregates),
                page,
                pageSize,
                totalItems,
                CalculateTotalPages(totalItems, pageSize));
        }

        /// <inheritdoc />
        public async Task<PatientDetailsDto> GetAsync(
            Guid therapistId,
            Guid patientId,
            bool includeVisits,
            int? visitsLimit,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);

            if (patientId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_patient_id");
            }

            if (includeVisits)
            {
                if (visitsLimit is null)
                {
                    visitsLimit = 5;
                }

                if (visitsLimit is < 1 or > 20)
                {
                    throw new ApiException(StatusCodes.Status400BadRequest, "visits_limit_invalid");
                }
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var patient = await FetchPatientAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);

            IReadOnlyList<VisitSummaryDto>? visits = null;

            if (includeVisits)
            {
                var visitsResponse = await client
                    .From<Visit>()
                    .Filter("patient_id", PostgrestOperator.Equals, patientId.ToString())
                    .Order("visit_date", PostgrestOrdering.Descending)
                    .Range(0, (visitsLimit ?? 5) - 1)
                    .Get(cancellationToken)
                    .ConfigureAwait(false);

                var models = visitsResponse.Models ?? new List<Visit>();
                visits = new ReadOnlyCollection<VisitSummaryDto>(models.Select(VisitSummaryDto.FromEntity).ToList());
            }

            return PatientDetailsDto.FromEntity(patient, visits);
        }

        /// <inheritdoc />
        public async Task<PatientDto> UpdateAsync(
            Guid therapistId,
            Guid patientId,
            PatientUpdateCommand command,
            string ifMatch,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);

            if (patientId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_patient_id");
            }

            ArgumentNullException.ThrowIfNull(command);

            if (string.IsNullOrWhiteSpace(ifMatch))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "missing_if_match");
            }

            if (!WeakEtag.TryParse(ifMatch, out var expectedTimestamp))
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_if_match");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var patient = await FetchPatientAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);

            if (!IsMatch(expectedTimestamp, patient.UpdatedAt))
            {
                logger.LogWarning(
                    "Weak ETag mismatch detected for patient {PatientId} (therapist {TherapistId}). Provided: {Expected}. Actual: {Actual}.",
                    patientId,
                    therapistId,
                    expectedTimestamp,
                    patient.UpdatedAt);

                throw new ApiException(StatusCodes.Status409Conflict, "etag_mismatch");
            }

            var normalizedFirstName = PatientValidation.NormalizeName(command.FirstName, "first_name");
            var normalizedLastName = PatientValidation.NormalizeName(command.LastName, "last_name");
            var normalizedDateOfBirth = PatientValidation.NormalizeDateOfBirth(command.DateOfBirth);

            var hasChanges = !string.Equals(patient.FirstName, normalizedFirstName, StringComparison.Ordinal)
                || !string.Equals(patient.LastName, normalizedLastName, StringComparison.Ordinal)
                || !NullableDateTimeEquals(patient.DateOfBirth, normalizedDateOfBirth);

            if (!hasChanges)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "no_changes_submitted");
            }

            if (!string.Equals(patient.FirstName, normalizedFirstName, StringComparison.Ordinal)
                || !string.Equals(patient.LastName, normalizedLastName, StringComparison.Ordinal)
                || !NullableDateTimeEquals(patient.DateOfBirth, normalizedDateOfBirth))
            {
                await EnsureDuplicateDoesNotExistAsync(
                    client,
                    therapistId,
                    normalizedFirstName,
                    normalizedLastName,
                    normalizedDateOfBirth,
                    cancellationToken).ConfigureAwait(false);
            }

            var payload = new Patient
            {
                Id = patient.Id,
                TherapistId = therapistId,
                FirstName = normalizedFirstName,
                LastName = normalizedLastName,
                DateOfBirth = normalizedDateOfBirth
            };

            try
            {
                var response = await client
                    .From<Patient>()
                    .Update(payload, cancellationToken: cancellationToken)
                    .ConfigureAwait(false);

                if (response.Models is null || response.Models.Count == 0)
                {
                    logger.LogWarning(
                        "Supabase patient update affected no rows for {PatientId} (therapist {TherapistId}).",
                        patientId,
                        therapistId);

                    throw new ApiException(StatusCodes.Status404NotFound, "patient_missing");
                }
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(postgrestException, "Supabase patient update failed for {PatientId} (therapist {TherapistId}).", patientId, therapistId);

                if (IsUniqueConstraintViolation(postgrestException))
                {
                    throw new ApiException(StatusCodes.Status409Conflict, "patient_duplicate", postgrestException);
                }

                throw new ApiException(StatusCodes.Status502BadGateway, "patient_update_failed", postgrestException);
            }

            var refreshedPatient = await FetchPatientAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);
            return PatientDto.FromEntity(refreshedPatient);
        }

        /// <inheritdoc />
        public async Task DeleteAsync(Guid therapistId, Guid patientId, CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);

            if (patientId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_patient_id");
            }

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);

            // Ensure the patient exists and belongs to the therapist before issuing the delete statement so that we can
            // surface a consistent 404 response when the identifier is invalid or cross-tenant.
            await FetchPatientAsync(client, therapistId, patientId, cancellationToken).ConfigureAwait(false);

            try
            {
                await client
                    .From<Patient>()
                    .Filter("id", PostgrestOperator.Equals, patientId.ToString())
                    .Filter("therapist_id", PostgrestOperator.Equals, therapistId.ToString())
                    .Delete(cancellationToken: cancellationToken)
                    .ConfigureAwait(false);

                // Postgrest returns an empty payload for deletes unless Prefer: return=representation is set. We rely on
                // the pre-fetch above for ownership enforcement instead of toggling return representation.
                logger.LogDebug("Supabase patient delete executed for {PatientId} (therapist {TherapistId}).", patientId, therapistId);
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(postgrestException, "Supabase patient delete failed for {PatientId} (therapist {TherapistId}).", patientId, therapistId);
                throw new ApiException(StatusCodes.Status502BadGateway, "patient_delete_failed", postgrestException);
            }
        }

        private async Task EnsureDuplicateDoesNotExistAsync(
            SupabaseClient client,
            Guid therapistId,
            string firstName,
            string lastName,
            DateTime? dateOfBirth,
            CancellationToken cancellationToken)
        {
            var query = client
                .From<Patient>()
                .Filter("therapist_id", PostgrestOperator.Equals, therapistId.ToString())
                .Filter("first_name", PostgrestOperator.ILike, firstName)
                .Filter("last_name", PostgrestOperator.ILike, lastName);

            query = dateOfBirth.HasValue
                ? query.Filter("date_of_birth", PostgrestOperator.Equals, dateOfBirth.Value.ToUniversalTime().ToString("O"))
                : query.Filter("date_of_birth", PostgrestOperator.Is, "null");

            var response = await query
                .Limit(1)
                .Get(cancellationToken: cancellationToken)
                .ConfigureAwait(false);

            if (response.Models is not null && response.Models.Count > 0)
            {
                throw new ApiException(StatusCodes.Status409Conflict, "patient_duplicate");
            }
        }

        private static void ValidateTherapistId(Guid therapistId)
        {
            if (therapistId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_user_identifier");
            }
        }

        private async Task<Patient> FetchPatientAsync(SupabaseClient client, Guid therapistId, Guid patientId, CancellationToken cancellationToken)
        {
            try
            {
                var result = await client
                    .From<Patient>()
                    .Filter("id", PostgrestOperator.Equals, patientId.ToString())
                    .Filter("therapist_id", PostgrestOperator.Equals, therapistId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (result is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "patient_missing");
                }

                return result;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(
                    postgrestException,
                    "Supabase patient lookup failed for {PatientId} (therapist {TherapistId}).",
                    patientId,
                    therapistId);

                throw new ApiException(StatusCodes.Status404NotFound, "patient_missing", postgrestException);
            }
        }

        private async Task<Dictionary<Guid, VisitAggregate>> FetchVisitAggregatesAsync(
            SupabaseClient client,
            IEnumerable<Guid> patientIds,
            CancellationToken cancellationToken)
        {
            var identifiers = patientIds.Distinct().ToList();

            if (identifiers.Count == 0)
            {
                return new Dictionary<Guid, VisitAggregate>();
            }

            var patientIdCriteria = identifiers
                .Select(static id => id.ToString())
                .ToArray();

            var response = await client
                .From<Visit>()
                .Filter("patient_id", PostgrestOperator.In, patientIdCriteria)
                .Select("patient_id, visit_date")
                .Get(cancellationToken)
                .ConfigureAwait(false);

            var aggregates = new Dictionary<Guid, VisitAggregate>();

            if (response.Models is null)
            {
                return aggregates;
            }

            foreach (var visit in response.Models)
            {
                if (!aggregates.TryGetValue(visit.PatientId, out var aggregate))
                {
                    aggregates[visit.PatientId] = new VisitAggregate(visit.VisitDate, 1);
                    continue;
                }

                var latest = aggregate.LatestVisit.HasValue && aggregate.LatestVisit.Value > visit.VisitDate
                    ? aggregate.LatestVisit
                    : visit.VisitDate;

                aggregates[visit.PatientId] = new VisitAggregate(latest, aggregate.VisitCount + 1);
            }

            return aggregates;
        }

        private static Dictionary<Guid, VisitAggregate> FilterAggregatesForPage(
            IReadOnlyDictionary<Guid, VisitAggregate> aggregates,
            IReadOnlyCollection<Patient> patients)
        {
            if (aggregates.Count == 0 || patients.Count == 0)
            {
                return new Dictionary<Guid, VisitAggregate>();
            }

            var result = new Dictionary<Guid, VisitAggregate>(patients.Count);

            foreach (var patient in patients)
            {
                if (aggregates.TryGetValue(patient.Id, out var aggregate))
                {
                    result[patient.Id] = aggregate;
                }
            }

            return result;
        }

        private static IReadOnlyList<PatientListItemDto> BuildPatientListItems(
            IReadOnlyList<Patient> patients,
            IReadOnlyDictionary<Guid, VisitAggregate> aggregates)
        {
            var items = new List<PatientListItemDto>(patients.Count);

            foreach (var patient in patients)
            {
                if (!aggregates.TryGetValue(patient.Id, out var aggregate))
                {
                    items.Add(PatientListItemDto.FromEntity(patient, null, 0));
                    continue;
                }

                items.Add(PatientListItemDto.FromEntity(patient, aggregate.LatestVisit, aggregate.VisitCount));
            }

            return new ReadOnlyCollection<PatientListItemDto>(items);
        }

        private static bool IsUniqueConstraintViolation(PostgrestException postgrestException)
        {
            var message = postgrestException.Message ?? string.Empty;
            return message.Contains("uq_patients_name_dob", StringComparison.OrdinalIgnoreCase);
        }

        private static bool NullableDateTimeEquals(DateTime? left, DateTime? right)
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

        private static int CalculateTotalPages(int totalItems, int pageSize)
        {
            if (pageSize <= 0)
            {
                return 0;
            }

            return (int)Math.Ceiling(totalItems / (double)pageSize);
        }

        private sealed record VisitAggregate(DateTimeOffset? LatestVisit, int VisitCount);
    }
}