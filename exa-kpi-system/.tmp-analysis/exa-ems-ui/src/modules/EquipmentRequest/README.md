# EquipmentRequest module (React 18 + TS + CoreUI)

This module is a migration of the legacy `EquipmentRequest` (class + PrimeReact + Joi) into the Exa EMS UI module pattern:
- React 18 functional components + hooks
- Redux Toolkit slice + async thunks
- CoreUI Pro components
- Yup validation
- Modal-based user feedback (no toasters)

## Wiring steps

1) **Register the slice** in `src/store.ts`:

```ts
import equipmentRequest from 'src/modules/EquipmentRequest/store/equipmentRequest.slice'

export const store = configureStore({
  reducer: {
    // ...
    equipmentRequest,
  },
})
```

2) **Add routes** in `src/routes.tsx` (lazy-load recommended):

```tsx
const EquipmentRequestListPage = lazy(() => import('src/modules/EquipmentRequest/pages/EquipmentRequestListPage'))
const EquipmentRequestEditPage = lazy(() => import('src/modules/EquipmentRequest/pages/EquipmentRequestEditPage'))

{
  path: '/depot-main/equipment-request',
  name: 'Equipment Requests',
  element: <EquipmentRequestListPage />,
},
{
  path: '/depot-main/equipment-request/new',
  name: 'New Equipment Request',
  element: <EquipmentRequestEditPage />,
},
{
  path: '/depot-main/equipment-request/:equipmentRequestId',
  name: 'Edit Equipment Request',
  element: <EquipmentRequestEditPage />,
},
```

3) **(Optional) Add nav item** in `_nav.tsx`.

## API endpoints to verify

The legacy module used:
- `/request-service` (GET/POST/PUT/DELETE)
- `/request-service/requirement` (GET)
- `/request-service/requirement/:id` (DELETE)
- `/request-service/requirement/assigned-trips/:workOrderId` (GET)
- `/attribute-service/attributes/?attribute_flat_name_id=request_type&module_flat_name_id=equipment_request` (GET)

The **clients** and **sizes** endpoints were not present in the legacy module zip (they came from other modules). This module currently calls:
- `/client-service`
- `/equipment-size-service`

Adjust those two in `api/equipmentRequest.api.ts` to match your backend.

## Behavior notes / improvements vs legacy

- Page components do not coordinate parallel requests; orchestration is inside thunks.
- Batch delete uses a **sequential** loop (no `Promise.all`) to simplify failure handling.
- Validation is Yup-based; trip validation is conditional.
- Success and error feedback uses CoreUI modals with optional next-action buttons.
