using _10xPhysio.Server.Models.Database;

namespace _10xPhysio.Server.Services.VisitAiGenerations
{
    /// <summary>
    /// Builds structured prompts supplied to the AI model based on visit context and optional override tokens.
    /// </summary>
    public interface IAiPromptBuilder
    {
        /// <summary>
        /// Constructs a prompt string ready for transmission to the AI provider.
        /// </summary>
        /// <param name="visit">Visit entity containing the clinical narrative.</param>
        /// <param name="promptOverrides">Optional override tokens provided by the caller (may be empty).</param>
        /// <returns>Sanitized prompt string.</returns>
        string BuildPrompt(Visit visit, IReadOnlyDictionary<string, string> promptOverrides);
    }
}
