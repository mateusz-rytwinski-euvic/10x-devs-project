using _10xPhysio.Server.Controllers;
using _10xPhysio.Server.Exceptions;
using _10xPhysio.Server.Models.Dto.Profiles;
using _10xPhysio.Server.Services.Profiles;

using FluentAssertions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;

using Moq;

using System.Security.Claims;

namespace _10xPhysio.Server.Tests.Controllers
{
    /// <summary>
    /// Provides unit tests for <see cref="ProfileController"/>.
    /// </summary>
    public sealed class ProfileControllerTests
    {
        private static readonly Guid TherapistId = Guid.Parse("cccccccc-dddd-eeee-ffff-000000000000");

        private readonly Mock<IProfileService> profileServiceMock = new(MockBehavior.Strict);

        /// <summary>
        /// Ensures that a successful profile lookup returns 200 and applies the weak ETag header.
        /// </summary>
        [Fact]
        public async Task GetAsync_WhenProfileExists_ReturnsOk()
        {
            var profile = new ProfileSummaryDto
            {
                Id = TherapistId,
                FirstName = "Jane",
                LastName = "Doe",
                PreferredAiModel = "gpt-4o",
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-10),
                UpdatedAt = DateTimeOffset.UtcNow,
                ETag = "W/\"2024-07-07T00:00:00.0000000Z\""
            };

            profileServiceMock
                .Setup(service => service.GetAsync(TherapistId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(profile);

            var controller = CreateController();

            var result = await controller.GetAsync(CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(profile);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(profile.ETag);

            profileServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms that invalid patch payloads produce validation problem responses without invoking the service.
        /// </summary>
        [Fact]
        public async Task PatchAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("FirstName", "First name is required");
            var command = new ProfileUpdateCommand();

            var result = await controller.PatchAsync(command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            profileServiceMock.Verify(service => service.UpdateAsync(It.IsAny<Guid>(), It.IsAny<ProfileUpdateCommand>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that profile updates forward the If-Match header and return the refreshed profile.
        /// </summary>
        [Fact]
        public async Task PatchAsync_WhenModelIsValid_ReturnsOk()
        {
            var command = new ProfileUpdateCommand
            {
                FirstName = "Updated",
                LastName = "Name",
                PreferredAiModel = "sonnet-3"
            };

            var updatedProfile = new ProfileSummaryDto
            {
                Id = TherapistId,
                FirstName = command.FirstName,
                LastName = command.LastName,
                PreferredAiModel = command.PreferredAiModel,
                CreatedAt = DateTimeOffset.UtcNow.AddYears(-1),
                UpdatedAt = DateTimeOffset.UtcNow,
                ETag = "W/\"2024-08-08T00:00:00.0000000Z\""
            };

            profileServiceMock
                .Setup(service => service.UpdateAsync(TherapistId, command, "W/\"etag-in\"", It.IsAny<CancellationToken>()))
                .ReturnsAsync(updatedProfile);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["If-Match"] = "W/\"etag-in\"";

            var result = await controller.PatchAsync(command, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(updatedProfile);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(updatedProfile.ETag);

            profileServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures missing If-Match headers surface as API exceptions that the middleware converts.
        /// </summary>
        [Fact]
        public async Task PatchAsync_WhenIfMatchMissing_ThrowsApiException()
        {
            var command = new ProfileUpdateCommand
            {
                FirstName = "Jane",
                LastName = "Doe"
            };

            var controller = CreateController();

            var action = async () => await controller.PatchAsync(command, CancellationToken.None);

            await action.Should().ThrowAsync<ApiException>()
                .WithMessage("*missing_if_match*");

            profileServiceMock.Verify(service => service.UpdateAsync(It.IsAny<Guid>(), It.IsAny<ProfileUpdateCommand>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        private ProfileController CreateController()
        {
            var controller = new ProfileController(profileServiceMock.Object);

            var services = new ServiceCollection();
            services.AddSingleton<ProblemDetailsFactory, TestProblemDetailsFactory>();

            var serviceProvider = services.BuildServiceProvider();

            var httpContext = new DefaultHttpContext
            {
                RequestServices = serviceProvider
            };

            var identity = new ClaimsIdentity(new[] { new Claim("sub", TherapistId.ToString()) }, "TestAuth");
            httpContext.User = new ClaimsPrincipal(identity);

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
