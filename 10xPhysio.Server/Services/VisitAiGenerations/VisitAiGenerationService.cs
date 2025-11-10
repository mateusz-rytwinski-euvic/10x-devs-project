using _10xPhysio.Server.Configuration;
using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Extensions;
using _10xPhysio.Server.Models.Database;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.VisitAiGenerations;
using _10xPhysio.Server.Services.Supabase;

using Microsoft.Extensions.Options;

using Supabase.Postgrest.Exceptions;

using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

using PostgrestOperator = Supabase.Postgrest.Constants.Operator;
using PostgrestOrdering = Supabase.Postgrest.Constants.Ordering;
using QueryOptions = Supabase.Postgrest.QueryOptions;
using SupabaseClient = Supabase.Client;

namespace _10xPhysio.Server.Services.VisitAiGenerations
{
    /// <summary>
    /// Coordinates Supabase persistence and AI provider interactions for visit-scoped generation logs. The
    /// implementation validates ownership, normalizes request parameters, and stores compliance artifacts.
    /// </summary>
    public sealed class VisitAiGenerationService : IVisitAiGenerationService
    {
        private const int MaxPageSize = 50;

        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private readonly ISupabaseClientFactory clientFactory;
        private readonly IHttpClientFactory httpClientFactory;
        private readonly IOptions<AiGenerationOptions> optionsAccessor;
        private readonly IAiPromptBuilder promptBuilder;
        private readonly IHttpContextAccessor httpContextAccessor;
        private readonly ILogger<VisitAiGenerationService> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="VisitAiGenerationService"/> class.
        /// </summary>
        /// <param name="clientFactory">Factory used to acquire Supabase clients on demand.</param>
        /// <param name="httpClientFactory">Factory used to create HttpClient instances for the AI provider.</param>
        /// <param name="optionsAccessor">Provides AI generation configuration values.</param>
        /// <param name="promptBuilder">Builds prompts dispatched to the AI provider.</param>
        /// <param name="logger">Logs diagnostic information for AI workflows.</param>
        public VisitAiGenerationService(
            ISupabaseClientFactory clientFactory,
            IHttpClientFactory httpClientFactory,
            IOptions<AiGenerationOptions> optionsAccessor,
            IAiPromptBuilder promptBuilder,
            IHttpContextAccessor httpContextAccessor,
            ILogger<VisitAiGenerationService> logger)
        {
            ArgumentNullException.ThrowIfNull(clientFactory);
            ArgumentNullException.ThrowIfNull(httpClientFactory);
            ArgumentNullException.ThrowIfNull(optionsAccessor);
            ArgumentNullException.ThrowIfNull(promptBuilder);
            ArgumentNullException.ThrowIfNull(httpContextAccessor);
            ArgumentNullException.ThrowIfNull(logger);

            this.clientFactory = clientFactory;
            this.httpClientFactory = httpClientFactory;
            this.optionsAccessor = optionsAccessor;
            this.promptBuilder = promptBuilder;
            this.httpContextAccessor = httpContextAccessor;
            this.logger = logger;
        }

        /// <inheritdoc />
        public async Task<VisitAiGenerationCreatedDto> GenerateAsync(
            Guid therapistId,
            Guid visitId,
            VisitAiGenerationCommand command,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);
            ArgumentNullException.ThrowIfNull(command);

            var options = optionsAccessor.Value;
            var correlationId = GetCorrelationId();

            using var scope = BeginScope(correlationId, therapistId, visitId, command.RegenerateFromGenerationId);
            var stopwatch = Stopwatch.StartNew();

            VisitAiGenerationValidation.ValidateRegenerationSource(command.RegenerateFromGenerationId);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            var visit = await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            VisitAiGenerationValidation.EnsureMinimumContextLength(visit.Interview, visit.Description, options.MinimumContextLength);

            if (command.RegenerateFromGenerationId.HasValue)
            {
                await EnsureGenerationOwnershipAsync(client, therapistId, visitId, command.RegenerateFromGenerationId.Value, cancellationToken).ConfigureAwait(false);
            }

            var resolvedModel = VisitAiGenerationValidation.ResolveModel(command.Model, options);
            var resolvedTemperature = VisitAiGenerationValidation.ResolveTemperature(command.Temperature, options);
            var promptOverrides = VisitAiGenerationValidation.NormalizePromptOverrides(command.PromptOverrides, options);
            var prompt = promptBuilder.BuildPrompt(visit, promptOverrides);

