import os
from PIL import Image, ImageDraw, ImageFont

# Danh sách ảnh mẫu cần tạo tương ứng với các bộ phận mới
placeholders = {
    "ref_phucvu_1.png": ("Bàn Ghế & Ghế Khách Ngồi", "#14532d"),
    "ref_phucvu_2.png": ("Sàn Nhà Sảnh Khách", "#1c1917"),
    
    "ref_phache_1.png": ("Máy Pha Cà Phê & Dụng Cụ", "#1e1b4b"),
    "ref_phache_2.png": ("Bề Mặt Quầy Pha Chế", "#064e3b"),
    
    "ref_banhang_1.png": ("Quầy Thu Ngân & Máy POS", "#701a75"),
    "ref_banhang_2.png": ("Khu Vực Ngăn Kéo Tiền", "#0f172a"),
    
    "ref_tuvan_1.png": ("Kệ Trưng Bày Sản Phẩm", "#1c1917"),
    "ref_tuvan_2.png": ("Bàn Tư Vấn & Catalogue", "#14532d"),
    
    "ref_garden_1.png": ("Khu Vực Chậu Cây Cảnh", "#064e3b"),
    "ref_garden_2.png": ("Lối Đi & Vườn Cây Xanh", "#1e1b4b"),
    
    "ref_baove_1.png": ("Khu Vực Bãi Để Xe Khách", "#701a75"),
    "ref_baove_2.png": ("Bàn Trực & Sổ Ghi Chép", "#0f172a")
}

os.makedirs("static/uploads", exist_ok=True)

for filename, (text, color) in placeholders.items():
    path = os.path.join("static/uploads", filename)
    
    # Tạo ảnh kích thước 640x480 (tỷ lệ 4:3 của camera chuẩn)
    img = Image.new("RGB", (640, 480), color=color)
    draw = ImageDraw.Draw(img)
    
    # Vẽ các đường lưới căn chỉnh (Grid lines) để nhân viên so sánh góc chụp
    # Đường chéo
    draw.line([(0, 0), (640, 480)], fill="#374151", width=2)
    draw.line([(640, 0), (0, 480)], fill="#374151", width=2)
    # Đường chia ba
    draw.line([(213, 0), (213, 480)], fill="#4b5563", width=1)
    draw.line([(426, 0), (426, 480)], fill="#4b5563", width=1)
    draw.line([(0, 160), (640, 160)], fill="#4b5563", width=1)
    draw.line([(0, 320), (640, 320)], fill="#4b5563", width=1)
    
    # Vẽ vòng tròn tâm căn chỉnh
    draw.ellipse([(270, 190), (370, 290)], outline="#ef4444", width=3)
    
    # Ghi chữ thông tin
    try:
        font_title = ImageFont.truetype("arial.ttf", 28)
        font_sub = ImageFont.truetype("arial.ttf", 16)
    except IOError:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    draw.text((320, 225), "[+] CĂN GÓC CHỤP", fill="#ef4444", anchor="mm", font=font_sub)
    draw.text((320, 400), text, fill="#f8fafc", anchor="mm", font=font_title)
    draw.text((320, 435), "ẢNH MẪU TIÊU CHUẨN VỆ SINH", fill="#94a3b8", anchor="mm", font=font_sub)
    
    img.save(path)
    print(f"Created placeholder image: {path}")

print("All placeholder images created successfully!")
