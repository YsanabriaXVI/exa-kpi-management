import { describe, it, expect } from 'vitest'
import reducer, {
  loadUserFromList,
  clearSignature,
  resetStatuses,
  fetchSignaturesList,
  fetchUserSignature,
  uploadSignature,
} from '../store/fuelOrderSignature.slice'

const initialState = {
  list: [],
  user: null,
  signature: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingSignature: false,
  uploading: false,
}

const sampleUser = {
  userid: 42,
  username: 'jdoe',
  email: 'jdoe@example.com',
  signature: true,
  status: { id: 1, name: 'Active' },
}

const sampleSignature = {
  attachment_id: 42,
  name: '42.png',
  type: 'image/png',
  url: 'blob:http://localhost/abc',
  lastModified: null,
}

describe('fuelOrderSignature slice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle loadUserFromList when found', () => {
    const stateWithList = { ...initialState, list: [sampleUser] }
    const state = reducer(stateWithList, loadUserFromList(42))
    expect(state.user).toEqual(sampleUser)
  })

  it('should handle loadUserFromList when not found', () => {
    const stateWithList = { ...initialState, list: [sampleUser] }
    const state = reducer(stateWithList, loadUserFromList(999))
    expect(state.user).toBeNull()
  })

  it('should handle clearSignature', () => {
    const stateWithSig = { ...initialState, signature: sampleSignature as any }
    const state = reducer(stateWithSig, clearSignature())
    expect(state.signature).toBeNull()
  })

  it('should handle resetStatuses', () => {
    const stateWithStatuses = {
      ...initialState,
      statuses: { added: true, updated: false, deleted: false },
      errors: 'some error' as any,
    }
    const state = reducer(stateWithStatuses, resetStatuses())
    expect(state.statuses).toEqual({ added: false, updated: false, deleted: false })
    expect(state.errors).toBeNull()
  })

  // fetchSignaturesList async thunk
  it('should set loadingList on fetchSignaturesList.pending', () => {
    const action = { type: fetchSignaturesList.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingList).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should populate list on fetchSignaturesList.fulfilled', () => {
    const users = [sampleUser]
    const action = { type: fetchSignaturesList.fulfilled.type, payload: users }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.list).toEqual(users)
  })

  it('should set errors on fetchSignaturesList.rejected', () => {
    const action = { type: fetchSignaturesList.rejected.type, payload: 'Network error' }
    const state = reducer({ ...initialState, loadingList: true }, action)
    expect(state.loadingList).toBe(false)
    expect(state.errors).toBe('Network error')
  })

  // fetchUserSignature async thunk
  it('should set loadingSignature on fetchUserSignature.pending', () => {
    const action = { type: fetchUserSignature.pending.type }
    const state = reducer(initialState, action)
    expect(state.loadingSignature).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should populate signature on fetchUserSignature.fulfilled', () => {
    const action = { type: fetchUserSignature.fulfilled.type, payload: sampleSignature }
    const state = reducer({ ...initialState, loadingSignature: true }, action)
    expect(state.loadingSignature).toBe(false)
    expect(state.signature).toEqual(sampleSignature)
  })

  it('should set errors on fetchUserSignature.rejected', () => {
    const action = { type: fetchUserSignature.rejected.type, payload: 'Not found' }
    const state = reducer({ ...initialState, loadingSignature: true }, action)
    expect(state.loadingSignature).toBe(false)
    expect(state.errors).toBe('Not found')
  })

  // uploadSignature async thunk
  it('should set uploading on uploadSignature.pending', () => {
    const action = { type: uploadSignature.pending.type }
    const state = reducer(initialState, action)
    expect(state.uploading).toBe(true)
    expect(state.errors).toBeNull()
  })

  it('should set signature and statuses.added on uploadSignature.fulfilled', () => {
    const uploaded = { ...sampleSignature, success: true }
    const action = { type: uploadSignature.fulfilled.type, payload: uploaded }
    const state = reducer({ ...initialState, uploading: true }, action)
    expect(state.uploading).toBe(false)
    expect(state.signature).toEqual(uploaded)
    expect(state.statuses.added).toBe(true)
  })

  it('should set errors on uploadSignature.rejected', () => {
    const action = { type: uploadSignature.rejected.type, payload: 'Upload failed' }
    const state = reducer({ ...initialState, uploading: true }, action)
    expect(state.uploading).toBe(false)
    expect(state.errors).toBe('Upload failed')
  })
})
