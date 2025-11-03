namespace _10xPhysio.Server.Models.Dto.Common
{
    /// <summary>
    /// Represents a lightweight message envelope used by endpoints that only need to communicate status
    /// information (e.g. logout acknowledgements). Keeping the structure centralized avoids repeating
    /// anonymous types when projecting from command handlers.
    /// </summary>
    public class OperationMessageDto
    {
        /// <summary>
        /// Gets or sets the textual message describing the outcome of the operation.
        /// </summary>
        public string Message { get; set; } = string.Empty;
    }
}
