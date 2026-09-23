files = ['app/backend/routers/xuat_kho.py', 'app/backend/routers/dieu_chuyen.py', 'app/backend/routers/kiem_ke.py', 'app/backend/routers/nhap_kho.py']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    content = content.replace('"items": query.offset(skip).limit(limit).all()}', '"items": query.offset(skip).limit(limit).all(), "skip": skip, "limit": limit}')
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