            logger.LogInformation(
                "Dispatching AI generation using model {Model} (temperature={Temperature}). PromptLength={PromptLength}.",
                resolvedModel,
                resolvedTemperature,
                prompt.Length);

            var aiResponse = await InvokeModelAsync(correlationId, resolvedModel, resolvedTemperature, prompt, cancellationToken).ConfigureAwait(false);

            var generation = new VisitAiGeneration
            {
                Id = Guid.NewGuid(),
                VisitId = visitId,
                TherapistId = therapistId,
                Prompt = prompt,
                AiResponse = aiResponse,
                ModelUsed = resolvedModel,
                Temperature = resolvedTemperature,
                CreatedAt = DateTimeOffset.UtcNow
            };

            VisitAiGeneration persisted;

            try
            {
                var insertResponse = await client
                    .From<VisitAiGeneration>()
                    .Insert(generation, new QueryOptions { Returning = QueryOptions.ReturnType.Representation }, cancellationToken)
                    .ConfigureAwait(false);

                persisted = insertResponse.Models?.FirstOrDefault()
                    ?? throw new ApiException(StatusCodes.Status502BadGateway, "ai_generation_persistence_failed");
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogError(
                    postgrestException,
                    "Supabase AI generation insert failed for visit {VisitId} (therapist {TherapistId}).",
                    visitId,
                    therapistId);

                throw new ApiException(StatusCodes.Status502BadGateway, "ai_generation_persistence_failed", postgrestException);
            }

            logger.LogInformation(
                "AI recommendations generated for visit {VisitId} (therapist {TherapistId}) using model {Model} in {ElapsedMilliseconds} ms.",
                visitId,
                therapistId,
                resolvedModel,
                stopwatch.ElapsedMilliseconds);

            return new VisitAiGenerationCreatedDto
            {
                GenerationId = persisted.Id,
                Status = "completed",
                Model = persisted.ModelUsed,
                Temperature = persisted.Temperature,
                Prompt = persisted.Prompt,
                AiResponse = persisted.AiResponse,
                RecommendationsPreview = BuildPreview(persisted.AiResponse),
                CreatedAt = persisted.CreatedAt
            };
        }

        /// <inheritdoc />
        public async Task<PaginatedResponseDto<VisitAiGenerationListItemDto>> ListAsync(
            Guid therapistId,
            Guid visitId,
            int page,
            int pageSize,
            string? order,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);

