using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Middleware;
using _10xPhysio.Server.Models.Dto.Common;

using FluentAssertions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Logging;

using Moq;

using Supabase.Gotrue.Exceptions;

using System.Runtime.Serialization;
using System.Text.Json;

namespace _10xPhysio.Server.Tests.Middleware
{
    /// <summary>
    /// Provides unit coverage for <see cref="ExceptionHandlingMiddleware"/>.
    /// </summary>
    public sealed class ExceptionHandlingMiddlewareTests
    {
        private const string CorrelationHeader = "X-Correlation-Id";

        /// <summary>
        /// Ensures that no exception bubbling through the pipeline results in a pass-through response while still providing a correlation identifier.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenRequestCompletes_SetsCorrelationHeaderAndInvokesNext()
        {
            // Arrange
            var context = CreateHttpContext();
            var nextCalled = false;

            var middleware = CreateMiddleware(async httpContext =>
            {
                await Task.Delay(10);
                nextCalled = true;
                httpContext.Response.StatusCode = StatusCodes.Status204NoContent;
            }, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            nextCalled.Should().BeTrue();
            context.Response.StatusCode.Should().Be(StatusCodes.Status204NoContent);
            context.Response.Headers.Should().ContainKey(CorrelationHeader);
            loggerMock.Verify(logger => logger.BeginScope(It.IsAny<Dictionary<string, object>>()), Times.Once);
            loggerMock.VerifyNoOtherCalls();
        }

        /// <summary>
        /// Validates <see cref="ApiException"/> instances lead to warning logs and payload echoing the exception message.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenApiExceptionIsThrown_ReturnsStatusCodeFromException()
        {
            // Arrange
            var correlationId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
            var context = CreateHttpContext(correlationId);
            var exception = new ApiException(StatusCodes.Status409Conflict, "patient_conflict");

            var middleware = CreateMiddleware(_ => throw exception, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            AssertResponse(context, StatusCodes.Status409Conflict, "patient_conflict", correlationId);
            VerifyLog(loggerMock, LogLevel.Warning, exception, "StatusCode: 409");
        }

        /// <summary>
        /// Verifies that argument validation errors translate to a 400 response with a warning log entry.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenArgumentExceptionIsThrown_ReturnsBadRequest()
        {
            // Arrange
            var context = CreateHttpContext();
            var exception = new ArgumentException("invalid_parameter");

            var middleware = CreateMiddleware(_ => throw exception, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            AssertResponse(context, StatusCodes.Status400BadRequest, "invalid_parameter", GetCorrelationId(context));
            VerifyLog(loggerMock, LogLevel.Warning, exception, "StatusCode: 400");
        }

        /// <summary>
        /// Confirms Supabase gateway errors are surfaced as 502 and logged as errors.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenGotrueExceptionIsThrown_ReturnsBadGateway()
        {
            // Arrange
            var context = CreateHttpContext();
            var exception = CreateSupabaseException<GotrueException>();

            var middleware = CreateMiddleware(_ => throw exception, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            AssertResponse(context, StatusCodes.Status502BadGateway, "supabase_error", GetCorrelationId(context));
            VerifyLog(loggerMock, LogLevel.Error, exception, "StatusCode: 502");
        }

        /// <summary>
        /// Ensures an unhandled exception is captured as a 500 error with error severity logging.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenGeneralExceptionIsThrown_ReturnsInternalServerError()
        {
            // Arrange
            var context = CreateHttpContext();
            var exception = new InvalidOperationException("unexpected_state");

            var middleware = CreateMiddleware(_ => throw exception, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            AssertResponse(context, StatusCodes.Status500InternalServerError, "internal_error", GetCorrelationId(context));
            VerifyLog(loggerMock, LogLevel.Error, exception, "StatusCode: 500");
        }

        /// <summary>
        /// Ensures the middleware respects responses that already started streaming by not rewriting headers or the body.
        /// </summary>
        [Fact]
        public async Task InvokeAsync_WhenResponseHasStarted_DoesNotOverwriteExistingPayload()
        {
            // Arrange
            var context = CreateHttpContext();
            var responseFeature = new StartedHttpResponseFeature(context.Response.Body);
            context.Features.Set<IHttpResponseFeature>(responseFeature);
            context.Response.Body = responseFeature.Body;
            var middleware = CreateMiddleware(async httpContext =>
            {
                await responseFeature.StartAsync();
                await httpContext.Response.WriteAsync("partial");
                await httpContext.Response.Body.FlushAsync();
                throw new InvalidOperationException("after_write");
            }, out var loggerMock);

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
            context.Response.Headers[CorrelationHeader].Should().NotBeNull();

            context.Response.Body.Seek(0, SeekOrigin.Begin);
            using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            body.Should().Be("partial");

            loggerMock.Verify(logger => logger.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((state, _) => StateContainsFragment(state, "StatusCode: 500")),
                It.Is<Exception>(ex => ex is InvalidOperationException),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
        }

        private static ExceptionHandlingMiddleware CreateMiddleware(RequestDelegate next, out Mock<ILogger<ExceptionHandlingMiddleware>> loggerMock)
        {
            loggerMock = new Mock<ILogger<ExceptionHandlingMiddleware>>(MockBehavior.Strict);
            loggerMock
                .Setup(logger => logger.BeginScope(It.IsAny<Dictionary<string, object>>()))
                .Returns(new NoopDisposable());
            loggerMock
                .Setup(logger => logger.Log(
                    It.IsAny<LogLevel>(),
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception?>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()))
                .Verifiable();
            return new ExceptionHandlingMiddleware(next, loggerMock.Object);
        }

        private static DefaultHttpContext CreateHttpContext(string? correlationId = null)
        {
            var context = new DefaultHttpContext();
            context.Request.Headers[CorrelationHeader] = correlationId ?? string.Empty;
            context.Response.Body = new MemoryStream();
            return context;
        }

        private static string GetCorrelationId(HttpContext context)
        {
            return context.Response.Headers.TryGetValue(CorrelationHeader, out var values)
                ? values.ToString()
                : string.Empty;
        }

        private static void AssertResponse(HttpContext context, int expectedStatusCode, string expectedMessage, string expectedCorrelationId)
        {
            context.Response.StatusCode.Should().Be(expectedStatusCode);
            context.Response.ContentType.Should().Be("application/json");
            context.Response.Headers[CorrelationHeader].ToString().Should().Be(expectedCorrelationId);

            context.Response.Body.Seek(0, SeekOrigin.Begin);
            using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
            var payload = reader.ReadToEnd();

            var dto = JsonSerializer.Deserialize<OperationMessageDto>(payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            dto.Should().NotBeNull();
            dto!.Message.Should().Be(expectedMessage);
            dto.CorrelationId.Should().Be(expectedCorrelationId);
        }

        private static void VerifyLog(Mock<ILogger<ExceptionHandlingMiddleware>> loggerMock, LogLevel level, Exception expectedException, string expectedMessageFragment)
        {
            loggerMock.Verify(logger => logger.Log(
                level,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((state, _) => StateContainsFragment(state, expectedMessageFragment)),
                It.Is<Exception>(ex => ReferenceEquals(ex, expectedException)),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.Once);
        }

        private static TException CreateSupabaseException<TException>()
            where TException : Exception
        {
#pragma warning disable SYSLIB0050 // Formatter-based serialization is obsolete but safe for test instantiation of third-party exceptions.
            return (TException)FormatterServices.GetUninitializedObject(typeof(TException));
#pragma warning restore SYSLIB0050
        }

        private static bool StateContainsFragment(object state, string fragment)
        {
            var message = state?.ToString();
            return message != null && message.Contains(fragment, StringComparison.Ordinal);
        }

        private sealed class NoopDisposable : IDisposable
        {
            public void Dispose()
            {
            }
        }

        private sealed class StartedHttpResponseFeature : IHttpResponseFeature
        {
            public StartedHttpResponseFeature(Stream body)
            {
                Body = body;
            }

            public int StatusCode { get; set; } = StatusCodes.Status200OK;

            public string? ReasonPhrase { get; set; }
                = string.Empty;

            public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();

            public Stream Body { get; set; }
                = Stream.Null;

            public bool HasStarted { get; private set; }
                = false;

            private readonly List<(Func<object, Task> Callback, object State)> startingCallbacks = new();
            private readonly List<(Func<object, Task> Callback, object State)> completionCallbacks = new();

            public async Task StartAsync(CancellationToken cancellationToken = default)
            {
                HasStarted = true;
                foreach (var (callback, state) in startingCallbacks)
                {
                    await callback(state).ConfigureAwait(false);
                }
            }

            public async Task CompleteAsync(CancellationToken cancellationToken = default)
            {
                foreach (var (callback, state) in completionCallbacks)
                {
                    await callback(state).ConfigureAwait(false);
                }
            }

            public void OnStarting(Func<object, Task> callback, object state)
            {
                startingCallbacks.Add((callback, state));
            }

            public void OnCompleted(Func<object, Task> callback, object state)
            {
                completionCallbacks.Add((callback, state));
            }
        }
    }
}
