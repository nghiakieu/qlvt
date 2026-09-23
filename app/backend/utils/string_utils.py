import unicodedata

def remove_accents(input_str: str) -> str:
    if not input_str:
        return ''
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('utf-8')
    return only_ascii.replace('đ', 'd').replace('Đ', 'D').lower()
