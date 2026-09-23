export const printPhieu = (phieu, type) => {
  const isNhap = type === 'nhap'
  const title = isNhap ? 'PHIẾU NHẬP' : 'PHIẾU XUẤT'
  const ngay = isNhap ? phieu.ngay_nhap : phieu.ngay_xuat
  const doiTac = isNhap ? `Đơn vị giao: <b>${phieu.don_vi_giao || '—'}</b>` : `Nơi nhận / CT: <b>${phieu.kho_nhan?.ten_kho || '—'}</b>`

  let rows = ''
  let tong_sl = 0
  let tong_kg = 0

  phieu.chi_tiet.forEach((ct, i) => {
    tong_sl += ct.so_luong
    tong_kg += ct.so_luong_kg || 0
    rows += `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align: left">${ct.vat_tu?.ma_hang || ''}</td>
        <td style="text-align: left">${ct.vat_tu?.ten_hang || ''}</td>
        <td>${ct.vat_tu?.dvt_phu || 'Kg'}</td>
        <td style="text-align: right">${ct.so_luong.toLocaleString('vi-VN')}</td>
        <td style="text-align: right">${(ct.so_luong_kg || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
        <td>${ct.ghi_chu || ''}</td>
      </tr>
    `
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>In ${title}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: #000; }
        h2 { text-align: center; margin: 0; font-size: 20px; }
        .text-center { text-align: center; }
        .flex { display: flex; justify-content: space-between; }
        .mb-2 { margin-bottom: 10px; }
        .mt-4 { margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { font-weight: bold; }
        .signature { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 500)">
      <div class="flex mb-2">
        <div>
          <b>CÔNG TY CP ĐTXD GIAO THÔNG PHƯƠNG THÀNH</b><br/>
          Vị trí tập kết: ${isNhap ? phieu.kho?.ten_kho : phieu.kho_xuat?.ten_kho}
        </div>
        <div style="text-align: right">
          Mẫu số: 01-VT<br/>
          Số phiếu: <b>${phieu.so_phieu}</b>
        </div>
      </div>
      
      <div class="mt-4 mb-2">
        <h2>${title}</h2>
        <div class="text-center"><i>Ngày ${ngay.split('-')[2]} tháng ${ngay.split('-')[1]} năm ${ngay.split('-')[0]}</i></div>
      </div>
      
      <div>
        ${doiTac}<br/>
        Biển số xe: <b>${phieu.bien_so_xe || '—'}</b><br/>
        Ghi chú: ${phieu.ghi_chu || '—'}
      </div>
      
      <table>
        <thead>
          <tr>
            <th width="5%">STT</th>
            <th width="15%">Mã hàng</th>
            <th width="35%">Tên vật tư, quy cách</th>
            <th width="10%">ĐVT</th>
            <th width="10%">Số lượng</th>
            <th width="10%">Trọng lượng (Kg)</th>
            <th width="15%">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold">
            <td colspan="4" style="text-align: center">Tổng cộng</td>
            <td style="text-align: right">${tong_sl.toLocaleString('vi-VN')}</td>
            <td style="text-align: right">${tong_kg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <div class="signature">
        <div>
          <b>Người lập phiếu</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Người giao hàng</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Thủ kho</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Phụ trách bộ phận</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

export const printDieuChuyen = (phieu) => {
  const ngay = phieu.ngay_dc || ''
  
  let rows = ''
  let tong_gui_sl = 0
  let tong_nhan_sl = 0

  phieu.chi_tiet.forEach((ct, i) => {
    tong_gui_sl += ct.so_luong_gui
    tong_nhan_sl += ct.so_luong_nhan || 0
    rows += `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align: left">${ct.vat_tu?.ma_hang || ''}</td>
        <td style="text-align: left">${ct.vat_tu?.ten_hang || ''}</td>
        <td>${ct.vat_tu?.dvt_phu || 'Kg'}</td>
        <td style="text-align: right">${ct.so_luong_gui.toLocaleString('vi-VN')}</td>
        <td style="text-align: right">${(ct.so_luong_nhan !== null ? ct.so_luong_nhan : '').toLocaleString('vi-VN')}</td>
        <td>${ct.ly_do_chenh_lech || ''}</td>
      </tr>
    `
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>In Phiếu Điều Chuyển</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: #000; }
        h2 { text-align: center; margin: 0; font-size: 20px; }
        .text-center { text-align: center; }
        .flex { display: flex; justify-content: space-between; }
        .mb-2 { margin-bottom: 10px; }
        .mt-4 { margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { font-weight: bold; }
        .signature { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 500)">
      <div class="flex mb-2">
        <div>
          <b>CÔNG TY CP ĐTXD GIAO THÔNG PHƯƠNG THÀNH</b><br/>
          Từ nơi xuất: <b>${phieu.kho_xuat?.ten_kho || ''}</b><br/>
          Đến nơi nhận: <b>${phieu.kho_nhan?.ten_kho || ''}</b>
        </div>
        <div style="text-align: right">
          Mẫu số: 02-VT<br/>
          Số phiếu: <b>${phieu.so_phieu}</b>
        </div>
      </div>
      
      <div class="mt-4 mb-2">
        <h2>PHIẾU ĐIỀU CHUYỂN NỘI BỘ</h2>
        <div class="text-center"><i>Ngày ${ngay.split('-')[2] || ''} tháng ${ngay.split('-')[1] || ''} năm ${ngay.split('-')[0] || ''}</i></div>
      </div>
      
      <div>
        Lệnh điều động số: <b>${phieu.phieu_xuat_goc?.so_lenh_dieu_dong || '—'}</b><br/>
        Biển số xe: <b>${phieu.phieu_xuat_goc?.bien_so_xe || '—'}</b><br/>
        Ghi chú: ${phieu.ghi_chu || '—'}
      </div>
      
      <table>
        <thead>
          <tr>
            <th width="5%">STT</th>
            <th width="15%">Mã hàng</th>
            <th width="35%">Tên vật tư, quy cách</th>
            <th width="10%">ĐVT</th>
            <th width="10%">Thực xuất</th>
            <th width="10%">Thực nhận</th>
            <th width="15%">Ghi chú (Lý do chênh lệch)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="font-weight: bold">
            <td colspan="4" style="text-align: center">Tổng cộng</td>
            <td style="text-align: right">${tong_gui_sl.toLocaleString('vi-VN')}</td>
            <td style="text-align: right">${tong_nhan_sl ? tong_nhan_sl.toLocaleString('vi-VN') : ''}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <div class="signature">
        <div>
          <b>Thủ kho xuất</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Người vận chuyển</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Thủ kho nhận</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
      </div>
    </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

export const printKiemKe = (phieu) => {
  const ngay = phieu.ngay_kiem_ke || ''
  
  let rows = ''
  
  phieu.chi_tiet.forEach((ct, i) => {
    const isChenhLech = ct.so_luong_thuc_te !== ct.so_luong_so_sach
    rows += `
      <tr style="${isChenhLech ? 'color: red;' : ''}">
        <td>${i + 1}</td>
        <td style="text-align: left">${ct.vat_tu?.ma_hang || ''}</td>
        <td style="text-align: left">${ct.vat_tu?.ten_hang || ''}</td>
        <td>${ct.vat_tu?.dvt_phu || 'Kg'}</td>
        <td style="text-align: right">${ct.so_luong_so_sach.toLocaleString('vi-VN')}</td>
        <td style="text-align: right">${(ct.so_luong_thuc_te !== null ? ct.so_luong_thuc_te : '').toLocaleString('vi-VN')}</td>
        <td style="text-align: right">${(ct.so_luong_thuc_te !== null ? ct.so_luong_thuc_te - ct.so_luong_so_sach : 0).toLocaleString('vi-VN')}</td>
        <td>${ct.ly_do || ''}</td>
      </tr>
    `
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>In Phiếu Kiểm Kê</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.5; color: #000; }
        h2 { text-align: center; margin: 0; font-size: 20px; }
        .text-center { text-align: center; }
        .flex { display: flex; justify-content: space-between; }
        .mb-2 { margin-bottom: 10px; }
        .mt-4 { margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { font-weight: bold; }
        .signature { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 500)">
      <div class="flex mb-2">
        <div>
          <b>CÔNG TY CP ĐTXD GIAO THÔNG PHƯƠNG THÀNH</b><br/>
          Vị trí kiểm kê: <b>${phieu.kho?.ten_kho || ''}</b>
        </div>
        <div style="text-align: right">
          Mẫu số: 03-VT<br/>
          Số phiếu: <b>${phieu.so_phieu}</b>
        </div>
      </div>
      
      <div class="mt-4 mb-2">
        <h2>PHIẾU KIỂM KÊ VẬT TƯ</h2>
        <div class="text-center"><i>Ngày ${ngay.split('-')[2] || ''} tháng ${ngay.split('-')[1] || ''} năm ${ngay.split('-')[0] || ''}</i></div>
      </div>
      
      <div>
        Người kiểm kê: <b>${phieu.nguoi_kiem_ke || '—'}</b><br/>
        Ghi chú: ${phieu.ghi_chu || '—'}
      </div>
      
      <table>
        <thead>
          <tr>
            <th width="5%">STT</th>
            <th width="12%">Mã hàng</th>
            <th width="33%">Tên vật tư, quy cách</th>
            <th width="8%">ĐVT</th>
            <th width="10%">Theo sổ sách</th>
            <th width="10%">Thực tế</th>
            <th width="10%">Chênh lệch</th>
            <th width="12%">Lý do</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <div class="signature">
        <div>
          <b>Người lập phiếu</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Thủ kho</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Kế toán</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
        <div>
          <b>Giám đốc</b><br/>
          <i>(Ký, họ tên)</i>
        </div>
      </div>
    </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
