import sqlite3
import os

DB_PATH = 'data.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Bảng areas (Khu vực)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    )
    ''')
    
    # 2. Bảng users (Nhân viên)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL, -- 'manager', 'fulltime', 'parttime'
        cccd TEXT UNIQUE,
        area_id INTEGER,
        status TEXT DEFAULT 'active',
        FOREIGN KEY(area_id) REFERENCES areas(id) ON DELETE SET NULL
    )
    ''')
    
    # 3. Bảng checklist_items (Hạng mục checklist của từng khu vực)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        area_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        reference_image TEXT, -- Đường dẫn ảnh mẫu
        FOREIGN KEY(area_id) REFERENCES areas(id) ON DELETE CASCADE
    )
    ''')
    
    # 4. Bảng time_logs (Nhật ký chấm công)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL, -- 'check_in', 'check_out'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        area_id INTEGER, -- Khu vực làm việc lúc check-in
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(area_id) REFERENCES areas(id) ON DELETE SET NULL
    )
    ''')
    
    # 5. Bảng checklist_submissions (Các lượt chấm chéo đã nộp)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS checklist_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grader_id INTEGER NOT NULL, -- Nhân sự đi chấm chéo
        area_id INTEGER NOT NULL, -- Khu vực được chấm
        submission_date DATE DEFAULT (DATE('now')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending', -- 'pending' (chờ duyệt), 'approved' (đã đạt), 'rejected' (cần làm lại)
        manager_notes TEXT,
        FOREIGN KEY(grader_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(area_id) REFERENCES areas(id) ON DELETE CASCADE
    )
    ''')
    
    # 6. Bảng checklist_submission_details (Chi tiết kết quả chụp và chấm điểm của từng hạng mục)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS checklist_submission_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'pass' (đạt), 'fail' (không đạt)
        captured_image TEXT, -- Đường dẫn ảnh chụp thực tế
        notes TEXT,
        FOREIGN KEY(submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY(item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
    )
    ''')

    # 7. Bảng cross_check_rules (Cấu hình bộ phận nào chấm bộ phận nào)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cross_check_rules (
        from_area_id INTEGER PRIMARY KEY,
        to_area_id INTEGER NOT NULL,
        FOREIGN KEY(from_area_id) REFERENCES areas(id) ON DELETE CASCADE,
        FOREIGN KEY(to_area_id) REFERENCES areas(id) ON DELETE CASCADE
    )
    ''')
    
    # Seed dữ liệu mẫu nếu DB trống
    cursor.execute("SELECT COUNT(*) FROM areas")
    if cursor.fetchone()[0] == 0:
        # Thêm các khu vực mặc định
        areas_data = [
            ("Pha chế", "Bộ phận chế biến thức uống và vệ sinh khu vực quầy bar"),
            ("Bếp bánh", "Bộ phận chế biến các món bánh ngọt, bánh nướng"),
            ("Bán hàng", "Bộ phận thanh toán, quầy thu ngân và máy POS")
        ]
        cursor.executemany("INSERT INTO areas (name, description) VALUES (?, ?)", areas_data)
        
        # Lấy id các khu vực vừa tạo
        cursor.execute("SELECT id, name FROM areas")
        areas_map = {row['name']: row['id'] for row in cursor.fetchall()}
        
        # Thêm người dùng mặc định
        users_data = [
            ("Quản Lý Cửa Hàng", "123456", "manager", "001095123456", None),
            ("Nguyễn Văn A (Fulltime)", "FT1001", "fulltime", "038096000001", areas_map["Bán hàng"]),
            ("Trần Thị B (Fulltime)", "FT1002", "fulltime", "038096000002", areas_map["Pha chế"]),
            ("Lê Văn C (Parttime)", "PT2001", "parttime", "038096000003", areas_map["Bếp bánh"])
        ]
        cursor.executemany("INSERT INTO users (name, code, role, cccd, area_id) VALUES (?, ?, ?, ?, ?)", users_data)
        
        # Thêm các hạng mục checklist bằng cách quét thư mục assets tương ứng
        import shutil
        os.makedirs('static/uploads', exist_ok=True)
        
        folder_mapping = {
            "Pha chế": "phache",
            "Bếp bánh": "bepbanh",
            "Bán hàng": "banhang"
        }
        
        checklist_data = []
        for area_name, folder_name in folder_mapping.items():
            area_id = areas_map[area_name]
            folder_path = os.path.join('assets', folder_name)
            if os.path.exists(folder_path):
                files = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                for index, filename in enumerate(files, 1):
                    src_path = os.path.join(folder_path, filename)
                    ext = os.path.splitext(filename)[1].lower() or '.jpg'
                    dest_name = f"ref_{folder_name}_{index}{ext}"
                    dest_path = os.path.join('static', 'uploads', dest_name)
                    
                    shutil.copy(src_path, dest_path)
                    
                    task_desc = f"Yêu cầu kiểm tra vệ sinh sạch sẽ, sắp xếp ngăn nắp theo ảnh mẫu tiêu chuẩn (Hạng mục {index})"
                    checklist_data.append((area_id, task_desc, f"static/uploads/{dest_name}"))
            else:
                print(f"Warning: Folder {folder_path} not found.")
                
        if checklist_data:
            cursor.executemany("INSERT INTO checklist_items (area_id, task_name, reference_image) VALUES (?, ?, ?)", checklist_data)
            
        # Thêm cấu hình chấm chéo mặc định (Vòng tròn khép kín)
        rules_data = [
            (areas_map["Pha chế"], areas_map["Bếp bánh"]),
            (areas_map["Bếp bánh"], areas_map["Bán hàng"]),
            (areas_map["Bán hàng"], areas_map["Pha chế"])
        ]
        cursor.executemany("INSERT INTO cross_check_rules (from_area_id, to_area_id) VALUES (?, ?)", rules_data)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    # Tạo thư mục uploads nếu chưa có để tránh lỗi khi ghi file
    os.makedirs('static/uploads', exist_ok=True)
    init_db()
    print("Database initialized successfully!")
