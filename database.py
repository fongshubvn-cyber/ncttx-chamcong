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
            ("Phục vụ", "Bộ phận phục vụ bàn, sảnh khách và chăm sóc khách hàng"),
            ("Pha chế", "Bộ phận chế biến thức uống và vệ sinh khu vực quầy bar"),
            ("Bán hàng", "Bộ phận thanh toán, quầy thu ngân và máy POS"),
            ("Tư vấn viên", "Bộ phận giới thiệu sản phẩm và tư vấn dịch vụ"),
            ("Gardener", "Bộ phận chăm sóc cây xanh, vườn và không gian xanh cảnh quan"),
            ("Bảo vệ", "Bộ phận an ninh, trông giữ xe và bảo vệ tài sản cửa hàng")
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
            ("Lê Văn C (Parttime)", "PT2001", "parttime", "038096000003", areas_map["Phục vụ"]),
            ("Phạm Thị D (Parttime)", "PT2002", "parttime", "038096000004", areas_map["Tư vấn viên"])
        ]
        cursor.executemany("INSERT INTO users (name, code, role, cccd, area_id) VALUES (?, ?, ?, ?, ?)", users_data)
        
        # Thêm các hạng mục checklist mặc định
        checklist_data = [
            # Phục vụ
            (areas_map["Phục vụ"], "Lau sạch bề mặt bàn ghế và thu dọn ly đĩa bẩn tại khu vực khách ngồi", "static/uploads/ref_phucvu_1.png"),
            (areas_map["Phục vụ"], "Quét dọn sạch sàn nhà khu vực sảnh khách, không để rác và bụi bẩn", "static/uploads/ref_phucvu_2.png"),
            
            # Pha chế
            (areas_map["Pha chế"], "Vệ sinh sạch máy pha cà phê, dụng cụ pha chế và úp ráo nước gọn gàng", "static/uploads/ref_phache_1.png"),
            (areas_map["Pha chế"], "Lau sạch bề mặt quầy pha chế, khay hứng nước thải và bồn rửa", "static/uploads/ref_phache_2.png"),
            
            # Bán hàng
            (areas_map["Bán hàng"], "Lau sạch quầy thu ngân, mặt kính trưng bày sản phẩm và máy POS", "static/uploads/ref_banhang_1.png"),
            (areas_map["Bán hàng"], "Sắp xếp ngăn kéo tiền lẻ gọn gàng và vệ sinh khu vực xung quanh quầy", "static/uploads/ref_banhang_2.png"),
            
            # Tư vấn viên
            (areas_map["Tư vấn viên"], "Sắp xếp kệ trưng bày sản phẩm mẫu gọn gàng, sạch sẽ, không bám bụi", "static/uploads/ref_tuvan_1.png"),
            (areas_map["Tư vấn viên"], "Lau sạch bàn tư vấn, sắp xếp catalogue và ghế ngồi ngăn nắp", "static/uploads/ref_tuvan_2.png"),
            
            # Gardener
            (areas_map["Gardener"], "Tưới nước cho cây cảnh, nhặt lá úa và thu dọn rác khu vực lối đi sân vườn", "static/uploads/ref_garden_1.png"),
            (areas_map["Gardener"], "Cắt tỉa các cành cây khô, lau dọn khu vực chậu cây xanh trong nhà", "static/uploads/ref_garden_2.png"),
            
            # Bảo vệ
            (areas_map["Bảo vệ"], "Quét sạch khu vực để xe của khách hàng, sắp xếp xe thẳng hàng lối", "static/uploads/ref_baove_1.png"),
            (areas_map["Bảo vệ"], "Vệ sinh sạch bàn trực bảo vệ, sắp xếp ghi chép xe ra vào ngăn nắp", "static/uploads/ref_baove_2.png")
        ]
        cursor.executemany("INSERT INTO checklist_items (area_id, task_name, reference_image) VALUES (?, ?, ?)", checklist_data)
        
        # Thêm cấu hình chấm chéo mặc định (Vòng tròn khép kín)
        rules_data = [
            (areas_map["Phục vụ"], areas_map["Pha chế"]),
            (areas_map["Pha chế"], areas_map["Bán hàng"]),
            (areas_map["Bán hàng"], areas_map["Tư vấn viên"]),
            (areas_map["Tư vấn viên"], areas_map["Gardener"]),
            (areas_map["Gardener"], areas_map["Bảo vệ"]),
            (areas_map["Bảo vệ"], areas_map["Phục vụ"])
        ]
        cursor.executemany("INSERT INTO cross_check_rules (from_area_id, to_area_id) VALUES (?, ?)", rules_data)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    # Tạo thư mục uploads nếu chưa có để tránh lỗi khi ghi file
    os.makedirs('static/uploads', exist_ok=True)
    init_db()
    print("Database initialized successfully!")
