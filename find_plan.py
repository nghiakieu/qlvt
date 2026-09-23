import json
out = []
with open(r'C:\Users\KTTC CAU - NGHIA\.gemini\antigravity\brain\54b38b24-d908-4763-8820-f59b8c6fcf9c\.system_generated\logs\transcript_full.jsonl', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'kế hoạch' in content.lower() or 'plan' in content.lower() or 'bước' in content.lower():
                out.append(content)
        except:
            pass

with open(r'c:\QLVT\plan_extracted.txt', 'w', encoding='utf-8') as f:
    f.write('\n\n---\n\n'.join(out[-10:]))
