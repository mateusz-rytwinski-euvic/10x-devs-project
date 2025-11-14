using _10xPhysio.Server.Controllers;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Visits;
using _10xPhysio.Server.Services.Visits;

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
    /// Provides unit coverage for <see cref="VisitsController"/> ensuring correct response contracts.
    /// </summary>
    public sealed class VisitsControllerTests
    {
        private static readonly Guid TherapistId = Guid.Parse("bbbbbbbb-cccc-dddd-eeee-ffffffffffff");

        private readonly Mock<IVisitService> visitServiceMock = new(MockBehavior.Strict);

        /// <summary>
        /// Ensures invalid visit creation payloads short-circuit with validation responses.
        /// </summary>
        [Fact]
        public async Task CreateAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("VisitDate", "Visit date is required.");
            var command = new VisitCreateCommand();

            var result = await controller.CreateAsync(Guid.NewGuid(), command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            visitServiceMock.Verify(service => service.CreateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<VisitCreateCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that successful visit creation returns 201, sets Location, and applies ETag.
        /// </summary>
        [Fact]
        public async Task CreateAsync_WhenModelIsValid_ReturnsCreatedAtRoute()
        {
            var patientId = Guid.NewGuid();
            var command = new VisitCreateCommand
            {
                VisitDate = DateTimeOffset.UtcNow,
                Description = "Follow-up"
            };

            var visit = new VisitDto
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                VisitDate = command.VisitDate,
                ETag = "W/\"2024-01-01T00:00:00.0000000Z\""
            };

            visitServiceMock
                .Setup(service => service.CreateAsync(TherapistId, patientId, command, It.IsAny<CancellationToken>()))
                .ReturnsAsync(visit);

            var controller = CreateController();

            var result = await controller.CreateAsync(patientId, command, CancellationToken.None);

            var createdResult = result.Should().BeOfType<CreatedAtRouteResult>().Subject;
            createdResult.RouteName.Should().Be(nameof(VisitsController.GetVisitByIdAsync));
            createdResult.RouteValues.Should().ContainKey("visitId").WhoseValue.Should().Be(visit.Id);
            createdResult.Value.Should().BeSameAs(visit);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(visit.ETag);

            visitServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms the list endpoint proxies query parameters and returns a 200 response.
        /// </summary>
        [Fact]
        public async Task GetByPatientAsync_WhenCalled_ReturnsOk()
        {
            var patientId = Guid.NewGuid();
            var from = DateTimeOffset.UtcNow.AddDays(-7);
            var to = DateTimeOffset.UtcNow;

            var expected = PaginatedResponseDto<VisitDto>.From(
                new[]
                {
                    new VisitDto { Id = Guid.NewGuid(), PatientId = patientId, VisitDate = DateTimeOffset.UtcNow }
                },
                page: 3,
                pageSize: 5,
                totalItems: 15,
                totalPages: 3);

            visitServiceMock
                .Setup(service => service.ListAsync(TherapistId, patientId, 3, 5, from, to, true, "asc", It.IsAny<CancellationToken>()))
                .ReturnsAsync(expected);

            var controller = CreateController();

            var result = await controller.GetByPatientAsync(patientId, page: 3, pageSize: 5, from: from, to: to, includeRecommendations: true, order: "asc");

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(expected);

            visitServiceMock.VerifyAll();
        }

        /// <summary>
        /// Validates the visit details endpoint applies concurrency headers and returns the service payload.
        /// </summary>
        [Fact]
        public async Task GetVisitByIdAsync_WhenCalled_ReturnsOk()
        {
            var visit = new VisitDto
            {
                Id = Guid.NewGuid(),
                PatientId = Guid.NewGuid(),
                VisitDate = DateTimeOffset.UtcNow,
                ETag = "W/\"2024-02-02T00:00:00.0000000Z\""
            };

            visitServiceMock
                .Setup(service => service.GetAsync(TherapistId, visit.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(visit);

            var controller = CreateController();

            var result = await controller.GetVisitByIdAsync(visit.Id, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(visit);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(visit.ETag);

            visitServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures invalid update payloads produce validation errors and bypass the service call.
        /// </summary>
        [Fact]
        public async Task UpdateAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("VisitDate", "Visit date is required.");
            var command = new VisitUpdateCommand();

            var result = await controller.UpdateAsync(Guid.NewGuid(), command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            visitServiceMock.Verify(service => service.UpdateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<VisitUpdateCommand>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that visit updates forward the parsed timestamp and apply refreshed ETags.
        /// </summary>
        [Fact]
        public async Task UpdateAsync_WhenModelIsValid_ReturnsOk()
        {
            var visitId = Guid.NewGuid();
            var expectedTimestamp = DateTimeOffset.Parse("2024-03-03T10:15:30Z");
            var ifMatch = WeakEtag.FromTimestamp(expectedTimestamp);

            var command = new VisitUpdateCommand
            {
                Description = "Updated notes"
            };

            var updatedVisit = new VisitDto
            {
                Id = visitId,
                PatientId = Guid.NewGuid(),
                VisitDate = DateTimeOffset.UtcNow,
                Description = command.Description,
                ETag = "W/\"2024-04-04T00:00:00.0000000Z\""
            };

            visitServiceMock
                .Setup(service => service.UpdateAsync(TherapistId, visitId, command, expectedTimestamp, It.IsAny<CancellationToken>()))
                .ReturnsAsync(updatedVisit);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["If-Match"] = ifMatch;

            var result = await controller.UpdateAsync(visitId, command, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(updatedVisit);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(updatedVisit.ETag);

            visitServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms delete requests return 204 and forward identifiers to the service.
        /// </summary>
        [Fact]
        public async Task DeleteAsync_WhenCalled_ReturnsNoContent()
        {
            var visitId = Guid.NewGuid();

            visitServiceMock
                .Setup(service => service.DeleteAsync(TherapistId, visitId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController();

            var result = await controller.DeleteAsync(visitId, CancellationToken.None);

            result.Should().BeOfType<NoContentResult>();

            visitServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures invalid recommendation payloads are rejected before hitting the service layer.
        /// </summary>
        [Fact]
        public async Task SaveRecommendationsAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("Recommendations", "Recommendations are required.");
            var command = new VisitRecommendationCommand();

            var result = await controller.SaveRecommendationsAsync(Guid.NewGuid(), command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            visitServiceMock.Verify(service => service.SaveRecommendationsAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<VisitRecommendationCommand>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that recommendation updates forward the If-Match timestamp and apply updated ETags.
        /// </summary>
        [Fact]
        public async Task SaveRecommendationsAsync_WhenModelIsValid_ReturnsOk()
        {
            var visitId = Guid.NewGuid();
            var expectedTimestamp = DateTimeOffset.Parse("2024-05-05T05:05:05Z");
            var ifMatch = WeakEtag.FromTimestamp(expectedTimestamp);

            var command = new VisitRecommendationCommand
            {
                Recommendations = "Updated plan",
                AiGenerated = true,
                SourceGenerationId = Guid.NewGuid()
            };

            var recommendation = new VisitRecommendationStateDto
            {
                Id = visitId,
                Recommendations = command.Recommendations,
                RecommendationsGeneratedByAi = true,
                RecommendationsGeneratedAt = DateTimeOffset.UtcNow,
                ETag = "W/\"2024-06-06T00:00:00.0000000Z\""
            };

            visitServiceMock
                .Setup(service => service.SaveRecommendationsAsync(TherapistId, visitId, command, expectedTimestamp, It.IsAny<CancellationToken>()))
                .ReturnsAsync(recommendation);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["If-Match"] = ifMatch;

            var result = await controller.SaveRecommendationsAsync(visitId, command, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(recommendation);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(recommendation.ETag);

            visitServiceMock.VerifyAll();
        }

        private VisitsController CreateController()
        {
            var controller = new VisitsController(visitServiceMock.Object);

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
