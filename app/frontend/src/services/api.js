import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

import { message } from 'antd'

api.interceptors.response.use(
  response => response,
  error => {
    // Nếu có lỗi từ server trả về qua response
    if (error.response) {
      // 401 Unauthorized, 403 Forbidden, 500 Internal Server Error, etc.
      // 400 Bad Request thường đã được handle riêng bởi từng component, nhưng ta có thể handle chung nếu muốn.
      if (error.response.status >= 500) {
        message.error('Lỗi máy chủ! Vui lòng thử lại sau.')
      }
    } else if (error.request) {
      message.error('Không thể kết nối đến máy chủ. Kiểm tra mạng của bạn.')
    } else {
      message.error(`Lỗi: ${error.message}`)
    }
    return Promise.reject(error)
  }
)

// ─── DASHBOARD ───
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
}

// ─── DANH MỤC HỆ THỐNG ───
export const masterApi = {
  // Kho
  getKho: () => api.get('/master/kho'),
  createKho: (data) => api.post('/master/kho', data),
  updateKho: (id, data) => api.put(`/master/kho/${id}`, data),
  deleteKho: (id) => api.delete(`/master/kho/${id}`),

  // Nhóm vật tư
  getNhomVatTu: () => api.get('/master/nhom-vat-tu'),
  createNhomVatTu: (data) => api.post('/master/nhom-vat-tu', data),
  updateNhomVatTu: (id, data) => api.put(`/master/nhom-vat-tu/${id}`, data),
  deleteNhomVatTu: (id) => api.delete(`/master/nhom-vat-tu/${id}`),

  // Đơn vị tính
  getDonViTinh: () => api.get('/master/don-vi-tinh'),
  createDonViTinh: (data) => api.post('/master/don-vi-tinh', data),
  updateDonViTinh: (id, data) => api.put(`/master/don-vi-tinh/${id}`, data),
  deleteDonViTinh: (id) => api.delete(`/master/don-vi-tinh/${id}`),

  // Công trình
  getCongTrinh: () => api.get('/master/cong-trinh'),
  createCongTrinh: (data) => api.post('/master/cong-trinh', data),
  updateCongTrinh: (id, data) => api.put(`/master/cong-trinh/${id}`, data),
  deleteCongTrinh: (id) => api.delete(`/master/cong-trinh/${id}`),

  // Vị trí kho
  getViTri: () => api.get('/master/vi-tri'),
  createViTri: (data) => api.post('/master/vi-tri', data),
  updateViTri: (id, data) => api.put(`/master/vi-tri/${id}`, data),
  deleteViTri: (id) => api.delete(`/master/vi-tri/${id}`),
}

// ─── VẬT TƯ ───
export const vatTuApi = {
  getList: (params) => api.get('/vat-tu/', { params }),
  create: (data) => api.post('/vat-tu/', data),
  update: (id, data) => api.put(`/vat-tu/${id}`, data),
  delete: (id) => api.delete(`/vat-tu/${id}`),
}

// ─── TỒN KHO ───
export const tonKhoApi = {
  getList: (params) => api.get('/ton-kho/', { params }),
}

// ─── PHIẾU NHẬP ───
export const nhapKhoApi = {
  getList: (params) => api.get('/nhap-kho/', { params }),
  getDetail: (id) => api.get(`/nhap-kho/${id}`),
  create: (data) => api.post('/nhap-kho/', data),
  update: (id, data) => api.put(`/nhap-kho/${id}`, data),
  xacNhan: (id) => api.post(`/nhap-kho/${id}/xac-nhan`),
  delete: (id) => api.delete(`/nhap-kho/${id}`),
}

// ─── PHIẾU XUẤT ───
export const xuatKhoApi = {
  getList: (params) => api.get('/xuat-kho/', { params }),
  getDetail: (id) => api.get(`/xuat-kho/${id}`),
  create: (data) => api.post('/xuat-kho/', data),
  update: (id, data) => api.put(`/xuat-kho/${id}`, data),
  xacNhan: (id) => api.post(`/xuat-kho/${id}/xac-nhan`),
  delete: (id) => api.delete(`/xuat-kho/${id}`),
}

// ─── ĐIỀU CHUYỂN ───
  export const dieuChuyenApi = {
  getList: (params) => api.get('/dieu-chuyen/', { params }),
  getDetail: (id) => api.get(`/dieu-chuyen/${id}`),
  create: (data) => api.post('/dieu-chuyen/', data),
  update: (id, data) => api.put(`/dieu-chuyen/${id}`, data),
  delete: (id) => api.delete(`/dieu-chuyen/${id}`),
  taoPhieuXuat: (id, data) => api.post(`/dieu-chuyen/${id}/tao-phieu-xuat`, data),
  tinhHinh: (id) => api.get(`/dieu-chuyen/${id}/tinh-hinh`),
  hoanThanh: (id) => api.post(`/dieu-chuyen/${id}/hoan-thanh`),
  exportExcel: (id) => api.get(`/dieu-chuyen/${id}/export-excel`, { responseType: 'blob' }),
  exportMauLdc: (id) => api.get(`/dieu-chuyen/${id}/export-mau-ldc`, { responseType: 'blob' }),
  importExcel: (formData) => api.post('/dieu-chuyen/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  xacNhanNhan: (id, data) => api.post(`/dieu-chuyen/${id}/xac-nhan-nhan`, data), // Legacy
}

// ─── GIA CÔNG / MUA MỚI ───
export const giaCongApi = {
  getList: (params) => api.get('/gia-cong/', { params }),
  getDetail: (id) => api.get(`/gia-cong/${id}`),
  create: (data) => api.post('/gia-cong/', data),
  update: (id, data) => api.put(`/gia-cong/${id}`, data),
  delete: (id) => api.delete(`/gia-cong/${id}`),
  taoPhieuNhap: (id, data) => api.post(`/gia-cong/${id}/tao-phieu-nhap`, data),
  tinhHinh: (id) => api.get(`/gia-cong/${id}/tinh-hinh`),
  hoanThanh: (id) => api.post(`/gia-cong/${id}/hoan-thanh`),
}

// ─── KIỂM KÊ ───
export const kiemKeApi = {
  getList: (params) => api.get('/kiem-ke/', { params }),
  getDetail: (id) => api.get(`/kiem-ke/${id}`),
  create: (data) => api.post('/kiem-ke/', data),
  duyet: (id) => api.post(`/kiem-ke/${id}/duyet`),
  delete: (id) => api.delete(`/kiem-ke/${id}`),
}

// ─── BÁO CÁO ───
export const baoCaoApi = {
  tongHopTonKho: (params) => api.get('/bao-cao/tong-hop-ton-kho', { params }),
  tonKhoCongTrinh: (params) => api.get('/bao-cao/ton-kho-cong-trinh', { params }),
  exportTonKho: (params) => api.get('/bao-cao/export-excel', { params, responseType: 'blob' }),
  nhapXuatTon: (params) => api.get('/bao-cao/nhap-xuat-ton', { params }),
  exportNxt: (params) => api.get('/bao-cao/export-nxt-excel', { params, responseType: 'blob' }),
}

export default api
