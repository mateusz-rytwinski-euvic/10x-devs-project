namespace _10xPhysio.Server.Models.Dto.Visits
{
    /// <summary>
    /// Command payload for patching visit metadata. Used alongside the weak ETag emitted from <see cref="VisitDto"/>.
    /// </summary>
    public class VisitUpdateCommand
    {
        /// <summary>
        /// Gets or sets the optional new visit date/time.
        /// </summary>
        public DateTimeOffset? VisitDate { get; set; }

        /// <summary>
        /// Gets or sets the optional interview narrative.
        /// </summary>
        public string? Interview { get; set; }

        /// <summary>
        /// Gets or sets the optional description.
        /// </summary>
        public string? Description { get; set; }
    }
}
