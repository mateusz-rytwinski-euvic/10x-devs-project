using System.Collections.ObjectModel;

namespace _10xPhysio.Server.Models.Dto.Common
{
    /// <summary>
    /// Represents a paginated collection projection backed by relational entities. This abstraction keeps
    /// ownership information alongside the materialized DTO items and mirrors the pagination metadata
    /// returned by the API plan.
    /// </summary>
    /// <typeparam name="TItem">Concrete DTO type mapped from database entities (e.g. patient or visit summaries).</typeparam>
    public class PaginatedResponseDto<TItem> where TItem : class
    {
        /// <summary>
        /// Gets the projected DTO items. Defaults to an empty readonly collection so the serializer emits an empty array.
        /// </summary>
        public IReadOnlyList<TItem> Items { get; init; } = [];

        /// <summary>
        /// Gets the current page number (1-based) negotiated with the client.
        /// </summary>
        public int Page { get; init; }

        /// <summary>
        /// Gets the page size requested or defaulted by the API.
        /// </summary>
        public int PageSize { get; init; }

        /// <summary>
        /// Gets the total number of items matching the query. Mirrors COUNT(*) over the backing entity set.
        /// </summary>
        public int TotalItems { get; init; }

        /// <summary>
        /// Gets the total number of pages derived from <see cref="TotalItems"/> and <see cref="PageSize"/>.
        /// </summary>
        public int TotalPages { get; init; }

        /// <summary>
        /// Creates a paginated response pre-populated with the supplied items.
        /// </summary>
        /// <param name="items">Materialized projection values.</param>
        /// <param name="page">Current page number.</param>
        /// <param name="pageSize">Applied page size.</param>
        /// <param name="totalItems">Aggregate count across all pages.</param>
        /// <param name="totalPages">Total pages computed by query metadata.</param>
        /// <returns>A new <see cref="PaginatedResponseDto{TItem}"/> instance.</returns>
        public static PaginatedResponseDto<TItem> From(
            IReadOnlyList<TItem> items,
            int page,
            int pageSize,
            int totalItems,
            int totalPages)
        {
            return new PaginatedResponseDto<TItem>
            {
                Items = new ReadOnlyCollection<TItem>(items.ToList()),
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };
        }
    }
}