            if (page < 1)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_pagination");
            }

            if (pageSize < 1)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_pagination");
            }

            var correlationId = GetCorrelationId();
            using var scope = BeginScope(correlationId, therapistId, visitId, null);
            var stopwatch = Stopwatch.StartNew();

            var normalizedPageSize = Math.Min(pageSize, MaxPageSize);
            var normalizedOrder = NormalizeOrder(order);

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            var query = client
                .From<VisitAiGeneration>()
                .Filter("visit_id", PostgrestOperator.Equals, visitId.ToString());

            var ordering = normalizedOrder == "asc" ? PostgrestOrdering.Ascending : PostgrestOrdering.Descending;

            var response = await query
                .Order("created_at", ordering)
                .Get(cancellationToken)
                .ConfigureAwait(false);

            var models = response.Models ?? new List<VisitAiGeneration>();
            var totalItems = models.Count;
            var totalPages = CalculateTotalPages(totalItems, normalizedPageSize);
            var startIndex = (page - 1) * normalizedPageSize;

            var items = models
                .Skip(startIndex)
                .Take(normalizedPageSize)
                .Select(VisitAiGenerationListItemDto.FromEntity)
                .ToList();

            logger.LogInformation(
                "AI generation list returned {Count} items (total={TotalItems}, page={Page}, pageSize={PageSize}, order={Order}) in {ElapsedMilliseconds} ms.",
                items.Count,
                totalItems,
                page,
                normalizedPageSize,
                normalizedOrder,
                stopwatch.ElapsedMilliseconds);

            return PaginatedResponseDto<VisitAiGenerationListItemDto>.From(items, page, normalizedPageSize, totalItems, totalPages);
        }

        /// <inheritdoc />
        public async Task<VisitAiGenerationDetailDto> GetAsync(
            Guid therapistId,
            Guid visitId,
            Guid generationId,
            CancellationToken cancellationToken)
        {
            ValidateTherapistId(therapistId);
            ValidateVisitId(visitId);

            if (generationId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_generation_id");
            }

            var correlationId = GetCorrelationId();
            using var scope = BeginScope(correlationId, therapistId, visitId, generationId);
            var stopwatch = Stopwatch.StartNew();

            var client = await clientFactory.GetClientAsync(cancellationToken).ConfigureAwait(false);
            await FetchVisitWithOwnershipAsync(client, therapistId, visitId, cancellationToken).ConfigureAwait(false);

            var generation = await FetchGenerationAsync(client, visitId, generationId, cancellationToken).ConfigureAwait(false);

            if (generation.TherapistId != therapistId)
            {
                throw new ApiException(StatusCodes.Status403Forbidden, "visit_not_owned");
            }

            logger.LogInformation(
                "AI generation {GenerationId} retrieved in {ElapsedMilliseconds} ms.",
                generationId,
                stopwatch.ElapsedMilliseconds);

            return VisitAiGenerationDetailDto.FromEntity(generation);
        }

        private static void ValidateTherapistId(Guid therapistId)
        {
            if (therapistId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_user_identifier");
            }
        }

        private static void ValidateVisitId(Guid visitId)
        {
            if (visitId == Guid.Empty)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "invalid_visit_id");
            }
        }

        private static int CalculateTotalPages(int totalItems, int pageSize)
        {
            if (pageSize <= 0 || totalItems == 0)
            {
                return 0;
            }

            return (int)Math.Ceiling(totalItems / (double)pageSize);
        }

        private static string NormalizeOrder(string? order)
        {
            if (string.IsNullOrWhiteSpace(order))
            {
                return "desc";
            }

            var normalized = order.Trim().ToLowerInvariant();
            return normalized is "asc" or "desc" ? normalized : "desc";
        }

        private async Task<Visit> FetchVisitAsync(SupabaseClient client, Guid visitId, CancellationToken cancellationToken)
        {
            try
            {
                var response = await client
                    .From<Visit>()
                    .Filter("id", PostgrestOperator.Equals, visitId.ToString())
                    .Single(cancellationToken)
                    .ConfigureAwait(false);

                if (response is null)
                {
                    throw new ApiException(StatusCodes.Status404NotFound, "visit_missing");
                }

                return response;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(postgrestException, "Supabase visit lookup failed for {VisitId}.", visitId);
                throw new ApiException(StatusCodes.Status404NotFound, "visit_missing", postgrestException);
            }
        }

        private async Task<Visit> FetchVisitWithOwnershipAsync(
            SupabaseClient client,
            Guid therapistId,
            Guid visitId,
            CancellationToken cancellationToken)
        {
            var visit = await FetchVisitAsync(client, visitId, cancellationToken).ConfigureAwait(false);
            await EnsurePatientOwnershipAsync(client, therapistId, visit.PatientId, cancellationToken).ConfigureAwait(false);
            return visit;
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
                    throw new ApiException(StatusCodes.Status403Forbidden, "visit_not_owned", postgrestException);
                }

                throw new ApiException(StatusCodes.Status404NotFound, "patient_missing", postgrestException);
            }
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

        private async Task EnsureGenerationOwnershipAsync(
            SupabaseClient client,
            Guid therapistId,
            Guid visitId,
            Guid generationId,
            CancellationToken cancellationToken)
        {
            var generation = await FetchGenerationAsync(client, visitId, generationId, cancellationToken).ConfigureAwait(false);

            if (generation.TherapistId != therapistId)
            {
                throw new ApiException(StatusCodes.Status403Forbidden, "visit_not_owned");
            }
        }

        private async Task<VisitAiGeneration> FetchGenerationAsync(
            SupabaseClient client,
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

                return generation;
            }
            catch (PostgrestException postgrestException)
            {
                logger.LogWarning(
                    postgrestException,
                    "Supabase AI generation lookup failed for {GenerationId} (visit {VisitId}).",
                    generationId,
                    visitId);

                throw new ApiException(StatusCodes.Status404NotFound, "ai_generation_missing", postgrestException);
            }
        }

        private async Task<string> InvokeModelAsync(
            string correlationId,
            string model,
            decimal temperature,
            string prompt,
            CancellationToken cancellationToken)
        {
            var httpClient = httpClientFactory.CreateClient("OpenRouter");

            var request = new ChatCompletionsRequest
            {
                Model = model,
                Temperature = temperature,
                Messages =
                [
                    new ChatMessage { Role = "system", Content = "You are assisting a physiotherapist." },
                    new ChatMessage { Role = "user", Content = prompt }
                ]
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = new StringContent(JsonSerializer.Serialize(request, SerializerOptions), Encoding.UTF8, "application/json")
            };

            httpRequest.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

            var stopwatch = Stopwatch.StartNew();
            HttpResponseMessage response;

            try
            {
                response = await httpClient.SendAsync(httpRequest, cancellationToken).ConfigureAwait(false);
            }
            catch (TaskCanceledException taskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogError(taskCanceledException, "OpenRouter request timed out for model {Model}.", model);
                throw new ApiException(StatusCodes.Status502BadGateway, "model_provider_unavailable", taskCanceledException);
            }
            catch (HttpRequestException httpRequestException)
            {
                logger.LogError(httpRequestException, "OpenRouter request failed for model {Model}.", model);
                throw new ApiException(StatusCodes.Status502BadGateway, "model_provider_unavailable", httpRequestException);
            }

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                logger.LogWarning("OpenRouter rate limit hit for model {Model}.", model);
                throw new ApiException(StatusCodes.Status429TooManyRequests, "ai_rate_limited");
            }

            if (!response.IsSuccessStatusCode)
            {
                var code = (int)response.StatusCode;
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

                logger.LogError(
                    "OpenRouter request returned {StatusCode} for model {Model}. Payload: {Payload}",
                    code,
                    model,
                    errorBody);

                var isProviderIssue = response.StatusCode >= HttpStatusCode.InternalServerError;
                var message = isProviderIssue ? "model_provider_unavailable" : "ai_generation_failed";
                var mappedStatus = isProviderIssue ? StatusCodes.Status502BadGateway : StatusCodes.Status500InternalServerError;

                throw new ApiException(mappedStatus, message);
            }

            var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            var completion = await JsonSerializer.DeserializeAsync<ChatCompletionsResponse>(contentStream, SerializerOptions, cancellationToken).ConfigureAwait(false);

            var aiResponse = completion?.Choices?.FirstOrDefault()?.Message?.Content;

            if (string.IsNullOrWhiteSpace(aiResponse))
            {
                throw new ApiException(StatusCodes.Status502BadGateway, "ai_generation_failed");
            }

            logger.LogInformation(
                "OpenRouter request for model {Model} completed in {ElapsedMilliseconds} ms.",
                model,
                stopwatch.ElapsedMilliseconds);

            return aiResponse.Trim();
        }

        private static string BuildPreview(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.ReplaceLineEndings(" ").Trim();

            if (normalized.Length <= 320)
            {
                return normalized;
            }

            return string.Concat(normalized.AsSpan(0, 317).TrimEnd(), "...");
        }

        private string GetCorrelationId()
        {
            var context = httpContextAccessor.HttpContext;
            return context?.GetOrCreateCorrelationId() ?? Guid.NewGuid().ToString("N");
        }

        private IDisposable BeginScope(string correlationId, Guid therapistId, Guid visitId, Guid? generationId)
        {
            var scopeState = new Dictionary<string, object>
            {
                ["CorrelationId"] = correlationId,
                ["TherapistId"] = therapistId,
                ["VisitId"] = visitId
            };

            if (generationId.HasValue)
            {
                scopeState["GenerationId"] = generationId.Value;
            }

            var scope = logger.BeginScope(scopeState);
            return scope ?? NullScope.Instance;
        }

        private sealed class ChatCompletionsRequest
        {
            public string Model { get; set; } = string.Empty;

            public decimal Temperature { get; set; }
            public List<ChatMessage> Messages { get; set; } = [];
        }

        private sealed class ChatCompletionsResponse
        {
            public List<ChatChoice> Choices { get; set; } = [];
        }

        private sealed class ChatChoice
        {
            public ChatMessage Message { get; set; } = new();
        }

        private sealed class ChatMessage
        {
            public string Role { get; set; } = string.Empty;

            public string Content { get; set; } = string.Empty;
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();

            public void Dispose()
            {
            }
        }
    }
}
