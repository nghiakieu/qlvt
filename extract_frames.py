import sys
sys.path.insert(0, r"C:\Users\KTTC CAU - NGHIA\AppData\Roaming\Python\Python314\site-packages")
import cv2, os

out_dir = r"C:\Users\KTTC CAU - NGHIA\.gemini\antigravity\brain\1e9c5eed-363f-4bf7-a2e2-c065e32e427c\frames"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(r"c:/QLVT/Phan mem kho hang Amis.mp4")
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Extract 28 frames spread across the video (every ~13 seconds)
timestamps_sec = [5, 15, 25, 35, 45, 60, 75, 90, 105, 120, 135, 150, 165, 
                  180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 355]

saved = []
for t in timestamps_sec:
    frame_no = int(t * fps)
    if frame_no >= total:
        break
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    if ret:
        fname = os.path.join(out_dir, f"frame_{t:04d}s.jpg")
        cv2.imwrite(fname, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        saved.append(fname)
        print(f"Saved: {fname}")

cap.release()
print(f"\nTotal saved: {len(saved)} frames")
