using _10xPhysio.Server.Controllers;
using _10xPhysio.Server.Models.Dto.Common;
using _10xPhysio.Server.Models.Dto.Patients;
using _10xPhysio.Server.Services.Patients;

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
    /// Provides unit coverage for <see cref="PatientsController"/> ensuring REST contract conformance.
    /// </summary>
    public sealed class PatientsControllerTests
    {
        private static readonly Guid TherapistId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

        private readonly Mock<IPatientService> patientServiceMock = new(MockBehavior.Strict);

        /// <summary>
        /// Ensures invalid create payloads are rejected with validation problems and never reach the service layer.
        /// </summary>
        [Fact]
        public async Task CreateAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("FirstName", "First name is required.");
            var command = new PatientCreateCommand();

            var result = await controller.CreateAsync(command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            patientServiceMock.Verify(service => service.CreateAsync(It.IsAny<Guid>(), It.IsAny<PatientCreateCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that a successful create request returns 201, sets the Location header, and emits an ETag.
        /// </summary>
        [Fact]
        public async Task CreateAsync_WhenModelIsValid_ReturnsCreatedAtRoute()
        {
            var command = new PatientCreateCommand
            {
                FirstName = "Jane",
                LastName = "Doe"
            };

            var patient = new PatientDto
            {
                Id = Guid.NewGuid(),
                TherapistId = TherapistId,
                FirstName = command.FirstName,
                LastName = command.LastName,
                ETag = "\"etag-value\""
            };

            patientServiceMock
                .Setup(service => service.CreateAsync(TherapistId, command, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patient);

            var controller = CreateController();

            var result = await controller.CreateAsync(command, CancellationToken.None);

            var createdResult = result.Should().BeOfType<CreatedAtRouteResult>().Subject;
            createdResult.RouteName.Should().Be(nameof(PatientsController.GetPatientByIdAsync));
            createdResult.RouteValues.Should().ContainKey("patientId").WhoseValue.Should().Be(patient.Id);
            createdResult.Value.Should().BeSameAs(patient);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(patient.ETag);

            patientServiceMock.VerifyAll();
        }

        /// <summary>
        /// Verifies the list endpoint proxies parameters and returns a 200 response.
        /// </summary>
        [Fact]
        public async Task GetAsync_WhenCalled_ReturnsOk()
        {
            var expected = PaginatedResponseDto<PatientListItemDto>.From(
                new[]
                {
                    new PatientListItemDto { Id = Guid.NewGuid(), FirstName = "Jane", LastName = "Doe" }
                },
                page: 2,
                pageSize: 10,
                totalItems: 30,
                totalPages: 3);

            patientServiceMock
                .Setup(service => service.ListAsync(TherapistId, 2, 10, "query", "lastName", "desc", It.IsAny<CancellationToken>()))
                .ReturnsAsync(expected);

            var controller = CreateController();

            var result = await controller.GetAsync(page: 2, pageSize: 10, search: "query", sort: "lastName", order: "desc");

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(expected);

            patientServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms the details endpoint returns 200 and applies the ETag header from the DTO.
        /// </summary>
        [Fact]
        public async Task GetPatientByIdAsync_WhenCalled_ReturnsOk()
        {
            var patientDetails = new PatientDetailsDto
            {
                Id = Guid.NewGuid(),
                FirstName = "John",
                LastName = "Smith",
                ETag = "\"details-etag\""
            };

            patientServiceMock
                .Setup(service => service.GetAsync(TherapistId, patientDetails.Id, true, 5, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patientDetails);

            var controller = CreateController();

            var result = await controller.GetPatientByIdAsync(patientDetails.Id, includeVisits: true, visitsLimit: 5, cancellationToken: CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(patientDetails);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(patientDetails.ETag);

            patientServiceMock.VerifyAll();
        }

        /// <summary>
        /// Ensures invalid update payloads produce validation responses and bypass the service layer.
        /// </summary>
        [Fact]
        public async Task UpdateAsync_WhenModelIsInvalid_ReturnsValidationProblem()
        {
            var controller = CreateController();
            controller.ModelState.AddModelError("FirstName", "First name is required.");
            var command = new PatientUpdateCommand();

            var result = await controller.UpdateAsync(Guid.NewGuid(), command, CancellationToken.None);

            var validationResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            validationResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
            validationResult.Value.Should().BeOfType<ValidationProblemDetails>();

            patientServiceMock.Verify(service => service.UpdateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<PatientUpdateCommand>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        /// <summary>
        /// Validates that the update endpoint forwards the If-Match header and applies the refreshed ETag.
        /// </summary>
        [Fact]
        public async Task UpdateAsync_WhenModelIsValid_ReturnsOk()
        {
            var patientId = Guid.NewGuid();
            var command = new PatientUpdateCommand
            {
                FirstName = "Updated",
                LastName = "Name"
            };

            var updatedPatient = new PatientDto
            {
                Id = patientId,
                TherapistId = TherapistId,
                FirstName = command.FirstName,
                LastName = command.LastName,
                ETag = "\"updated-etag\""
            };

            patientServiceMock
                .Setup(service => service.UpdateAsync(TherapistId, patientId, command, "\"etag-in\"", It.IsAny<CancellationToken>()))
                .ReturnsAsync(updatedPatient);

            var controller = CreateController();
            controller.HttpContext.Request.Headers["If-Match"] = "\"etag-in\"";

            var result = await controller.UpdateAsync(patientId, command, CancellationToken.None);

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
            okResult.Value.Should().BeSameAs(updatedPatient);
            controller.Response.Headers[HeaderNames.ETag].ToString().Should().Be(updatedPatient.ETag);

            patientServiceMock.VerifyAll();
        }

        /// <summary>
        /// Confirms the delete endpoint returns 204 and forwards identifiers to the service.
        /// </summary>
        [Fact]
        public async Task DeleteAsync_WhenCalled_ReturnsNoContent()
        {
            var patientId = Guid.NewGuid();

            patientServiceMock
                .Setup(service => service.DeleteAsync(TherapistId, patientId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController();

            var result = await controller.DeleteAsync(patientId, CancellationToken.None);

            result.Should().BeOfType<NoContentResult>();

            patientServiceMock.VerifyAll();
        }

        private PatientsController CreateController()
        {
            var controller = new PatientsController(patientServiceMock.Object);

            var services = new ServiceCollection();
            services.AddSingleton<ProblemDetailsFactory, TestProblemDetailsFactory>();

            var serviceProvider = services.BuildServiceProvider();

            var httpContext = new DefaultHttpContext
            {
                RequestServices = serviceProvider,
            };

            var claimsIdentity = new ClaimsIdentity(new[] { new Claim("sub", TherapistId.ToString()) }, "TestAuth");
            httpContext.User = new ClaimsPrincipal(claimsIdentity);

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
