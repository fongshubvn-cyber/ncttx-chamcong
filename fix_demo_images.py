import sqlite3
import os
from PIL import Image, ImageDraw, ImageFont
import datetime

def fix_db_captured_images():
    db_path = 'data.db'
    if not os.path.exists(db_path):
        print("Database file not found.")
        return
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all details
    details = cursor.execute('''
        SELECT d.id, d.captured_image, i.reference_image 
        FROM checklist_submission_details d
        JOIN checklist_items i ON d.item_id = i.id
    ''').fetchall()
    
    os.makedirs('static/uploads', exist_ok=True)
    updated_count = 0
    
    for row in details:
        cap_img = row['captured_image']
        ref_img = row['reference_image']
        
        # If they are exactly the same
        if cap_img and ref_img:
            # Clean leading slash if present
            src_path = ref_img.lstrip('/')
            
            # If captured image equals reference image, or was already a demo captured image
            if cap_img.lstrip('/') == src_path or 'captured_demo_' in cap_img:
                if not os.path.exists(src_path):
                    print(f"Source file {src_path} not found.")
                    continue
                    
                dest_name = f"captured_demo_{row['id']}.jpg"
                dest_path = os.path.join('static', 'uploads', dest_name)
                
                try:
                    img = Image.open(src_path).convert('RGB')
                    w, h = img.size
                    
                    # Crop 2% around edges to simulate a different zoom/perspective
                    img = img.crop((int(w*0.02), int(h*0.02), int(w*0.98), int(h*0.98)))
                    img = img.resize((w, h), Image.Resampling.LANCZOS)
                    
                    draw = ImageDraw.Draw(img)
                    
                    # Draw bottom dark bar
                    bar_height = 32
                    draw.rectangle([(0, h - bar_height), (w, h)], fill=(0, 0, 0, 140))
                    
                    # Draw watermark text
                    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                    watermark_text = f"THỜI GIAN: {now_str} | GPS: 21.028511, 105.804817"
                    
                    try:
                        font = ImageFont.truetype("arial.ttf", 13)
                    except IOError:
                        font = ImageFont.load_default()
                        
                    draw.text((12, h - bar_height + 8), watermark_text, fill=(255, 255, 255), font=font)
                    
                    # Draw visual badge "ẢNH THỰC TẾ"
                    draw.rectangle([(10, 10), (120, 30)], fill=(16, 185, 129))
                    draw.text((15, 12), "ẢNH THỰC TẾ", fill=(255, 255, 255), font=font)
                    
                    img.save(dest_path, "JPEG", quality=85)
                    
                    # Update database row
                    new_url = f"/static/uploads/{dest_name}"
                    cursor.execute('''
                        UPDATE checklist_submission_details 
                        SET captured_image = ? 
                        WHERE id = ?
                    ''', (new_url, row['id']))
                    
                    updated_count += 1
                    print(f"Fixed detail ID {row['id']}: Created {new_url}")
                except Exception as e:
                    print(f"Error processing {src_path}: {e}")
                
    conn.commit()
    conn.close()
    print(f"Database update complete. Successfully updated {updated_count} demo captured images.")

if __name__ == '__main__':
    fix_db_captured_images()
