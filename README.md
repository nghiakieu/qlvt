# 📦 Hệ Thống Quản Lý Vật Tư Thi Công

**Phiên bản**: 1.0 | **Công ty**: CP ĐTXD Giao Thông Phương Thành

---

## 🚀 Khởi động hệ thống

**Cách 1 — Double-click (dễ nhất):**
```
C:\QLVT\start.bat
```

**Cách 2 — Thủ công:**
```powershell
# Cửa sổ 1 — Backend
cd C:\QLVT\app\backend
python -m uvicorn main:app --port 8000

# Cửa sổ 2 — Frontend  
cd C:\QLVT\app\frontend
npm run dev
```

Sau đó mở trình duyệt: **http://localhost:5173**

---

## 📋 Chức năng

| Module | Mô tả |
|--------|-------|
| 📊 Tổng quan | Dashboard, KPI, biểu đồ nhập/xuất |
| 📦 Danh mục VT | 3.087 mặt hàng, tìm kiếm, lọc nhóm, thêm mới |
| 🏗️ Kho & CT | 31 kho (TT + công trình) |
| 📥 Nhập kho | Nhập GC mới / Nhận điều chuyển, tự tính Kg |
| 📤 Xuất kho | Xuất điều chuyển / Bán thanh lý, kiểm tra tồn realtime |
| 🔄 Điều chuyển | Theo dõi vận chuyển, xác nhận nhận hàng, chênh lệch |
| 🔍 Kiểm kê | So sánh sổ sách vs thực tế, duyệt cập nhật tồn |
| 📈 Báo cáo | Tổng hợp tồn kho theo kho / theo công trình |
| ⚙️ Danh mục HT | Nhóm VT, Đơn vị tính |

---

## 🗄️ Cơ sở dữ liệu

File: `C:\QLVT\app\backend\qlvt.db` (SQLite, không cần cài server)

**Import lại dữ liệu từ Excel:**
```powershell
cd C:\QLVT\app\backend
python run_import.py
```

---

## 🌐 API Documentation

Mở: **http://localhost:8000/docs** để xem tài liệu API đầy đủ (Swagger UI)

---

## 📁 Cấu trúc dự án

```
C:\QLVT\
├── start.bat              ← Khởi động hệ thống
├── app\
│   ├── backend\           ← Python FastAPI
│   │   ├── main.py
│   │   ├── qlvt.db        ← SQLite database
│   │   ├── models\        ← Database models
│   │   ├── routers\       ← API endpoints
│   │   ├── schemas\       ← Pydantic schemas
│   │   └── utils\         ← Excel import script
│   └── frontend\          ← React + Ant Design
│       └── src\
│           ├── layouts\   ← Main layout
│           ├── pages\     ← Các trang
│           └── services\  ← API calls
└── [Excel files]          ← Dữ liệu gốc
```

---

## ⚙️ Yêu cầu hệ thống

- **Python 3.14+** — đã cài ✅
- **Node.js 24+** — đã cài ✅
- **Packages**: FastAPI, SQLAlchemy, Pydantic, openpyxl, pandas (đã cài ✅)
