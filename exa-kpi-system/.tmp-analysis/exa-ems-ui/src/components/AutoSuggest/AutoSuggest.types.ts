/**
 * AutoSuggest Component Types
 *
 * Type definitions for the reusable AutoSuggest component.
 * This component provides dynamic, backend-integrated autocomplete functionality.
 */

/**
 * Represents a single suggestion option returned from the API
 *
 * @template T - The type of the full data object (optional)
 *
 * @example
 * const cityOption: AutoSuggestOption<City> = {
 *   value: 123,
 *   label: 'Miami (Florida, USA)',
 *   data: { city_id: 123, name: 'Miami', ... }
 * }
 */
export interface AutoSuggestOption<T = any> {
  /** The unique identifier/value to be stored (e.g., database ID) */
  value: string | number

  /** The display text shown in the dropdown and input */
  label: string

  /** Optional: The full original data object for consumer use */
  data?: T
}

/**
 * Props for the AutoSuggest component
 *
 * @template T - The type of the full data object in options
 */
export interface AutoSuggestProps<T = any> {
  // ============================================================================
  // CORE FUNCTIONALITY (Required)
  // ============================================================================

  /**
   * Callback fired when the selected value changes
   *
   * @param option - The selected option or null if cleared
   *
   * @example
   * onChange={(option) => {
   *   setFieldValue(option?.value || null)
   *   // Access full data: option?.data
   * }}
   */
  onChange: (option: AutoSuggestOption<T> | null) => void

  /**
   * Async function to search for suggestions based on user input
   *
   * @param query - The search query string
   * @returns Promise resolving to array of suggestions
   *
   * @example
   * onSearch={async (query) => {
   *   const response = await apiClient.get(`/cities?search=${query}`)
   *   return response.data.cities.map(city => ({
   *     value: city.city_id,
   *     label: city.name,
   *     data: city
   *   }))
   * }}
   */
  onSearch: (query: string) => Promise<AutoSuggestOption<T>[]>

  // ============================================================================
  // OPTIONAL CORE FUNCTIONALITY
  // ============================================================================

  /**
   * Current selected value (for controlled component)
   *
   * @default null
   *
   * @example
   * value={formData.city_id}
   */
  value?: string | number | null

  /**
   * Optional: Async function to fetch a single option by ID for pre-population
   * Required if you want to pre-populate the component from an ID
   *
   * @param id - The ID to fetch
   * @returns Promise resolving to the option or null
   *
   * @example
   * onFetchById={async (id) => {
   *   const response = await apiClient.get(`/cities/${id}`)
   *   const city = response.data.city
   *   return {
   *     value: city.city_id,
   *     label: city.name,
   *     data: city
   *   }
   * }}
   */
  onFetchById?: (id: string | number) => Promise<AutoSuggestOption<T> | null>

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Label text displayed above the input
   *
   * @example
   * label="City *"
   */
  label?: string

  /**
   * Placeholder text shown in the input when empty
   *
   * @default "Type to search..."
   */
  placeholder?: string

  /**
   * Minimum number of characters before triggering search
   *
   * @default 2
   */
  minCharacters?: number

  /**
   * Debounce delay in milliseconds before triggering search
   *
   * @default 500
   */
  debounceDelay?: number

  // ============================================================================
  // UI STATES
  // ============================================================================

  /**
   * External loading state (e.g., from parent component)
   * Component has internal loading for search operations
   */
  loading?: boolean

  /**
   * Whether the input is disabled
   */
  disabled?: boolean

  /**
   * Whether the input has invalid state (red border)
   */
  invalid?: boolean

  /**
   * Whether the input has valid state (green border)
   */
  valid?: boolean

  // ============================================================================
  // VALIDATION FEEDBACK
  // ============================================================================

  /**
   * Error message displayed when invalid={true}
   *
   * @example
   * feedbackInvalid="City is required"
   */
  feedbackInvalid?: string

  /**
   * Success message displayed when valid={true}
   *
   * @example
   * feedbackValid="Valid city selected"
   */
  feedbackValid?: string

  // ============================================================================
  // CUSTOMIZABLE MESSAGES
  // ============================================================================

  /**
   * Message shown when no results are found
   *
   * @default "No results found"
   */
  noResultsMessage?: string

  /**
   * Message shown while searching
   *
   * @default "Searching..."
   */
  loadingMessage?: string

  // ============================================================================
  // DISPLAY OPTIONS
  // ============================================================================

  /**
   * Show clear button when input has value
   *
   * @default true
   */
  cleaner?: boolean

  // ============================================================================
  // HTML ATTRIBUTES
  // ============================================================================

  /**
   * HTML id attribute for the input
   */
  id?: string

  /**
   * HTML name attribute for the input
   */
  name?: string

  /**
   * Additional CSS class names
   */
  className?: string

  /**
   * Whether the field is required
   * Adds asterisk (*) to label if true
   */
  required?: boolean
}
