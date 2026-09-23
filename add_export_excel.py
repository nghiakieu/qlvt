import sys

with open("app/backend/routers/bao_cao.py", "a", encoding="utf-8") as f:
    f.write("""
from fastapi.responses import StreamingResponse
import io
import openpyxl

@router.get("/export-excel")
def export_bao_cao(kho_ids: str = None, nhom_id: int = None, db: Session = Depends(get_db)):
    res = bao_cao_tong_hop(kho_ids, nhom_id, db)
    data = res["data"]
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BaoCaoTonKho"
    
    headers = ["Mã hàng", "Tên vật tư", "ĐVT", "Mã kho", "Tên kho", "Tồn kho (SL)", "Tồn kho (Kg)"]
    ws.append(headers)
    
    for item in data:
        ws.append([
            item["ma_hang"],
            item["ten_hang"],
            item["dvt"],
            item["ma_kho"],
            item["ten_kho"],
            item["ton_sl"],
            item["ton_kg"]
        ])
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=bao_cao_ton_kho.xlsx"
        }
    )
""")
