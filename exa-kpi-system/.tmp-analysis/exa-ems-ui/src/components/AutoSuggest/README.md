# AutoSuggest Component

A reusable, type-safe autocomplete component for dynamically fetching and displaying suggestions from backend APIs.

## Features

✅ **Debounced Search** - Prevents excessive API calls with configurable delay (default 500ms)
✅ **Keyboard Navigation** - Full keyboard support (Arrow Up/Down, Enter, Escape)
✅ **Pre-population** - Automatically fetches and displays initial values
✅ **Loading States** - Built-in loading indicators
✅ **Error Handling** - Graceful error messages
✅ **Validation** - Supports invalid/valid states with custom feedback
✅ **Clear Functionality** - Quick reset with clear button
✅ **TypeScript Generic** - Fully type-safe with generic data types
✅ **CoreUI Integration** - Follows CoreUI design system
✅ **Responsive** - Mobile-optimized with larger tap targets
✅ **Accessible** - ARIA attributes for screen readers
✅ **Dark Mode** - Automatic support via CoreUI design tokens

---

## Installation

The component is already installed in the project. No additional dependencies required.

---

## Basic Usage

```typescript
import { AutoSuggest } from '@/components'
import type { AutoSuggestOption } from '@/components'
import { useState } from 'react'
import apiClient from '@/services/api/axios.config'

const MyForm: React.FC = () => {
  const [cityId, setCityId] = useState<number | null>(null)

  // Search function - called as user types
  const searchCities = async (query: string): Promise<AutoSuggestOption[]> => {
    const response = await apiClient.get(`/cities?search=${query}`)
    return response.data.cities.map(city => ({
      value: city.city_id,
      label: `${city.name} (${city.department?.name})`,
      data: city  // Optional: full object for later use
    }))
  }

  // Fetch by ID - called for pre-population (optional)
  const fetchCityById = async (id: number): Promise<AutoSuggestOption | null> => {
    const response = await apiClient.get(`/cities/${id}`)
    const city = response.data.city
    return {
      value: city.city_id,
      label: city.name,
      data: city
    }
  }

  return (
    <AutoSuggest
      label="City *"
      value={cityId}
      onChange={(option) => setCityId(option?.value as number || null)}
      onSearch={searchCities}
      onFetchById={fetchCityById}
      placeholder="Search cities..."
      minCharacters={3}
      invalid={!cityId}
      feedbackInvalid="City is required"
    />
  )
}
```

---

## Props API

### Core Props (Required)

| Prop | Type | Description |
|------|------|-------------|
| `onChange` | `(option: AutoSuggestOption \| null) => void` | Callback when selection changes |
| `onSearch` | `(query: string) => Promise<AutoSuggestOption[]>` | Async function to fetch suggestions |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number \| null` | `null` | Current selected value (controlled) |
| `onFetchById` | `(id) => Promise<AutoSuggestOption \| null>` | - | Fetch single option by ID (for pre-population) |
| `label` | `string` | - | Label text above input |
| `placeholder` | `string` | `"Type to search..."` | Placeholder text |
| `minCharacters` | `number` | `2` | Min chars before search triggers |
| `debounceDelay` | `number` | `500` | Debounce delay in milliseconds |
| `loading` | `boolean` | `false` | External loading state |
| `disabled` | `boolean` | `false` | Disable the input |
| `invalid` | `boolean` | `false` | Show invalid state (red border) |
| `valid` | `boolean` | `false` | Show valid state (green border) |
| `feedbackInvalid` | `string` | - | Error message when invalid |
| `feedbackValid` | `string` | - | Success message when valid |
| `noResultsMessage` | `string` | `"No results found"` | Message when no results |
| `loadingMessage` | `string` | `"Searching..."` | Message while loading |
| `cleaner` | `boolean` | `true` | Show clear button |
| `id` | `string` | - | HTML id attribute |
| `name` | `string` | - | HTML name attribute |
| `className` | `string` | `""` | Additional CSS classes |
| `required` | `boolean` | `false` | Show asterisk in label |

---

## Examples

### Example 1: Simple City Search

```typescript
const [cityId, setCityId] = useState<number | null>(null)

const searchCities = async (query: string) => {
  const response = await apiClient.get(`/cities?search=${query}`)
  return response.data.cities.map(city => ({
    value: city.city_id,
    label: `${city.name} (${city.department?.name}, ${city.country?.name})`,
    data: city
  }))
}

const fetchCityById = async (id: number) => {
  const response = await apiClient.get(`/cities/${id}`)
  const city = response.data.city
  return {
    value: city.city_id,
    label: `${city.name} (${city.department?.name})`,
    data: city
  }
}

<AutoSuggest
  label="City *"
  value={cityId}
  onChange={(option) => {
    setCityId(option?.value as number || null)
    // Access full city data: option?.data
  }}
  onSearch={searchCities}
  onFetchById={fetchCityById}
  placeholder="Search cities..."
  minCharacters={3}
  debounceDelay={300}
  invalid={!cityId}
  feedbackInvalid="City is required"
