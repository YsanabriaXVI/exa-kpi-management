/**
 * AutoSuggest Component
 *
 * A reusable, configurable autocomplete component that fetches suggestions
 * from a backend API with debouncing, keyboard navigation, and pre-population support.
 *
 * Features:
 * - Debounced search (default 500ms)
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Pre-population from initial value
 * - Loading states
 * - Error handling
 * - Validation support (invalid/valid states)
 * - Clear functionality
 * - Click outside to close
 * - Fully type-safe with TypeScript generics
 *
 * @example
 * <AutoSuggest
 *   value={cityId}
 *   onChange={(option) => setCityId(option?.value || null)}
 *   onSearch={searchCities}
 *   onFetchById={fetchCityById}
 *   label="City *"
 *   placeholder="Search cities..."
 *   minCharacters={3}
 *   invalid={!cityId}
 *   feedbackInvalid="City is required"
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CFormInput, CFormLabel, CFormFeedback, CSpinner } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import type { AutoSuggestProps, AutoSuggestOption } from './AutoSuggest.types'
import './AutoSuggest.scss'

const AutoSuggest = <T,>({
  value,
  onChange,
  onSearch,
  onFetchById,
  label,
  placeholder = 'Type to search...',
  minCharacters = 2,
  debounceDelay = 500,
  loading: externalLoading = false,
  disabled = false,
  invalid = false,
  valid = false,
  feedbackInvalid,
  feedbackValid,
  noResultsMessage = 'No results found',
  loadingMessage = 'Searching...',
  cleaner = true,
  id,
  name,
  className = '',
  required = false,
}: AutoSuggestProps<T>) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<AutoSuggestOption<T>[]>([])
  const [selectedOption, setSelectedOption] = useState<AutoSuggestOption<T> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // REFS
  // ============================================================================

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ============================================================================
  // PRE-POPULATION FROM VALUE PROP
  // ============================================================================

  /**
   * Effect to handle pre-population when value prop changes
   * Fetches the full option data using onFetchById if provided
   */
  useEffect(() => {
    // If value exists and we have a fetch function, and we haven't already loaded this value
    if (value !== undefined && value !== null && onFetchById && selectedOption?.value !== value) {
      fetchInitialValue(value)
    }
    // If value is cleared externally, clear the component
    else if ((value === null || value === undefined) && selectedOption) {
      handleClear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  /**
   * Fetches initial value using onFetchById callback
   */
  const fetchInitialValue = async (id: string | number) => {
    if (!onFetchById) return

    setIsLoading(true)
    setError(null)

    try {
      const option = await onFetchById(id)
      if (option) {
        setSelectedOption(option)
        setInputValue(option.label)
      } else {
        // Value exists but couldn't be fetched
        setError('Failed to load initial value')
      }
    } catch (err: any) {
      console.error('AutoSuggest: Error fetching initial value:', err)
      setError(err.message || 'Failed to load initial value')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // INPUT CHANGE HANDLER WITH DEBOUNCE
  // ============================================================================

  /**
   * Handles input change with debouncing
   * Clears selection when user types and triggers search after delay
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setInputValue(query)
    setSelectedOption(null) // Clear selection when user types
    setHighlightedIndex(-1)
    setError(null)

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Don't search if below minimum characters
    if (query.length < minCharacters) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    // Show dropdown and start loading
    setIsLoading(true)
    setShowDropdown(true)

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, debounceDelay)
  }

  /**
   * Performs the actual search using the onSearch callback
   */
  const performSearch = async (query: string) => {
    try {
      setError(null)
      const results = await onSearch(query)
      setSuggestions(results)

      // If no results, still show dropdown with "no results" message
      if (results.length === 0) {
        setShowDropdown(true)
      }
    } catch (err: any) {
      console.error('AutoSuggest: Search error:', err)
      setError(err.message || 'Search failed')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // SELECTION HANDLER
  // ============================================================================

  /**
   * Handles selection of a suggestion
   */
  const handleSelectOption = useCallback(
    (option: AutoSuggestOption<T>) => {
      setSelectedOption(option)
      setInputValue(option.label)
      setShowDropdown(false)
      setSuggestions([])
      setHighlightedIndex(-1)
      setError(null)
      onChange(option)
    },
    [onChange],
  )

  // ============================================================================
  // CLEAR HANDLER
  // ============================================================================

  /**
   * Clears the input and selection
   */
  const handleClear = useCallback(() => {
    setInputValue('')
    setSelectedOption(null)
    setSuggestions([])
    setShowDropdown(false)
    setError(null)
    setHighlightedIndex(-1)
    onChange(null)
    inputRef.current?.focus()
  }, [onChange])

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  /**
   * Handles keyboard navigation (Arrow Up/Down, Enter, Escape)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break

      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break

      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectOption(suggestions[highlightedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setHighlightedIndex(-1)
        break

      default:
        break
    }
  }

  /**
   * Handles input focus - shows dropdown if there are suggestions or if minimum chars met
   */
  const handleInputFocus = () => {
    if (inputValue.length >= minCharacters && suggestions.length > 0) {
      setShowDropdown(true)
    }
  }

  // ============================================================================
  // CLICK OUTSIDE TO CLOSE
  // ============================================================================

  /**
   * Effect to handle clicking outside the component to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ============================================================================
  // CLEANUP DEBOUNCE ON UNMOUNT
  // ============================================================================

  /**
   * Cleanup effect to clear debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const loading = isLoading || externalLoading
  const showClearButton = cleaner && inputValue && !loading && !disabled

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`autosuggest-wrapper ${className}`}>
      {/* Label */}
      {label && (
        <CFormLabel htmlFor={id}>
          {label} {required && <span className="text-danger">*</span>}
        </CFormLabel>
      )}

      {/* Input Container */}
      <div className="autosuggest-input-wrapper">
        {/* Main Input Field */}
        <CFormInput
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          invalid={invalid}
          valid={valid}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={`${id}-dropdown`}
        />

        {/* Loading Spinner */}
        {loading && (
          <div className="autosuggest-icon-container">
            <CSpinner size="sm" className="autosuggest-spinner" color="primary" />
          </div>
        )}

        {/* Clear Button */}
        {showClearButton && (
          <button
            type="button"
            className="autosuggest-clear-btn"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear selection"
          >
            <CIcon icon={cilX} size="sm" />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div ref={dropdownRef} className="autosuggest-dropdown" id={`${id}-dropdown`} role="listbox">
            {/* Loading State */}
            {loading && <div className="autosuggest-dropdown-message">{loadingMessage}</div>}

            {/* Error State */}
            {!loading && error && <div className="autosuggest-dropdown-error">{error}</div>}

            {/* No Results */}
            {!loading && !error && suggestions.length === 0 && (
              <div className="autosuggest-dropdown-message">{noResultsMessage}</div>
            )}

            {/* Suggestions List */}
            {!loading && !error && suggestions.length > 0 && (
              <ul className="autosuggest-dropdown-list">
                {suggestions.map((option, index) => (
                  <li
                    key={`${option.value}-${index}`}
                    className={`autosuggest-dropdown-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={index === highlightedIndex}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Validation Feedback */}
      {feedbackInvalid && invalid && <CFormFeedback invalid>{feedbackInvalid}</CFormFeedback>}
      {feedbackValid && valid && <CFormFeedback valid>{feedbackValid}</CFormFeedback>}
    </div>
  )
}

// Export with proper display name for React DevTools
AutoSuggest.displayName = 'AutoSuggest'

export default AutoSuggest
