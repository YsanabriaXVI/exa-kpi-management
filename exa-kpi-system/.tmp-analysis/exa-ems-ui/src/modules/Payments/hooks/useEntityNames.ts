import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { loadSubdivisions } from '../../Assets/Subdivisions/store/subdivisions.slice'
import { loadUsersList } from '../../Users/store/usersSlice'
import type { RootState, AppDispatch } from '../../../store'

export function useEntityNames() {
  const dispatch = useDispatch<AppDispatch>()
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})
  const usersState = useSelector((state: RootState) => (state as any).users || {})

  useEffect(() => {
    dispatch(loadClients())
    dispatch(loadSubdivisions())
    // Load users for name resolution (createdBy, settledBy, etc.)
    if (!usersState.users?.length) {
      dispatch(loadUsersList({ first: 0, rows: 500, search: '', filters: {} }))
    }
  }, [dispatch])

  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of clientsState.list || []) {
      const id = String(c.client_id ?? c.id ?? '')
      map.set(id, c.name || `Client #${id}`)
    }
    return map
  }, [clientsState.list])

  const subdivisionNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of subdivisionsState.list || []) {
      const id = String(s.subdivision_id ?? s.id ?? '')
      map.set(id, s.name || `Subdivision #${id}`)
    }
    return map
  }, [subdivisionsState.list])

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of usersState.users || []) {
      const id = String(u.user_id ?? u.id ?? '')
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ')
      map.set(id, name || `User #${id}`)
    }
    return map
  }, [usersState.users])

  const resolveClientName = (id: string) => clientNameMap.get(id) || `Client #${id}`
  const resolveSubdivisionName = (id: string) => subdivisionNameMap.get(id) || `Subdivision #${id}`
  const resolveUserName = (id: string | null | undefined) => {
    if (!id) return null
    return userNameMap.get(id) || `#${id}`
  }

  return { clientNameMap, subdivisionNameMap, userNameMap, resolveClientName, resolveSubdivisionName, resolveUserName }
}
