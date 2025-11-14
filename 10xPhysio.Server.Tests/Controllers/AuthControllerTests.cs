using _10xPhysio.Server.Controllers;
using _10xPhysio.Server.Models.Dto.Auth;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Services.Auth;

using FluentAssertions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;

using Moq;

namespace _10xPhysio.Server.Tests.Controllers
{
    /// <summary>
    /// Provides unit coverage for the <see cref="AuthController"/>.
    /// </summary>
    public sealed class AuthControllerTests
    {
        private readonly Mock<IAuthService> authServiceMock = new(MockBehavior.Strict);

        /// <summary>
        /// Verifies that a valid signup request returns a 201 response.
        /// </summary>
        [Fact]
        public async Task SignUpAsync_WhenModelIsValid_ReturnsCreated()
        {
            var command = new AuthSignupCommand
            {
                Email = "therapist@example.com",
                Password = "Password1",
                FirstName = "Jane",
                LastName = "Doe"
            };

            var expectedResponse = new OperationMessageDto { Message = "account_created" };

            authServiceMock
                .Setup(service => service.SignUpAsync(
                    It.Is<AuthSignupCommand>(c => c.Email == command.Email),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            var controller = CreateController();

            var result = await controller.SignUpAsync(command, CancellationToken.None);

            var createdResult = result.Should().BeOfType<CreatedResult>().Subject;
            createdResult.Value.Should().BeSameAs(expectedResponse);
            createdResult.StatusCode.Should().Be(StatusCodes.Status201Created);

            authServiceMock.VerifyAll();
        }

        /// <summary>
        /// Verifies that invalid signup payloads produce a validation problem response.
        /// </summary>
        [Fact]
        public async Task SignUpAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("Email", "Email is required.");
            var command = new AuthSignupCommand();

            var result = await controller.SignUpAsync(command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            authServiceMock.Verify(service => service.SignUpAsync(It.IsAny<AuthSignupCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Verifies that valid login requests are proxied to the auth service and return OK.
        /// </summary>
        [Fact]
        public async Task LoginAsync_WhenModelIsValid_ReturnsOk()
        {
            var command = new AuthLoginCommand
            {
                Email = "therapist@example.com",
                Password = "Password1"
            };

            var session = new AuthSessionDto { AccessToken = "access_token" };

            authServiceMock
                .Setup(service => service.LoginAsync(
                    It.Is<AuthLoginCommand>(c => c.Email == command.Email),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(session);

            var controller = CreateController();

            var result = await controller.LoginAsync(command, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().BeSameAs(session);
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);

            authServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures invalid login payloads short-circuit without invoking the auth service.
        /// </summary>
        [Fact]
        public async Task LoginAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("Email", "Email is required.");
            var command = new AuthLoginCommand();

            var result = await controller.LoginAsync(command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            authServiceMock.Verify(service => service.LoginAsync(It.IsAny<AuthLoginCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that missing bearer tokens trigger an unauthorized logout response.
        /// </summary>
        [Fact]
        public async Task LogoutAsync_WhenAuthorizationHeaderMissing_ReturnsUnauthorized()
        {
            var controller = CreateController();

            var result = await controller.LogoutAsync(CancellationToken.None);

            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
            unauthorizedResult.Value.Should().BeOfType<OperationMessageDto>()
                .Which.Message.Should().Be("missing_access_token");

            authServiceMock.Verify(service => service.LogoutAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Confirms logout requests with a valid bearer token return a 200 response.
        /// </summary>
        [Fact]
        public async Task LogoutAsync_WhenAuthorizationHeaderPresent_ReturnsOk()
        {
            var expectedResponse = new OperationMessageDto { Message = "session_revoked" };

            authServiceMock
                .Setup(service => service.LogoutAsync("token", It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["Authorization"] = "Bearer token";

            var result = await controller.LogoutAsync(CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(expectedResponse);

            authServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures missing bearer tokens yield unauthorized responses for session lookups.
        /// </summary>
        [Fact]
        public async Task GetSessionAsync_WhenAuthorizationHeaderMissing_ReturnsUnauthorized()
        {
            var controller = CreateController();

            var result = await controller.GetSessionAsync(CancellationToken.None);

            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
            unauthorizedResult.Value.Should().BeOfType<OperationMessageDto>()
                .Which.Message.Should().Be("missing_access_token");

            authServiceMock.Verify(service => service.GetSessionAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Confirms that a valid session lookup returns the snapshot from the auth service.
        /// </summary>
        [Fact]
        public async Task GetSessionAsync_WhenAuthorizationHeaderPresent_ReturnsOk()
        {
            var sessionSnapshot = new SessionSnapshotDto { Email = "therapist@example.com" };

            authServiceMock
                .Setup(service => service.GetSessionAsync("token", It.IsAny<CancellationToken>()))
                .ReturnsAsync(sessionSnapshot);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["Authorization"] = "Bearer token";

            var result = await controller.GetSessionAsync(CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(sessionSnapshot);

            authServiceMock.VerifyAll();
        }

        private AuthController CreateController()
        {
            var controller = new AuthController(authServiceMock.Object);

            var services = new ServiceCollection();
            services.AddSingleton<ProblemDetailsFactory, TestProblemDetailsFactory>();

            var httpContext = new DefaultHttpContext
            {
                RequestServices = services.BuildServiceProvider()
            };

            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

            return controller;
        }

        private sealed class TestProblemDetailsFactory : ProblemDetailsFactory
        {
            public override ProblemDetails CreateProblemDetails(
                HttpContext httpContext,
                int? statusCode = null,
                string? title = null,
                string? type = null,
                string? detail = null,
                string? instance = null)
            {
                return new ProblemDetails
                {
                    Status = statusCode ?? StatusCodes.Status500InternalServerError,
                    Title = title,
                    Type = type,
                    Detail = detail,
                    Instance = instance
                };
            }

            public override ValidationProblemDetails CreateValidationProblemDetails(
                HttpContext httpContext,
                ModelStateDictionary modelStateDictionary,
                int? statusCode = null,
                string? title = null,
                string? type = null,
                string? detail = null,
                string? instance = null)
            {
                return new ValidationProblemDetails(modelStateDictionary)
                {
                    Status = statusCode ?? StatusCodes.Status400BadRequest,
                    Title = title,
                    Type = type,
                    Detail = detail,
                    Instance = instance
                };
            }
        }
    }
}
