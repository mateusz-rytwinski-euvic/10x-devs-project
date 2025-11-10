using _10xPhysio.Server.Models.Database;

using System.Text;

namespace _10xPhysio.Server.Services.VisitAiGenerations
{
    /// <summary>
    /// Default prompt builder that aggregates visit context into a structured instruction for the AI provider while
    /// honoring optional override tokens supplied by clients.
    /// </summary>
    public sealed class AiPromptBuilder : IAiPromptBuilder
    {
        /// <inheritdoc />
        public string BuildPrompt(Visit visit, IReadOnlyDictionary<string, string> promptOverrides)
        {
            ArgumentNullException.ThrowIfNull(visit);
            ArgumentNullException.ThrowIfNull(promptOverrides);

            var builder = new StringBuilder();

            builder.AppendLine("You are an experienced physiotherapist creating evidence-based visit recommendations.");
            builder.AppendLine("Provide concise, actionable guidance tailored to the patient's current visit.");
            builder.AppendLine();
            builder.AppendLine("Patient Visit Summary:");

            if (!string.IsNullOrWhiteSpace(visit.Interview))
            {
                builder.AppendLine("Interview Notes:");
                builder.AppendLine(visit.Interview);
                builder.AppendLine();
            }

            if (!string.IsNullOrWhiteSpace(visit.Description))
            {
                builder.AppendLine("Clinical Description:");
                builder.AppendLine(visit.Description);
                builder.AppendLine();
            }

            if (!string.IsNullOrWhiteSpace(visit.Recommendations))
            {
                builder.AppendLine("Previous Recommendations:");
                builder.AppendLine(visit.Recommendations);
                builder.AppendLine();
            }

            if (promptOverrides.Count > 0)
            {
                builder.AppendLine("Client Overrides:");

                foreach (var kvp in promptOverrides)
                {
                    builder.Append("- ");
                    builder.Append(kvp.Key.Trim());
                    builder.Append(": ");
                    builder.AppendLine(kvp.Value);
                }

                builder.AppendLine();
            }

            builder.AppendLine("Output Requirements:");
            builder.AppendLine("- Focus on functional goals and measurable outcomes.");
            builder.AppendLine("- List specific exercises or interventions with brief rationale.");
            builder.AppendLine("- Highlight any precautions or follow-up considerations.");

            return builder.ToString().Trim();
        }
    }
}
