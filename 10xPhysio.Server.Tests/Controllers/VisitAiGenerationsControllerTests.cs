using _10xPhysio.Server.Controllers;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.VisitAiGenerations;
using _10xPhysio.Server.Services.VisitAiGenerations;

using FluentAssertions;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;

using Moq;

using System.Security.Claims;

namespace _10xPhysio.Server.Tests.Controllers
{
    /// <summary>
    /// Provides unit coverage for <see cref="VisitAiGenerationsController"/>.
    /// </summary>
    public sealed class VisitAiGenerationsControllerTests
    {
        private static readonly Guid TherapistId = Guid.Parse("dddddddd-eeee-ffff-0000-111111111111");

        private readonly Mock<IVisitAiGenerationService> generationServiceMock = new(MockBehavior.Strict);

        /// <summary>
        /// Ensures invalid generation payloads short-circuit with validation responses.
        /// </summary>
        [Fact]
        public async Task GenerateAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("Model", "Model is invalid");
            var command = new VisitAiGenerationCommand();

            var result = await controller.GenerateAsync(Guid.NewGuid(), command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            generationServiceMock.Verify(service => service.GenerateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<VisitAiGenerationCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates successful generation returns 201 with route metadata and service payload.
        /// </summary>
        [Fact]
        public async Task GenerateAsync_WhenModelIsValid_ReturnsCreatedAtRoute()
        {
            var visitId = Guid.NewGuid();
            var command = new VisitAiGenerationCommand
            {
                Model = "gpt-4o",
                Temperature = 0.7m
            };

            var generation = new VisitAiGenerationCreatedDto
            {
                GenerationId = Guid.NewGuid(),
                Model = command.Model ?? string.Empty,
                Temperature = command.Temperature,
                Status = "completed",
                Prompt = "prompt",
                AiResponse = "response",
                RecommendationsPreview = "preview",
                CreatedAt = DateTimeOffset.UtcNow
            };

            generationServiceMock
                .Setup(service => service.GenerateAsync(TherapistId, visitId, command, It.IsAny<CancellationToken>()))
                .ReturnsAsync(generation);

            var controller = CreateController();

            var result = await controller.GenerateAsync(visitId, command, CancellationToken.None);

            var createdResult = result.Should().BeOfType<CreatedAtRouteResult>().Subject;
            createdResult.RouteName.Should().Be(nameof(VisitAiGenerationsController.GetGenerationByIdAsync));
            createdResult.RouteValues.Should().ContainKey("visitId").WhoseValue.Should().Be(visitId);
            createdResult.RouteValues.Should().ContainKey("generationId").WhoseValue.Should().Be(generation.GenerationId);
            createdResult.Value.Should().BeSameAs(generation);

            generationServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms the list endpoint proxies pagination parameters and returns 200.
        /// </summary>
        [Fact]
        public async Task ListAsync_WhenCalled_ReturnsOk()
        {
            var visitId = Guid.NewGuid();

            var expected = PaginatedResponseDto<VisitAiGenerationListItemDto>.From(
                new[]
                {
                    new VisitAiGenerationListItemDto { Id = Guid.NewGuid(), Model = "gpt-4o", Prompt = "prompt" }
                },
                page: 2,
                pageSize: 5,
                totalItems: 10,
                totalPages: 2);

            generationServiceMock
                .Setup(service => service.ListAsync(TherapistId, visitId, 2, 5, "asc", It.IsAny<CancellationToken>()))
                .ReturnsAsync(expected);

            var controller = CreateController();

            var result = await controller.ListAsync(visitId, page: 2, pageSize: 5, order: "asc");

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(expected);

            generationServiceMock.VerifyAll();
        }

        /// <summary>
        /// Verifies that fetching a specific generation returns 200 with the service payload.
        /// </summary>
        [Fact]
        public async Task GetGenerationByIdAsync_WhenCalled_ReturnsOk()
        {
            var visitId = Guid.NewGuid();
            var generationId = Guid.NewGuid();

            var generation = new VisitAiGenerationDetailDto
            {
                Id = generationId,
                VisitId = visitId,
                TherapistId = TherapistId,
                Model = "gpt-4o",
                Prompt = "prompt",
                AiResponse = "response",
                CreatedAt = DateTimeOffset.UtcNow
            };

            generationServiceMock
                .Setup(service => service.GetAsync(TherapistId, visitId, generationId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(generation);

            var controller = CreateController();

            var result = await controller.GetGenerationByIdAsync(visitId, generationId, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(generation);

            generationServiceMock.VerifyAll();
        }

        private VisitAiGenerationsController CreateController()
        {
            var controller = new VisitAiGenerationsController(generationServiceMock.Object);

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
