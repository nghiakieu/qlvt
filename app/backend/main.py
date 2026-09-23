from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import master, vat_tu, ton_kho, nhap_kho, xuat_kho, dieu_chuyen, bao_cao, kiem_ke, dashboard, gia_cong
from database import engine, init_db

# Khởi tạo DB schema nếu chưa có (trong trường hợp chạy lần đầu)
init_db()

app = FastAPI(title="QLVT Thi Công API")

# Setup CORS (cho phép frontend gọi API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các routers
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(master.router, prefix="/api/v1/master", tags=["Danh Mục Hệ Thống"])
app.include_router(vat_tu.router, prefix="/api/v1/vat-tu", tags=["Vật Tư Hàng Hóa"])
app.include_router(ton_kho.router, prefix="/api/v1/ton-kho", tags=["Tồn Kho"])
app.include_router(gia_cong.router, prefix="/api/v1/gia-cong", tags=["Gia Công / Mua Mới"])
app.include_router(dieu_chuyen.router, prefix="/api/v1/dieu-chuyen", tags=["Lệnh Điều Chuyển"])
app.include_router(xuat_kho.router, prefix="/api/v1/xuat-kho", tags=["Xuất Kho"])
app.include_router(nhap_kho.router, prefix="/api/v1/nhap-kho", tags=["Nhập Kho"])
app.include_router(kiem_ke.router, prefix="/api/v1/kiem-ke", tags=["Kiểm Kê"])
app.include_router(bao_cao.router, prefix="/api/v1/bao-cao", tags=["Báo Cáo"])

@app.get("/")
def read_root():
    return {"message": "Hệ thống Quản lý Vật tư Thi công API đang chạy"}
