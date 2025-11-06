using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Dto.Common;

using Supabase.Gotrue.Exceptions;
using Supabase.Postgrest.Exceptions;

using System.Net.Mime;
using System.Text.Json;

namespace _10xPhysio.Server.Middleware
{
    /// <summary>
    /// Converts known application and Supabase exceptions into structured HTTP responses.
    /// </summary>
    public sealed class ExceptionHandlingMiddleware
    {
        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        private readonly RequestDelegate next;
        private readonly ILogger<ExceptionHandlingMiddleware> logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ExceptionHandlingMiddleware"/> class.
        /// </summary>
        /// <param name="next">Delegate that invokes the remaining middleware pipeline.</param>
        /// <param name="logger">Application logger.</param>
        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            ArgumentNullException.ThrowIfNull(next);
            ArgumentNullException.ThrowIfNull(logger);

            this.next = next;
            this.logger = logger;
        }

        /// <summary>
        /// Processes requests and converts known exceptions to JSON responses.
        /// </summary>
        /// <param name="context">HTTP request context.</param>
        /// <returns>Task representing the asynchronous middleware operation.</returns>
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context).ConfigureAwait(false);
            }
            catch (ApiException apiException)
            {
                await WriteResponseAsync(context, apiException.StatusCode, apiException.Message, apiException).ConfigureAwait(false);
            }
            catch (ArgumentException argumentException)
            {
                await WriteResponseAsync(context, StatusCodes.Status400BadRequest, argumentException.Message, argumentException).ConfigureAwait(false);
            }
            catch (GotrueException gotrueException)
            {
                await WriteResponseAsync(context, StatusCodes.Status502BadGateway, "supabase_error", gotrueException).ConfigureAwait(false);
            }
            catch (PostgrestException postgrestException)
            {
                await WriteResponseAsync(context, StatusCodes.Status502BadGateway, "supabase_error", postgrestException).ConfigureAwait(false);
            }
            catch (Exception exception)
            {
                await WriteResponseAsync(context, StatusCodes.Status500InternalServerError, "internal_error", exception).ConfigureAwait(false);
            }
        }

        private async Task WriteResponseAsync(HttpContext context, int statusCode, string message, Exception exception)
        {
            if (statusCode >= 500)
            {
                logger.LogError(exception, "Unhandled exception processed by middleware. StatusCode: {StatusCode}.", statusCode);
            }
            else
            {
                logger.LogWarning(exception, "Handled exception processed by middleware. StatusCode: {StatusCode}.", statusCode);
            }

            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = MediaTypeNames.Application.Json;

            var payload = new OperationMessageDto { Message = message };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, SerializerOptions)).ConfigureAwait(false);
        }
    }
}
