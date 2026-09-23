import os

def patch_file(filepath, schema_name):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "ListResponse" in content:
        return # already patched

    replacement = f"""from pydantic import BaseModel

class {schema_name}ListResponse(BaseModel):
    total: int
    items: List[schemas.{schema_name}]
    skip: int
    limit: int

@router.get("/", response_model={schema_name}ListResponse)"""

    content = content.replace('@router.get("/", response_model=dict)', replacement)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

base_dir = "app/backend/routers/"
patch_file(os.path.join(base_dir, "vat_tu.py"), "VatTu")
patch_file(os.path.join(base_dir, "nhap_kho.py"), "PhieuNhap")
patch_file(os.path.join(base_dir, "xuat_kho.py"), "PhieuXuat")
patch_file(os.path.join(base_dir, "dieu_chuyen.py"), "PhieuDieuChuyen")
patch_file(os.path.join(base_dir, "kiem_ke.py"), "PhieuKiemKe")

print("Patched all routers")