/>
```

### Example 2: With Module API Class

```typescript
import { companiesAPI } from '../api/companies.api'

const [companyId, setCompanyId] = useState<number | null>(null)

const searchCompanies = async (query: string) => {
  const companies = await companiesAPI.searchCompanies(query)
  return companies.map(c => ({
    value: c.company_id,
    label: c.name,
    data: c
  }))
}

const fetchCompany = async (id: number) => {
  const company = await companiesAPI.getCompany(id)
  return {
    value: company.company_id,
    label: company.name,
    data: company
  }
}

<AutoSuggest
  value={companyId}
  onChange={(opt) => setCompanyId(opt?.value as number || null)}
  onSearch={searchCompanies}
  onFetchById={fetchCompany}
  label="Company"
  placeholder="Search companies..."
/>
```

### Example 3: With Custom Filtering

```typescript
const EquipmentForm: React.FC<{ sizeFilter?: string }> = ({ sizeFilter }) => {
  const searchEquipment = async (query: string) => {
    const response = await apiClient.get(`/equipment?query=${query}`)

    // Custom client-side filtering
    let results = response.data.items
    if (sizeFilter) {
      results = results.filter(item => item.size === sizeFilter)
    }

    return results.map(item => ({
      value: item.id,
      label: `${item.name} - Size: ${item.size}`,
      data: item
    }))
  }

  return (
    <AutoSuggest
      onSearch={searchEquipment}
      label="Equipment"
      placeholder="Search equipment..."
    />
  )
}
```

### Example 4: With Formik

```typescript
import { useFormik } from 'formik'

const formik = useFormik({
  initialValues: { cityId: null },
  onSubmit: (values) => console.log(values),
})

<AutoSuggest
  value={formik.values.cityId}
  onChange={(option) => formik.setFieldValue('cityId', option?.value || null)}
  onSearch={searchCities}
  onFetchById={fetchCityById}
  label="City"
  invalid={formik.touched.cityId && Boolean(formik.errors.cityId)}
  feedbackInvalid={formik.errors.cityId}
/>
```

### Example 5: Without Pre-population

If you don't need pre-population from an ID, you can omit `onFetchById`:

```typescript
<AutoSuggest
  onChange={(option) => console.log(option)}
  onSearch={searchItems}
  // No onFetchById - no pre-population
  placeholder="Search items..."
/>
```

---

## TypeScript Usage

### Defining Custom Types

```typescript
interface City {
  city_id: number
  name: string
  department: { name: string }
  country: { name: string }
}

// Use generic type for type-safe data access
const searchCities = async (query: string): Promise<AutoSuggestOption<City>[]> => {
  const response = await apiClient.get(`/cities?search=${query}`)
  return response.data.cities.map((city: City) => ({
    value: city.city_id,
    label: `${city.name} (${city.department.name})`,
    data: city  // TypeScript knows this is type City
  }))
}

// onChange callback is also type-safe
<AutoSuggest<City>
  onChange={(option) => {
    if (option) {
      // TypeScript knows option.data is City | undefined
      console.log(option.data?.department.name)
    }
  }}
  onSearch={searchCities}
/>
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Arrow Down** | Highlight next suggestion |
| **Arrow Up** | Highlight previous suggestion |
| **Enter** | Select highlighted suggestion |
| **Escape** | Close dropdown |
| **Tab** | Close dropdown, move to next field |

---

## Styling & Customization

### Using Custom CSS Classes

```typescript
<AutoSuggest
  className="my-custom-class"
  onSearch={searchItems}
  onChange={handleChange}
/>
```

```scss
// In your SCSS file
.my-custom-class {
  .autosuggest-dropdown {
    max-height: 400px; // Custom dropdown height
  }

  .autosuggest-dropdown-item {
    padding: 15px; // Custom item padding
  }
}
```

### Theming

The component automatically supports light/dark mode through CoreUI design tokens. No additional configuration needed.

---

## Best Practices

### 1. **Always Debounce**
Use the default 500ms or adjust based on your API response time:
```typescript
<AutoSuggest debounceDelay={300} />  // Faster for local APIs
<AutoSuggest debounceDelay={800} />  // Slower for external APIs
```

### 2. **Set Minimum Characters**
Prevent searching with too few characters:
```typescript
<AutoSuggest minCharacters={3} />  // Good for large datasets
```

### 3. **Handle Errors Gracefully**
Always wrap API calls in try-catch:
```typescript
const searchItems = async (query: string) => {
  try {
    const response = await apiClient.get(`/items?q=${query}`)
    return response.data.items.map(/* ... */)
  } catch (error) {
    console.error('Search failed:', error)
    return []  // Return empty array on error
  }
}
```

### 4. **Provide Clear Labels**
Format labels to include context:
```typescript
// ❌ Bad
label: city.name  // "Miami"

// ✅ Good
label: `${city.name} (${city.department?.name}, ${city.country?.name})`  // "Miami (Florida, USA)"
```

