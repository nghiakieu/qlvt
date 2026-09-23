export const LOAI_NHAP = [
  { value: 'gc_moi', label: 'Nhập từ phiếu GC / Mua mới', color: 'blue' },
  { value: 'nhan_dieu_chuyen', label: 'Nhận điều chuyển', color: 'green' },
]

export const LOAI_XUAT = [
  { value: 'dieu_chuyen', label: 'Xuất điều chuyển', color: 'blue' },
  { value: 'ban_thanh_ly', label: 'Xuất thanh lý / Bán', color: 'red' },
]

export const STATUS_COLOR = {
  nhap: 'orange',
  xac_nhan: 'green',
  huy: 'red',
  dang_kiem_ke: 'orange',
  hoan_thanh: 'green',
  dang_dieu_chuyen: 'orange',
  cho_giao: 'orange',
  dang_giao: 'processing',
  cho_xuat: 'orange',
  dang_xuat: 'processing',
  chenh_lech: 'red',
  da_nhan: 'green'
}

export const STATUS_LABEL = {
  nhap: 'Nháp',
  xac_nhan: 'Đã xác nhận',
  huy: 'Đã hủy',
  dang_kiem_ke: 'Đang kiểm kê',
  hoan_thanh: 'Đã hoàn thành',
  dang_dieu_chuyen: 'Đang điều chuyển',
  cho_giao: 'Chờ giao',
  dang_giao: 'Đang giao',
  cho_xuat: 'Chờ xuất',
  dang_xuat: 'Đang xuất',
  chenh_lech: 'Chênh lệch',
  da_nhan: 'Đã nhận'
}
