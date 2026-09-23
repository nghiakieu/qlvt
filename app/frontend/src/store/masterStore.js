import { create } from 'zustand'
import { masterApi } from '../services/api'

export const useMasterStore = create((set, get) => ({
  khoList: [],
  nhomList: [],
  dvtList: [],
  isLoadingKho: false,
  isLoadingNhom: false,
  isLoadingDvt: false,

  fetchKho: async (force = false) => {
    if (!force && get().khoList.length > 0) return
    set({ isLoadingKho: true })
    try {
      const res = await masterApi.getKho()
      set({ khoList: res.data })
    } catch (e) {
      console.error('Failed to fetch kho', e)
    } finally {
      set({ isLoadingKho: false })
    }
  },

  fetchNhom: async (force = false) => {
    if (!force && get().nhomList.length > 0) return
    set({ isLoadingNhom: true })
    try {
      const res = await masterApi.getNhomVatTu()
      set({ nhomList: res.data })
    } catch (e) {
      console.error('Failed to fetch nhom vat tu', e)
    } finally {
      set({ isLoadingNhom: false })
    }
  },

  fetchDvt: async (force = false) => {
    if (!force && get().dvtList.length > 0) return
    set({ isLoadingDvt: true })
    try {
      const res = await masterApi.getDonViTinh()
      set({ dvtList: res.data })
    } catch (e) {
      console.error('Failed to fetch dvt', e)
    } finally {
      set({ isLoadingDvt: false })
    }
  },
}))