### 5. **Use onFetchById for Pre-population**
If you have an initial value (e.g., editing a form), provide `onFetchById`:
```typescript
<AutoSuggest
  value={editingItem.cityId}
  onFetchById={fetchCityById}  // Will fetch and display city on mount
/>
```

### 6. **Store Full Data**
Use the `data` property to store the full object for later use:
```typescript
onChange={(option) => {
  setFieldId(option?.value || null)
  setFullData(option?.data || null)  // Store full object
}}
```

---

## Performance Tips

### 1. **Backend Pagination**
For large datasets, implement server-side pagination:
```typescript
const searchItems = async (query: string) => {
  const response = await apiClient.get(`/items?q=${query}&limit=50`)
  return response.data.items.slice(0, 50).map(/* ... */)
}
```

### 2. **Memoize Search Function**
Use `useCallback` to prevent unnecessary re-renders:
```typescript
const searchItems = useCallback(async (query: string) => {
  // ... search logic
}, [/* dependencies */])
```

### 3. **Implement Caching (Optional)**
For static or rarely-changing data, cache results:
```typescript
const cache = useRef<Map<string, AutoSuggestOption[]>>(new Map())

const searchItemsWithCache = async (query: string) => {
  if (cache.current.has(query)) {
    return cache.current.get(query)!
  }

  const results = await apiClient.get(`/items?q=${query}`)
  const options = results.data.items.map(/* ... */)
  cache.current.set(query, options)
  return options
}
```

---

## Troubleshooting

### Issue: Dropdown doesn't appear

**Cause:** Not enough characters typed
**Solution:** Check `minCharacters` prop (default is 2)

```typescript
<AutoSuggest minCharacters={1} />  // Search after 1 character
```

### Issue: "No results found" always shows

**Cause:** `onSearch` returning wrong format or empty array
**Solution:** Ensure you return `AutoSuggestOption[]`:

```typescript
const searchItems = async (query: string) => {
  const response = await apiClient.get(`/items?q=${query}`)

  // ❌ Wrong - returning raw API response
  return response.data.items

  // ✅ Correct - mapping to AutoSuggestOption[]
  return response.data.items.map(item => ({
    value: item.id,
    label: item.name,
    data: item
  }))
}
```

### Issue: Pre-population doesn't work

**Cause:** Missing `onFetchById` prop
**Solution:** Provide the fetch function:

```typescript
<AutoSuggest
  value={initialValue}
  onFetchById={fetchById}  // Required for pre-population
/>
```

### Issue: Too many API calls

**Cause:** Debounce delay too short
**Solution:** Increase `debounceDelay`:

```typescript
<AutoSuggest debounceDelay={800} />  // Wait 800ms before searching
```

### Issue: Clear button not showing

**Cause:** `cleaner` prop set to false
**Solution:** Enable it:

```typescript
<AutoSuggest cleaner={true} />  // Or omit (true by default)
```

---

## Accessibility

The component follows WAI-ARIA best practices:

- ✅ `aria-autocomplete="list"` on input
- ✅ `aria-expanded` indicates dropdown state
- ✅ `aria-selected` on highlighted option
- ✅ `role="listbox"` on dropdown
- ✅ `role="option"` on suggestions
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ High contrast mode support
- ✅ Reduced motion support

---

## Browser Support

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile Safari (iOS 12+)
- ✅ Chrome Mobile (Android 8+)

---

## FAQ

### Q: Can I use this with Formik?
**A:** Yes! See [Example 4: With Formik](#example-4-with-formik)

### Q: Does it support multi-select?
**A:** No, this component is for single selection only. Use CoreUI's `CMultiSelect` for multi-select.

### Q: Can I customize the dropdown styling?
**A:** Yes, add a custom className and override styles. See [Styling & Customization](#styling--customization)

### Q: How do I disable the component?
**A:** Use the `disabled` prop:
```typescript
<AutoSuggest disabled={true} />
```

### Q: Can I use it without pre-population?
**A:** Yes, simply omit the `onFetchById` prop and don't pass an initial `value`.

### Q: Is it compatible with React 18?
**A:** Yes, it's built with React 19 but backwards compatible with React 18.

### Q: Does it work with Redux/Context?
**A:** Yes, it's framework-agnostic. Just pass values from your state management:
```typescript
const dispatch = useDispatch()
const value = useSelector(state => state.form.cityId)

<AutoSuggest
  value={value}
  onChange={(option) => dispatch(setCityId(option?.value))}
/>
```

---

## Contributing

If you find bugs or have suggestions for improvements:

1. Check if the issue already exists
2. Create a detailed bug report or feature request
3. Include code examples and expected vs actual behavior
4. Test your changes thoroughly before submitting

---

## License

MIT - Internal use only within EMS-UI project

---

## Related Components

- **CFormInput** - Basic text input (CoreUI)
- **CFormSelect** - Standard dropdown (CoreUI)
- **CMultiSelect** - Multi-select dropdown (CoreUI)
- **CAutocomplete** - Static autocomplete (CoreUI)

---

## Support

For questions or issues, contact the EMS-UI development team or check the main project documentation.
