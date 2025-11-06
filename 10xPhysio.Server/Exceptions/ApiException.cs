namespace _10xPhysio.Server.Exceptions
{
    /// <summary>
    /// Represents a handled application exception that should be converted into an HTTP response.
    /// </summary>
    public class ApiException : Exception
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ApiException"/> class.
        /// </summary>
        /// <param name="statusCode">HTTP status code to be emitted.</param>
        /// <param name="message">Logical error code returned to the client.</param>
        public ApiException(int statusCode, string message)
            : base(message)
        {
            StatusCode = statusCode;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="ApiException"/> class.
        /// </summary>
        /// <param name="statusCode">HTTP status code to be emitted.</param>
        /// <param name="message">Logical error code returned to the client.</param>
        /// <param name="innerException">Root cause captured for diagnostic purposes.</param>
        public ApiException(int statusCode, string message, Exception innerException)
            : base(message, innerException)
        {
            StatusCode = statusCode;
        }

        /// <summary>
        /// Gets the HTTP status code that should accompany the response.
        /// </summary>
        public int StatusCode { get; }
    }
}
