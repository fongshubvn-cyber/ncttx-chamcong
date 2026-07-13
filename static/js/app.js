// ================= TRẠNG THÁI ỨNG DỤNG (STATE) =================
let state = {
    currentUser: null,       // Thông tin user đăng nhập
    activeTab: 'staff-time-tab', // Tab hiện tại của staff
    activeManagerTab: 'm-dashboard-tab', // Tab hiện tại của manager
    
    // Checklist Chấm chéo
    assignedArea: null,      // Khu vực chấm chéo được giao
    checklistItems: [],      // Hạng mục checklist cần chấm
    submissionState: {},     // Lưu kết quả chấm tạm thời: { item_id: { status, captured_image, notes } }
    existingSubmission: null, // Đã chấm hôm nay chưa
    
    // Camera
    webcamStream: null,      // Luồng webcam hoạt động
    activeItemId: null,      // ID hạng mục đang chấm
    activeGrade: 'pass',     // Đánh giá đang chọn ('pass' | 'fail')
    capturedImageUrl: null,  // URL ảnh đã chụp/upload thành công
    
    // Phê duyệt
    activeReviewSubmission: null, // Lượt submission đang được xem để duyệt
    
    // GPS Geolocation
    gpsLocation: null
};

// ================= KHỞI TẠO KHI TẢI TRANG =================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    startLiveClock();
});

function initApp() {
    // Kiểm tra xem đã đăng nhập trước đó chưa (localStorage)
    const savedUser = localStorage.getItem('chamcong_user');
    if (savedUser) {
        try {
            state.currentUser = JSON.parse(savedUser);
            showDashboardByRole();
        } catch (e) {
            localStorage.removeItem('chamcong_user');
        }
    }
}

// Bắt đầu đồng hồ thời gian thực ở màn chấm công
function startLiveClock() {
    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    
    if (!clockTime || !clockDate) return;
    
    const weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    
    setInterval(() => {
        const now = new Date();
        
        // Định dạng thời gian: HH:MM:SS
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        clockTime.textContent = `${hh}:${mm}:${ss}`;
        
        // Định dạng ngày
        const day = weekdays[now.getDay()];
        const date = now.getDate();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        clockDate.textContent = `${day}, ngày ${date} tháng ${month}, năm ${year}`;
    }, 1000);
}

// ================= THIẾT LẬP CÁC SỰ KIỆN (LISTENERS) =================
function setupEventListeners() {
    // 1. Form Đăng Nhập
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 2. Nút Đăng Xuất
    document.getElementById('staff-logout-btn').addEventListener('click', handleLogout);
    document.getElementById('manager-logout-btn').addEventListener('click', handleLogout);
    
    // 3. Chuyển Tab Nhân Viên (Staff Navigation)
    document.querySelectorAll('#staff-view .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.getAttribute('data-target');
            switchStaffTab(targetTab);
        });
    });
    
    // 4. Chuyển Tab Quản Lý (Manager Navigation)
    document.querySelectorAll('#manager-view .sidebar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.getAttribute('data-target');
            switchManagerTab(targetTab);
        });
    });

    // 5. Chấm công: Check-in / Out Toggle
    document.getElementById('clock-toggle-btn').addEventListener('click', handleClockToggle);
    
    // 6. Camera & Modal Chụp ảnh
    document.getElementById('close-camera-modal-btn').addEventListener('click', closeCameraModal);
    document.getElementById('snap-btn').addEventListener('click', capturePhoto);
    document.getElementById('retake-btn').addEventListener('click', resetCameraForRetake);
    
    // Đánh giá đạt/không đạt trong modal camera
    document.querySelectorAll('.btn-grade').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-grade').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.activeGrade = e.currentTarget.getAttribute('data-grade');
        });
    });
    
    // Lưu đánh giá của một mục
    document.getElementById('save-grade-btn').addEventListener('click', saveItemGrade);
    
    // Tải ảnh thay thế (Fallback File Input)
    document.getElementById('file-fallback-input').addEventListener('change', handleFileUploadFallback);
    
    // Điều khiển độ mờ ảnh mẫu (Opacity Slider)
    const opacitySlider = document.getElementById('overlay-opacity-slider');
    const opacityVal = document.getElementById('opacity-val');
    const overlayImg = document.getElementById('camera-overlay-image');
    
    if (opacitySlider && opacityVal && overlayImg) {
        opacitySlider.addEventListener('input', (e) => {
            const val = e.target.value;
            opacityVal.textContent = val + '%';
            overlayImg.style.opacity = val / 100;
            if (val > 0) {
                overlayImg.classList.remove('hide');
            } else {
                overlayImg.classList.add('hide');
            }
        });
        
        // Bấm vào ảnh vừa chụp để xem phóng to
        const previewImg = document.getElementById('captured-preview');
        if (previewImg) {
            previewImg.addEventListener('click', () => {
                if (previewImg.src) {
                    openLightbox(previewImg.src, 'Ảnh thực tế vừa chụp');
                }
            });
        }
        
        // Sự kiện đóng Lightbox phóng to ảnh
        const closeLightboxBtn = document.getElementById('close-lightbox-btn');
        if (closeLightboxBtn) {
            closeLightboxBtn.addEventListener('click', closeLightbox);
        }
        const lightboxModal = document.getElementById('lightbox-modal');
        if (lightboxModal) {
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal) {
                    closeLightbox();
                }
            });
        }
    }

    // Bật/Tắt lưới căn chỉnh 3x3
    const toggleGridBtn = document.getElementById('toggle-grid-btn');
    const gridOverlay = document.getElementById('camera-grid-overlay');
    
    if (toggleGridBtn && gridOverlay) {
        toggleGridBtn.addEventListener('click', () => {
            const isActive = toggleGridBtn.classList.toggle('active');
            if (isActive) {
                gridOverlay.classList.remove('hide');
                toggleGridBtn.textContent = 'Đang BẬT';
                toggleGridBtn.style.color = 'var(--color-primary)';
                toggleGridBtn.style.borderColor = 'var(--color-primary)';
            } else {
                gridOverlay.classList.add('hide');
                toggleGridBtn.textContent = 'Đang TẮT';
                toggleGridBtn.style.color = 'var(--text-secondary)';
                toggleGridBtn.style.borderColor = 'var(--border-glass)';
            }
        });
    }

    // Gửi toàn bộ checklist
    document.getElementById('submit-all-checklist-btn').addEventListener('click', submitAllChecklist);

    // 7. Manager Actions: Thêm/Sửa/Xóa Nhân Sự
    document.getElementById('add-staff-btn').addEventListener('click', () => openStaffModal());
    document.getElementById('close-staff-modal-btn').addEventListener('click', () => document.getElementById('staff-modal').classList.remove('active'));
    document.getElementById('staff-form').addEventListener('submit', saveStaff);
    document.getElementById('gen-code-btn').addEventListener('click', generateRandomStaffCode);
    
    // 8. Manager Actions: Thêm/Sửa/Xóa Khu Vực
    document.getElementById('add-area-btn').addEventListener('click', () => openAreaModal());
    document.getElementById('close-area-modal-btn').addEventListener('click', () => document.getElementById('area-modal').classList.remove('active'));
    document.getElementById('area-form').addEventListener('submit', saveArea);
    
    // 9. Manager Actions: Thêm/Sửa/Xóa Hạng Mục Checklist
    document.getElementById('add-item-btn').addEventListener('click', () => openItemModal());
    document.getElementById('close-item-modal-btn').addEventListener('click', () => document.getElementById('item-modal').classList.remove('active'));
    document.getElementById('item-form').addEventListener('submit', saveChecklistItem);
    document.getElementById('config-area-filter').addEventListener('change', (e) => loadManagerChecklistItems(e.target.value));

    // 9.5 Manager Actions: Cấu hình quy tắc chấm chéo
    document.getElementById('add-rule-btn').addEventListener('click', () => openRuleModal());
    document.getElementById('close-rule-modal-btn').addEventListener('click', () => closeRuleModal());
    document.getElementById('rule-form').addEventListener('submit', saveRule);

    // 10. Manager Review Submissions (Duyệt checklist)
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            loadChecklistSubmissions(e.currentTarget.getAttribute('data-status'));
        });
    });
    
    document.getElementById('close-review-modal-btn').addEventListener('click', () => document.getElementById('review-modal').classList.remove('active'));
    document.getElementById('approve-submission-btn').addEventListener('click', () => approveSubmission('approved'));
    document.getElementById('reject-submission-btn').addEventListener('click', () => approveSubmission('rejected'));

    // 11. Modal báo cáo out ca (Xác nhận Check-out)
    const cancelCheckoutBtn = document.getElementById('cancel-checkout-btn');
    if (cancelCheckoutBtn) {
        cancelCheckoutBtn.addEventListener('click', () => {
            document.getElementById('checkout-summary-modal').classList.remove('active');
        });
    }
    
    const confirmCheckoutBtn = document.getElementById('confirm-checkout-btn');
    if (confirmCheckoutBtn) {
        confirmCheckoutBtn.addEventListener('click', executeCheckout);
    }

    // 12. Báo cáo: Lọc thời gian & Tìm kiếm nhân sự
    const applyFilterBtn = document.getElementById('apply-report-filter-btn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', handleReportFilter);
    }
    
    const reportSearchInput = document.getElementById('report-search-input');
    if (reportSearchInput) {
        reportSearchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            
            // Cập nhật đường dẫn xuất excel tức thời khi gõ phím
            const attBtn = document.getElementById('export-attendance-btn');
            const effBtn = document.getElementById('export-efficiency-btn');
            const startDate = document.getElementById('report-start-date').value;
            const endDate = document.getElementById('report-end-date').value;
            
            if (attBtn && effBtn) {
                let attUrl = `/api/manager/reports/export/attendance?`;
                let effUrl = `/api/manager/reports/export/efficiency?`;
                const params = [];
                if (startDate && endDate) {
                    params.push(`start_date=${startDate}`);
                    params.push(`end_date=${endDate}`);
                }
                if (val) {
                    params.push(`search=${encodeURIComponent(val)}`);
                }
                const paramStr = params.join('&');
                attBtn.setAttribute('href', attUrl + paramStr);
                effBtn.setAttribute('href', effUrl + paramStr);
            }
            
            // Ẩn/hiện dòng trong bảng báo cáo thời gian thực
            const rows = document.querySelectorAll('#report-efficiency-table tbody tr');
            rows.forEach(row => {
                if (row.cells.length >= 2) {
                    const code = row.cells[0].textContent.toLowerCase();
                    const name = row.cells[1].textContent.toLowerCase();
                    if (code.includes(val) || name.includes(val)) {
                        row.classList.remove('hide');
                    } else {
                        row.classList.add('hide');
                    }
                }
            });
        });
    }
}

// ================= AUTHENTICATION LOGIC =================
async function handleLogin(e) {
    e.preventDefault();
    const codeInput = document.getElementById('login-code');
    const errorMsg = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');
    
    const code = codeInput.value.trim();
    if (!code) return;
    
    submitBtn.disabled = true;
    errorMsg.classList.add('hide');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Có lỗi xảy ra khi đăng nhập');
        }
        
        // Lưu thông tin đăng nhập
        state.currentUser = result;
        localStorage.setItem('chamcong_user', JSON.stringify(result));
        
        // Điều hướng màn hình tương ứng vai trò
        showDashboardByRole();
        
        // Reset form
        codeInput.value = '';
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('hide');
    } finally {
        submitBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('chamcong_user');
    state.currentUser = null;
    
    // Stop camera stream if active
    stopCameraStream();
    
    // Về màn hình đăng nhập
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('login-view').classList.add('active');
}

function showDashboardByRole() {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    if (state.currentUser.role === 'manager') {
        document.getElementById('manager-view').classList.add('active');
        switchManagerTab('m-dashboard-tab');
    } else {
        document.getElementById('staff-view').classList.add('active');
        
        // Cập nhật thông tin nhân viên
        document.getElementById('staff-user-name').textContent = state.currentUser.name;
        
        const roleText = state.currentUser.role === 'fulltime' ? 'Fulltime' : 'Parttime';
        document.getElementById('staff-user-role').textContent = `${roleText} • Phân bổ: ${state.currentUser.area_name || 'Chưa xếp'}`;
        
        switchStaffTab('staff-time-tab');
    }
}

// ================= CHUYỂN TABS LOGIC =================
function switchStaffTab(tabId) {
    state.activeTab = tabId;
    
    // Active navigation button
    document.querySelectorAll('#staff-view .tab-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Active content tab
    document.querySelectorAll('#staff-view .tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load tương ứng tab
    if (tabId === 'staff-time-tab') {
        loadStaffAttendanceStatus();
    } else if (tabId === 'staff-checklist-tab') {
        loadAssignedChecklist();
    }
}

function switchManagerTab(tabId) {
    state.activeManagerTab = tabId;
    
    // Active sidebar button
    document.querySelectorAll('#manager-view .sidebar-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Active content tab
    document.querySelectorAll('#manager-view .manager-tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load dữ liệu tab tương ứng
    if (tabId === 'm-dashboard-tab') {
        loadManagerDashboardData();
    } else if (tabId === 'm-reports-tab') {
        // Set default dates if they are empty
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');
        if (startInput && !startInput.value) {
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 7);
            
            const formatDate = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };
            
            startInput.value = formatDate(sevenDaysAgo);
            endInput.value = formatDate(today);
        }
        
        const startDate = startInput ? startInput.value : '';
        const endDate = endInput ? endInput.value : '';
        
        loadManagerReports(startDate, endDate);
    } else if (tabId === 'm-approve-tab') {
        const activeSubTab = document.querySelector('.sub-tab-btn.active');
        const status = activeSubTab ? activeSubTab.getAttribute('data-status') : 'pending';
        loadChecklistSubmissions(status);
    } else if (tabId === 'm-staff-tab') {
        loadManagerStaffList();
    } else if (tabId === 'm-config-tab') {
        loadManagerConfigData();
    }
}

// ================= NHÂN VIÊN: CHẤM CÔNG (TIMEKEEPING) =================
async function loadStaffAttendanceStatus() {
    try {
        // 1. Tải danh sách khu vực để check-in selector
        const areasRes = await fetch('/api/manager/areas');
        const areas = await areasRes.json();
        
        const select = document.getElementById('checkin-area-select');
        select.innerHTML = '';
        areas.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area.id;
            opt.textContent = area.name;
            // Chọn mặc định khu vực của nhân sự
            if (area.id === state.currentUser.area_id) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        // 2. Tải trạng thái chấm công hôm nay
        const statusRes = await fetch(`/api/time_logs/status?user_id=${state.currentUser.id}`);
        const statusData = await statusRes.json();
        
        // 2.5 Hiển thị thông báo trách nhiệm vệ sinh của khu vực phụ trách
        const banner = document.getElementById('hygiene-notice-banner');
        if (banner) {
            const hygiene = statusData.area_hygiene;
            if (hygiene && hygiene.status !== 'none') {
                banner.classList.remove('hide');
                banner.className = 'alert-box'; // reset class
                
                const areaName = state.currentUser.area_name || 'khu vực của bạn';
                
                if (hygiene.status === 'approved') {
                    banner.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
                    banner.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    banner.style.color = '#065f46';
                    banner.innerHTML = `
                        <i class="fa-solid fa-circle-check" style="font-size: 1.2rem; color: #10b981;"></i>
                        <div>
                            <strong>Bộ phận ${areaName}</strong> của bạn đã được quản lý duyệt <strong>ĐẠT</strong> tiêu chuẩn vệ sinh hôm nay! (Người chấm chéo: ${hygiene.grader})
                        </div>
                    `;
                } else if (hygiene.status === 'rejected') {
                    banner.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    banner.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    banner.style.color = '#991b1b';
                    banner.innerHTML = `
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.2rem; color: #ef4444;"></i>
                        <div>
                            <strong>⚠️ LÀM LẠI VỆ SINH:</strong> Bộ phận <strong>${areaName}</strong> của bạn bị đánh giá <strong>KHÔNG ĐẠT</strong>!
                            ${hygiene.notes ? `<br><small style="opacity: 0.9;"><strong>Lý do từ quản lý:</strong> "${hygiene.notes}"</small>` : ''}
                        </div>
                    `;
                } else if (hygiene.status === 'pending') {
                    banner.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
                    banner.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                    banner.style.color = '#92400e';
                    banner.innerHTML = `
                        <i class="fa-solid fa-hourglass-half" style="font-size: 1.2rem; color: #f59e0b;"></i>
                        <div>
                            Bộ phận <strong>${areaName}</strong> đã được chấm chéo xong, đang chờ Quản lý duyệt hình ảnh.
                        </div>
                    `;
                }
            } else {
                banner.classList.remove('hide');
                banner.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                banner.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                banner.style.color = '#1e40af';
                const areaName = state.currentUser.area_name || 'khu vực mặc định';
                banner.innerHTML = `
                    <i class="fa-solid fa-circle-info" style="font-size: 1.2rem; color: #3b82f6;"></i>
                    <div>
                        Bộ phận phụ trách ca này của bạn: <strong>${areaName}</strong>. Hãy giữ gìn vệ sinh sạch sẽ để chuẩn bị cho lượt chấm chéo.
                    </div>
                `;
            }
        }
        
        const btn = document.getElementById('clock-toggle-btn');
        const shiftInfo = document.getElementById('shift-info');
        const startTimeSpan = document.getElementById('shift-start-time');
        const areaSelectGroup = document.querySelector('.area-select-group');
        
        if (statusData.status === 'check_in') {
            btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> CHECK-OUT RA CA';
            btn.classList.add('checked-in');
            btn.setAttribute('data-action', 'check_out');
            
            shiftInfo.classList.remove('hide');
            startTimeSpan.textContent = statusData.timestamp;
            areaSelectGroup.classList.add('hide'); // Khóa thay đổi khu vực khi đang trong ca
        } else {
            btn.innerHTML = '<i class="fa-solid fa-circle-play"></i> CHECK-IN VÀO CA';
            btn.classList.remove('checked-in');
            btn.setAttribute('data-action', 'check_in');
            
            shiftInfo.classList.add('hide');
            areaSelectGroup.classList.remove('hide');
        }
        
        // 3. Tải nhật ký chấm công trong ngày hôm nay
        await loadStaffTodayLogs();
    } catch (e) {
        console.error("Lỗi khi tải trạng thái chấm công:", e);
    }
}

async function loadStaffTodayLogs() {
    const listContainer = document.getElementById('staff-today-logs');
    try {
        const res = await fetch(`/api/time_logs?user_id=${state.currentUser.id}`);
        const myLogs = await res.json();
        
        listContainer.innerHTML = '';
        if (myLogs.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">Chưa ghi nhận hoạt động nào hôm nay.</div>';
            return;
        }
        
        myLogs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const actionText = log.action === 'check_in' ? 'Check-in (Vào ca)' : 'Check-out (Ra ca)';
            const actionClass = log.action === 'check_in' ? 'text-success' : 'text-danger';
            
            item.innerHTML = `
                <div class="history-item-info">
                    <span class="history-time">${log.timestamp.split(' ')[1]}</span>
                    <span class="text-muted text-small">${log.timestamp.split(' ')[0]}</span>
                </div>
                <div>
                    <span class="${actionClass} font-weight-bold">${actionText}</span>
                    <br>
                    <span class="text-small text-muted">${log.area_name ? 'Khu vực: ' + log.area_name : ''}</span>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (e) {
        listContainer.innerHTML = '<div class="empty-state text-danger">Không tải được nhật ký hoạt động.</div>';
    }
}

async function handleClockToggle() {
    const btn = document.getElementById('clock-toggle-btn');
    const action = btn.getAttribute('data-action');
    const areaId = document.getElementById('checkin-area-select').value;
    
    btn.disabled = true;
    try {
        if (action === 'check_in') {
            const gps = await getGPSLocation();
            const res = await fetch('/api/time_logs/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: state.currentUser.id,
                    action: 'check_in',
                    area_id: areaId,
                    latitude: gps ? gps.latitude : null,
                    longitude: gps ? gps.longitude : null
                })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Check-in thất bại');
            }
            
            await loadStaffAttendanceStatus();
        } else {
            // Lấy báo cáo preview kết thúc ca trước khi check-out thực tế
            const res = await fetch(`/api/time_logs/checkout_preview?user_id=${state.currentUser.id}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Không lấy được báo cáo tổng kết ca');
            }
            
            const summary = await res.json();
            document.getElementById('summary-working-time').textContent = summary.working_time;
            
            const checklistPercentEl = document.getElementById('summary-checklist-percent');
            const checklistDetailEl = document.getElementById('summary-checklist-detail');
            
            if (summary.checklist.done) {
                checklistPercentEl.textContent = `${summary.checklist.percent}% Hạng mục Đạt`;
                checklistDetailEl.textContent = `Khu vực chấm chéo: ${summary.checklist.area_name} (${summary.checklist.passed}/${summary.checklist.total} công việc sạch sẽ)`;
                checklistPercentEl.className = 'font-weight-bold text-success';
            } else {
                checklistPercentEl.textContent = `Chưa thực hiện chấm checklist ca (0% đạt)`;
                checklistDetailEl.textContent = `Hãy lưu ý thực hiện nhiệm vụ chấm chéo khu vực trước khi kết thúc ca làm việc.`;
                checklistPercentEl.className = 'font-weight-bold text-danger';
            }
            
            // Mở modal báo cáo/xác nhận
            document.getElementById('checkout-summary-modal').classList.add('active');
        }
    } catch (e) {
        alert(e.message);
    } finally {
        btn.disabled = false;
    }
}

async function executeCheckout() {
    const confirmBtn = document.getElementById('confirm-checkout-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Đang check-out...';
    
    try {
        const gps = await getGPSLocation();
        const res = await fetch('/api/time_logs/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.currentUser.id,
                action: 'check_out',
                latitude: gps ? gps.latitude : null,
                longitude: gps ? gps.longitude : null
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Check-out thất bại');
        }
        
        document.getElementById('checkout-summary-modal').classList.remove('active');
        handleLogout();
    } catch (e) {
        alert(e.message);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Chấp nhận';
    }
}

// ================= NHÂN VIÊN: CHECKLIST CHẤM CHÉO (CROSS-CHECK) =================
async function loadAssignedChecklist() {
    const container = document.getElementById('checklist-items-container');
    const areaNameSpan = document.getElementById('assigned-area-name');
    const areaDescP = document.getElementById('assigned-area-desc');
    const submitBar = document.getElementById('checklist-submit-bar');
    const statusMsg = document.getElementById('submission-status-msg');
    
    container.innerHTML = '<div class="empty-state">Đang tải danh sách checklist chấm chéo...</div>';
    submitBar.classList.add('hide');
    
    try {
        const res = await fetch(`/api/checklist/assigned?grader_id=${state.currentUser.id}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Không thể lấy dữ liệu chấm chéo');
        }
        
        const data = await res.json();
        state.assignedArea = data.area;
        state.checklistItems = data.items;
        state.existingSubmission = data.existing_submission;
        
        // Reset submissionState tạm thời
        state.submissionState = {};
        
        // Cập nhật UI Header
        areaNameSpan.innerHTML = `<i class="fa-solid fa-map-marker-alt"></i> ${data.area.name}`;
        areaDescP.textContent = data.area.description || 'Không có mô tả chi tiết.';
        
        if (state.existingSubmission) {
            statusMsg.className = `submission-status-badge badge badge-${state.existingSubmission.status}`;
            const statusMap = {
                'pending': 'Đã nộp - Chờ Quản lý duyệt',
                'approved': 'Đã Đạt - Hoàn thành',
                'rejected': 'Bị từ chối - Yêu cầu làm lại'
            };
            statusMsg.textContent = statusMap[state.existingSubmission.status] || state.existingSubmission.status;
            
            // Đổ dữ liệu cũ đã chấm vào submissionState
            state.existingSubmission.details.forEach(d => {
                state.submissionState[d.item_id] = {
                    status: d.status,
                    captured_image: d.captured_image,
                    notes: d.notes,
                    saved: true // Đánh dấu đã lưu trên server
                };
            });
        } else {
            statusMsg.className = 'submission-status-badge badge badge-pending';
            statusMsg.textContent = 'Chưa làm checklist';
        }
        
        if (state.checklistItems.length === 0) {
            container.innerHTML = `<div class="empty-state">Khu vực "${data.area.name}" chưa được cấu hình hạng mục checklist nào.</div>`;
            return;
        }
        
        // Render Checklist Cards
        renderChecklistCards();
        
        // Check xem có hiển thị nút Gửi hay không
        checkChecklistCompleteness();
        
    } catch (e) {
        container.innerHTML = `<div class="empty-state text-danger">${e.message}</div>`;
    }
}

function renderChecklistCards() {
    const container = document.getElementById('checklist-items-container');
    container.innerHTML = '';
    
    state.checklistItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'checklist-card glass';
        
        const graded = state.submissionState[item.id];
        
        let previewHtml = '';
        if (item.reference_image) {
            previewHtml = `
                <div class="reference-preview" onclick="openLightbox('${item.reference_image}', 'Ảnh mẫu tiêu chuẩn: ${item.task_name}')" style="cursor: pointer;">
                    <span class="preview-badge">ẢNH MẪU TIÊU CHUẨN</span>
                    <img src="${item.reference_image}" alt="Reference standard" onerror="this.outerHTML='<div class=&quot;img-placeholder-svg&quot;><i class=&quot;fa-solid fa-image&quot;></i>Lỗi tải ảnh mẫu</div>'">
                </div>
            `;
        } else {
            previewHtml = `
                <div class="reference-preview">
                    <div class="img-placeholder-svg">
                        <i class="fa-solid fa-image-portrait"></i>
                        <span>Không có ảnh mẫu</span>
                    </div>
                </div>
            `;
        }
        
        let gradingStatusHtml = '';
        if (graded) {
            const statusClass = graded.status === 'pass' ? 'pass' : 'fail';
            const statusText = graded.status === 'pass' ? 'Đạt' : 'Không Đạt';
            const notesText = graded.notes ? `<br><small class="text-muted">Ghi chú: ${graded.notes}</small>` : '';
            
            gradingStatusHtml = `
                <div class="grading-result-badge ${statusClass}">
                    <img src="${graded.captured_image}" class="grading-result-thumb" alt="Captured" onclick="openLightbox('${graded.captured_image}', 'Ảnh thực tế: ${item.task_name}')" style="cursor: pointer;">
                    <div>
                        <strong>${statusText}</strong>
                        ${notesText}
                    </div>
                </div>
            `;
        }
        
        const isLocked = state.existingSubmission && state.existingSubmission.status === 'approved';
        const buttonText = graded ? 'Chấm Lại' : 'Chụp Ảnh & Chấm';
        const buttonClass = graded ? 'btn-outline' : 'btn-primary';
        const disabledAttr = isLocked ? 'disabled' : '';
        
        card.innerHTML = `
            <div class="checklist-card-header">
                <span class="checklist-number">${index + 1}</span>
                <span class="checklist-task-text">${item.task_name}</span>
            </div>
            
            ${previewHtml}
            
            ${gradingStatusHtml}
            
            <button class="btn ${buttonClass} btn-block" onclick="openCameraModalFor(${item.id})" ${disabledAttr}>
                <i class="fa-solid fa-camera"></i> ${buttonText}
            </button>
        `;
        
        container.appendChild(card);
    });
}

function checkChecklistCompleteness() {
    const submitBar = document.getElementById('checklist-submit-bar');
    if (state.existingSubmission && state.existingSubmission.status === 'approved') {
        submitBar.classList.add('hide');
        return;
    }
    
    // Luôn hiển thị nút Gửi nếu đang được phân công chấm chéo
    if (state.assignedArea && state.checklistItems && state.checklistItems.length > 0) {
        submitBar.classList.remove('hide');
    } else {
        submitBar.classList.add('hide');
    }
}

async function submitAllChecklist() {
    const gradedCount = Object.keys(state.submissionState).length;
    if (gradedCount === 0) {
        alert('Vui lòng thực hiện chấm điểm ít nhất 1 hạng mục trước khi gửi báo cáo.');
        return;
    }
    
    const totalCount = state.checklistItems.length;
    if (!confirm(`Bạn chắc chắn muốn gửi báo cáo checklist này? (Đã chấm ${gradedCount}/${totalCount} hạng mục). Kết quả sẽ được lưu và gửi lên cloud để Quản lý phê duyệt.`)) return;
    
    const submitBtn = document.getElementById('submit-all-checklist-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang gửi dữ liệu...';
    
    try {
        const itemsPayload = Object.keys(state.submissionState).map(itemId => ({
            item_id: parseInt(itemId),
            status: state.submissionState[itemId].status,
            captured_image: state.submissionState[itemId].captured_image,
            notes: state.submissionState[itemId].notes
        }));
        
        const gps = await getGPSLocation();
        const response = await fetch('/api/checklist/submit_complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grader_id: state.currentUser.id,
                area_id: state.assignedArea.id,
                items: itemsPayload,
                latitude: gps ? gps.latitude : null,
                longitude: gps ? gps.longitude : null
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Không thể gửi checklist');
        }
        
        alert('Đã gửi checklist thành công! Đang chờ quản lý duyệt ca chấm chéo của bạn.');
        await loadAssignedChecklist();
    } catch (e) {
        alert(e.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> GỬI CHECKLIST & LƯU LÊN CLOUD';
    }
}

// ================= CAMERA & OVERLAY SYSTEM LOGIC =================
async function openCameraModalFor(itemId) {
    // Khởi tạo chạy ngầm lấy GPS để dùng ngay khi chụp
    state.gpsLocation = null;
    getGPSLocation().then(gps => {
        state.gpsLocation = gps;
    });
    
    state.activeItemId = itemId;
    const item = state.checklistItems.find(i => i.id === itemId);
    
    // 1. Thiết lập ảnh mẫu lớp phủ
    const overlayImg = document.getElementById('camera-overlay-image');
    if (item && item.reference_image) {
        overlayImg.src = item.reference_image;
        overlayImg.classList.remove('hide');
        
        // Reset slider về 30% mặc định
        const slider = document.getElementById('overlay-opacity-slider');
        const opacityVal = document.getElementById('opacity-val');
        if (slider && opacityVal) {
            slider.value = 30;
            opacityVal.textContent = '30%';
        }
        overlayImg.style.opacity = 0.3;
    } else {
        overlayImg.src = '';
        overlayImg.classList.add('hide');
    }
    
    // Cố định tỉ lệ đứng 3:4 cho camera preview
    updateCameraAspectRatio(3/4);
    
    // 2. Mở Camera stream
    const video = document.getElementById('webcam');
    const modal = document.getElementById('camera-modal');
    modal.classList.add('active');
    
    resetCameraModalUI();
    
    try {
        state.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        video.srcObject = state.webcamStream;
    } catch (e) {
        console.warn("Không mở được camera qua MediaDevices API (Có thể chạy qua HTTP không bảo mật hoặc thiết bị không có webcam). Sử dụng Fallback uploader.");
        // Hiển thị thông báo hỗ trợ cho người dùng
        const previewContainer = document.querySelector('.camera-preview-container');
        // Không crash, người dùng dùng tải ảnh
    }
}

function resetCameraModalUI() {
    document.getElementById('webcam').classList.remove('hide');
    document.getElementById('captured-preview').classList.add('hide');
    document.getElementById('snap-btn').classList.remove('hide');
    document.getElementById('retake-btn').classList.add('hide');
    document.getElementById('grading-panel').classList.add('hide');
    
    // Reset grade
    state.activeGrade = 'pass';
    state.capturedImageUrl = null;
    document.querySelectorAll('.btn-grade').forEach(btn => {
        if (btn.getAttribute('data-grade') === 'pass') btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.getElementById('grade-notes').value = '';
    
    // Nếu có ảnh đã chụp trước đó cho hạng mục này, hiển thị gợi ý và ảnh preview
    const oldGraded = state.submissionState[state.activeItemId];
    if (oldGraded) {
        document.getElementById('grade-notes').value = oldGraded.notes || '';
        state.activeGrade = oldGraded.status;
        state.capturedImageUrl = oldGraded.captured_image;
        document.querySelectorAll('.btn-grade').forEach(btn => {
            if (btn.getAttribute('data-grade') === oldGraded.status) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        // Hiển thị ảnh preview đã chụp
        document.getElementById('webcam').classList.add('hide');
        const preview = document.getElementById('captured-preview');
        preview.src = oldGraded.captured_image;
        preview.classList.remove('hide');
        document.getElementById('snap-btn').classList.add('hide');
        document.getElementById('retake-btn').classList.remove('hide');
        document.getElementById('grading-panel').classList.remove('hide');
    }

    // Cập nhật nội dung và màu sắc nút bấm Lưu/Nộp
    const saveBtn = document.getElementById('save-grade-btn');
    if (saveBtn && state.checklistItems) {
        const currentIndex = state.checklistItems.findIndex(i => i.id === state.activeItemId);
        const total = state.checklistItems.length;
        if (currentIndex !== -1 && currentIndex < total - 1) {
            saveBtn.innerHTML = `<i class="fa-solid fa-arrow-right"></i> Lưu & Chấm Tiếp (Hạng mục ${currentIndex + 2}/${total})`;
            saveBtn.style.backgroundColor = "var(--color-primary)"; 
            saveBtn.style.color = "#ffffff";
        } else {
            saveBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Lưu & GỬI BÁO CÁO LÊN CLOUD`;
            saveBtn.style.backgroundColor = "#28a745"; 
            saveBtn.style.color = "#ffffff";
        }
    }
}

function closeCameraModal() {
    stopCameraStream();
    document.getElementById('camera-modal').classList.remove('active');
}

function stopCameraStream() {
    if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => track.stop());
        state.webcamStream = null;
    }
    const video = document.getElementById('webcam');
    if (video) video.srcObject = null;
}

// Chụp ảnh từ luồng video
async function capturePhoto() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('capture-canvas');
    const context = canvas.getContext('2d');
    const preview = document.getElementById('captured-preview');
    const snapBtn = document.getElementById('snap-btn');
    
    if (!state.webcamStream) {
        alert("Camera không hoạt động! Vui lòng sử dụng tính năng 'Tải ảnh lên thay thế'.");
        return;
    }
    
    snapBtn.disabled = true;
    snapBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chụp...';
    
    // Kích thước canvas cố định tỉ lệ đứng 3:4 (ví dụ 600x800) để đồng bộ mọi màn hình
    const targetRatio = 3/4;
    const targetWidth = 600;
    const targetHeight = 800;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    const videoRatio = videoWidth / videoHeight;
    
    let sx, sy, sWidth, sHeight;
    if (videoRatio > targetRatio) {
        // Luồng video rộng hơn tỉ lệ 4:3 -> Cố định chiều cao, crop 2 bên
        sHeight = videoHeight;
        sWidth = videoHeight * targetRatio;
        sx = (videoWidth - sWidth) / 2;
        sy = 0;
    } else {
        // Luồng video dọc/cao hơn tỉ lệ 4:3 -> Cố định chiều rộng, crop trên dưới
        sWidth = videoWidth;
        sHeight = videoWidth / targetRatio;
        sx = 0;
        sy = (videoHeight - sHeight) / 2;
    }
    
    context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
    
    // Chờ lấy toạ độ GPS nếu chưa có sẵn từ luồng chạy ngầm (đợi tối đa 1.5 giây)
    let gpsStr = '';
    if (state.gpsLocation) {
        gpsStr = `${state.gpsLocation.latitude}, ${state.gpsLocation.longitude}`;
    } else {
        const gps = await Promise.race([
            getGPSLocation(),
            new Promise(resolve => setTimeout(() => resolve(null), 1500))
        ]);
        if (gps) {
            state.gpsLocation = gps;
            gpsStr = `${gps.latitude}, ${gps.longitude}`;
        }
    }
    
    // Đóng dấu Watermark thời gian & toạ độ GPS
    drawWatermark(context, targetWidth, targetHeight, gpsStr);
    
    canvas.toBlob(async (blob) => {
        const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
        await uploadCapturedFile(file);
        
        // Dừng camera và hiện ảnh preview
        stopCameraStream();
        video.classList.add('hide');
        
        preview.src = URL.createObjectURL(blob);
        preview.classList.remove('hide');
        
        // Hiện panel chấm điểm
        snapBtn.classList.add('hide');
        snapBtn.disabled = false;
        snapBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Chụp Ảnh';
        document.getElementById('retake-btn').classList.remove('hide');
        document.getElementById('grading-panel').classList.remove('hide');
    }, 'image/jpeg', 0.85);
}

// Reset để chụp lại
async function resetCameraForRetake() {
    resetCameraModalUI();
    const video = document.getElementById('webcam');
    try {
        state.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        video.srcObject = state.webcamStream;
    } catch (e) {
        alert("Không thể khởi động lại camera. Vui lòng tải ảnh lên.");
    }
}

// Xử lý upload ảnh
async function uploadCapturedFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await fetch('/api/uploads/image', {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) throw new Error('Không thể tải ảnh lên server');
        
        const data = await res.json();
        state.capturedImageUrl = data.url;
    } catch (e) {
        alert("Lỗi upload ảnh: " + e.message);
        throw e;
    }
}

// Nén ảnh client-side trước khi upload để giảm dung lượng (tối ưu cho di động 3G/4G)
async function compressAndUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = async function () {
                // Tỉ lệ đứng 3:4 xuất ra cho ảnh nén
                const targetRatio = 3/4;
                const targetWidth = 600;
                const targetHeight = 800;
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                
                // Tính toán crop "cover" tâm ảnh để giữ đúng tỉ lệ không bị bóp méo hình
                const imgWidth = img.width;
                const imgHeight = img.height;
                const imgRatio = imgWidth / imgHeight;
                
                let sx, sy, sWidth, sHeight;
                if (imgRatio > targetRatio) {
                    // Ảnh tải lên có dạng góc rộng (bè ngang) -> Crop hai bên
                    sHeight = imgHeight;
                    sWidth = imgHeight * targetRatio;
                    sx = (imgWidth - sWidth) / 2;
                    sy = 0;
                } else {
                    // Ảnh tải lên có dạng dọc (chân dung) -> Crop trên dưới
                    sWidth = imgWidth;
                    sHeight = imgWidth / targetRatio;
                    sx = 0;
                    sy = (imgHeight - sHeight) / 2;
                }
                
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
                
                // Chờ lấy toạ độ GPS nếu chưa có sẵn từ luồng chạy ngầm (đợi tối đa 1.5 giây)
                let gpsStr = '';
                if (state.gpsLocation) {
                    gpsStr = `${state.gpsLocation.latitude}, ${state.gpsLocation.longitude}`;
                } else {
                    const gps = await Promise.race([
                        getGPSLocation(),
                        new Promise(resolve => setTimeout(() => resolve(null), 1500))
                    ]);
                    if (gps) {
                        state.gpsLocation = gps;
                        gpsStr = `${gps.latitude}, ${gps.longitude}`;
                    }
                }
                
                // Đóng dấu Watermark thời gian & toạ độ GPS
                drawWatermark(ctx, targetWidth, targetHeight, gpsStr);

                canvas.toBlob(async (blob) => {
                    const compressedFile = new File([blob], file.name || "upload.jpg", {
                        type: "image/jpeg"
                    });
                    try {
                        await uploadCapturedFile(compressedFile);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 'image/jpeg', 0.8); // Nén chất lượng 80%
            };
            img.onerror = function (err) {
                reject(err);
            };
        };
        reader.onerror = function (err) {
            reject(err);
        };
    });
}

// Xử lý khi chọn file fallback
async function handleFileUploadFallback(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('captured-preview');
    const video = document.getElementById('webcam');
    
    // Tạm dừng webcam
    stopCameraStream();
    video.classList.add('hide');
    
    // Hiển thị ảnh tải lên
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hide');
    
    // Tiến hành nén và upload
    try {
        await compressAndUpload(file);
        
        // Hiện panel chấm điểm
        document.getElementById('snap-btn').classList.add('hide');
        document.getElementById('retake-btn').classList.remove('hide');
        document.getElementById('grading-panel').classList.remove('hide');
    } catch (err) {
        resetCameraForRetake();
    }
}

// Lưu kết quả chấm điểm của mục hiện tại vào state tạm thời
async function saveItemGrade() {
    if (!state.capturedImageUrl) {
        alert('Hình ảnh thực tế chưa được chụp hoặc upload thành công.');
        return;
    }
    
    const notes = document.getElementById('grade-notes').value.trim();
    
    state.submissionState[state.activeItemId] = {
        status: state.activeGrade,
        captured_image: state.capturedImageUrl,
        notes: notes
    };
    
    renderChecklistCards();
    checkChecklistCompleteness();
    
    // Xác định mục tiếp theo
    const currentIndex = state.checklistItems.findIndex(i => i.id === state.activeItemId);
    const total = state.checklistItems.length;
    
    if (currentIndex !== -1 && currentIndex < total - 1) {
        // Chuyển sang hạng mục tiếp theo
        const nextItem = state.checklistItems[currentIndex + 1];
        
        // Dừng camera stream cũ trước khi mở cái mới
        stopCameraStream();
        
        // Cấu hình ID mục hoạt động mới
        state.activeItemId = nextItem.id;
        
        // Cấu hình ảnh mẫu lớp phủ mới
        const overlayImg = document.getElementById('camera-overlay-image');
        if (nextItem.reference_image) {
            overlayImg.src = nextItem.reference_image;
            overlayImg.classList.remove('hide');
            
            // Reset slider về 30% mặc định
            const slider = document.getElementById('overlay-opacity-slider');
            const opacityVal = document.getElementById('opacity-val');
            if (slider && opacityVal) {
                slider.value = 30;
                opacityVal.textContent = '30%';
            }
            overlayImg.style.opacity = 0.3;
        } else {
            overlayImg.src = '';
            overlayImg.classList.add('hide');
        }
        
        // Cố định tỉ lệ đứng 3:4 cho camera preview của mục kế tiếp
        updateCameraAspectRatio(3/4);
        
        // Khởi động lại UI cho mục mới
        resetCameraModalUI();
        
        // Khởi động camera stream mới
        const video = document.getElementById('webcam');
        try {
            state.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            video.srcObject = state.webcamStream;
        } catch (e) {
            console.warn("Không khởi động lại được camera: ", e);
        }
    } else {
        // Nếu là mục cuối cùng, kiểm tra đầy đủ và gửi báo cáo thẳng lên cloud luôn!
        const allGraded = state.checklistItems.every(item => state.submissionState[item.id]);
        if (!allGraded) {
            alert('Vui lòng hoàn thành chấm điểm đầy đủ tất cả các hạng mục trước khi gửi báo cáo.');
            closeCameraModal();
            return;
        }
        
        closeCameraModal();
        await submitAllChecklist();
    }
}

// ================= QUẢN LÝ: TỔNG QUAN (MANAGER DASHBOARD) =================
async function loadManagerDashboardData() {
    try {
        const res = await fetch('/api/manager/dashboard');
        const data = await res.json();
        
        // Cập nhật stats
        document.getElementById('stat-active-staff').textContent = data.active_staff_count;
        document.getElementById('stat-today-checklists').textContent = data.today_checklist_count;
        document.getElementById('stat-total-areas').textContent = data.total_areas;
        document.getElementById('stat-total-staff').textContent = data.total_staff;
        
        // Cập nhật log gần đây
        const tbody = document.querySelector('#dashboard-recent-logs-table tbody');
        tbody.innerHTML = '';
        
        if (data.recent_logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa ghi nhận hoạt động nào gần đây.</td></tr>';
            return;
        }
        
        data.recent_logs.forEach(shift => {
            const tr = document.createElement('tr');
            
            const checkInTime = shift.check_in || '<span class="text-muted">-</span>';
            let checkOutTime = '';
            let durationText = '';
            
            if (shift.check_out) {
                checkOutTime = shift.check_out;
                durationText = `<span class="badge badge-approved" style="background-color: rgba(16, 185, 129, 0.1); color: #065f46; border: 1px solid rgba(16, 185, 129, 0.2);">${shift.duration || '-'}</span>`;
            } else {
                checkOutTime = '<span class="text-success font-weight-bold"><i class="fa-solid fa-circle-dot fa-fade" style="font-size: 0.75rem; margin-right: 4px;"></i> Đang làm việc</span>';
                durationText = '<span class="text-muted">-</span>';
            }
            
            // Tạo liên kết bản đồ Google Maps cho Check-in và Check-out
            let gpsHtml = '';
            if (shift.check_in_lat && shift.check_in_lng) {
                gpsHtml += `<a href="https://www.google.com/maps?q=${shift.check_in_lat},${shift.check_in_lng}" target="_blank" class="badge badge-info" style="display:inline-block; margin-right:4px;"><i class="fa-solid fa-location-dot"></i> Vào ca</a>`;
            }
            if (shift.check_out_lat && shift.check_out_lng) {
                gpsHtml += `<a href="https://www.google.com/maps?q=${shift.check_out_lat},${shift.check_out_lng}" target="_blank" class="badge badge-warning" style="display:inline-block;"><i class="fa-solid fa-location-dot"></i> Ra ca</a>`;
            }
            if (!gpsHtml) {
                gpsHtml = '<span class="text-muted">-</span>';
            }
            
            tr.innerHTML = `
                <td><strong>${shift.user_name}</strong></td>
                <td>${shift.area_name}</td>
                <td>${checkInTime}</td>
                <td>${checkOutTime}</td>
                <td>${durationText}</td>
                <td>${gpsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (e) {
        console.error("Lỗi khi tải dashboard quản lý:", e);
    }
}

// ================= QUẢN LÝ: BÁO CÁO & HIỆU SUẤT (REPORTS) =================
async function loadManagerReports(startDate = '', endDate = '') {
    const tbody = document.querySelector('#report-efficiency-table tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Đang tính toán KPIs và tải báo cáo hiệu suất...</td></tr>';
    
    const searchInput = document.getElementById('report-search-input');
    const searchVal = searchInput ? searchInput.value.trim() : '';
    
    // Cập nhật đường dẫn xuất excel
    const attendanceBtn = document.getElementById('export-attendance-btn');
    const efficiencyBtn = document.getElementById('export-efficiency-btn');
    
    if (attendanceBtn && efficiencyBtn) {
        let attUrl = `/api/manager/reports/export/attendance?`;
        let effUrl = `/api/manager/reports/export/efficiency?`;
        const params = [];
        if (startDate && endDate) {
            params.push(`start_date=${startDate}`);
            params.push(`end_date=${endDate}`);
        }
        if (searchVal) {
            params.push(`search=${encodeURIComponent(searchVal)}`);
        }
        const paramStr = params.join('&');
        attendanceBtn.setAttribute('href', attUrl + paramStr);
        efficiencyBtn.setAttribute('href', effUrl + paramStr);
    }
    
    try {
        let url = '/api/manager/reports/efficiency?';
        const params = [];
        if (startDate && endDate) {
            params.push(`start_date=${startDate}`);
            params.push(`end_date=${endDate}`);
        }
        if (searchVal) {
            params.push(`search=${encodeURIComponent(searchVal)}`);
        }
        url += params.join('&');
        
        const res = await fetch(url);
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Chưa có dữ liệu báo cáo nhân viên nào trong khoảng thời gian này.</td></tr>';
            return;
        }
        
        data.forEach(item => {
            const tr = document.createElement('tr');
            
            const statusClass = item.status === 'Hiệu quả' ? 'badge-approved' : 'badge-rejected';
            const textClass = item.status === 'Hiệu quả' ? 'text-success' : 'text-danger';
            
            tr.innerHTML = `
                <td class="text-center"><code>${item.code}</code></td>
                <td><strong>${item.name}</strong></td>
                <td>${item.area_name}</td>
                <td class="text-center">${item.total_hours.toFixed(1)} giờ</td>
                <td class="text-center">${item.checkins_count} ca</td>
                <td class="text-center">${item.checklists_submitted} lần</td>
                <td class="text-center font-weight-bold">${item.hygiene_score.toFixed(1)}%</td>
                <td class="text-center font-weight-bold">${item.completion_rate.toFixed(1)}%</td>
                <td class="text-center"><span class="badge ${statusClass}">${item.status}</span></td>
                <td class="${textClass} text-small">${item.reason}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Lỗi khi tạo dữ liệu báo cáo.</td></tr>';
    }
}

async function handleReportFilter() {
    const startVal = document.getElementById('report-start-date').value;
    const endVal = document.getElementById('report-end-date').value;
    
    if (!startVal || !endVal) {
        alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
        return;
    }
    
    const start = new Date(startVal);
    const end = new Date(endVal);
    
    if (end < start) {
        alert("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
        return;
    }
    
    // Tính khoảng cách ngày
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays < 1) {
        alert("Thời gian chọn tối thiểu là 1 ngày!");
        return;
    }
    
    if (diffDays > 31) {
        alert("Khoảng thời gian chọn tối đa là 1 tháng (31 ngày)!");
        return;
    }
    
    await loadManagerReports(startVal, endVal);
}

// ================= QUẢN LÝ: DUYỆT CHECKLIST SUBMISSIONS =================
async function loadChecklistSubmissions(status) {
    const container = document.getElementById('submissions-list-container');
    container.innerHTML = '<div class="empty-state">Đang tải danh sách checklist...</div>';
    
    try {
        const res = await fetch(`/api/manager/submissions?status=${status}`);
        const data = await res.json();
        
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = `<div class="empty-state">Không tìm thấy ca checklist nào ở trạng thái này.</div>`;
            return;
        }
        
        data.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'submission-row glass';
            
            // Xây dựng list ảnh xem nhanh
            let thumbsHtml = '';
            sub.details.forEach(d => {
                const imgClass = d.status === 'pass' ? 'pass' : 'fail';
                thumbsHtml += `
                    <div class="sub-thumb-card">
                        <img src="${d.captured_image}" class="sub-thumb-img ${imgClass}" alt="Thumb" onerror="this.src='/static/uploads/error.png'">
                        <span>${d.status === 'pass' ? 'Đạt' : 'Không đạt'}</span>
                    </div>
                `;
            });
            
            const btnHtml = status === 'pending' 
                ? `<button class="btn btn-primary" onclick="openReviewModal(${sub.id})"><i class="fa-solid fa-file-signature"></i> Xem & Duyệt</button>`
                : `<button class="btn btn-outline" onclick="openReviewModal(${sub.id})"><i class="fa-solid fa-eye"></i> Xem Chi Tiết</button>`;
                
            const managerNotesText = sub.manager_notes ? `<p class="text-muted text-small"><strong>Phản hồi:</strong> ${sub.manager_notes}</p>` : '';
            
            let gpsHtml = '';
            if (sub.latitude && sub.longitude) {
                gpsHtml = `<span><i class="fa-solid fa-location-dot text-primary"></i> <a href="https://www.google.com/maps?q=${sub.latitude},${sub.longitude}" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: bold;">Bản đồ GPS</a></span>`;
            }
            
            card.innerHTML = `
                <div class="submission-row-header">
                    <div>
                        <h4>Khu vực: ${sub.area_name}</h4>
                        <div class="sub-meta-info text-muted text-small margin-top-xs">
                            <span><i class="fa-solid fa-user"></i> Người chấm: <strong>${sub.grader_name}</strong></span>
                            <span><i class="fa-solid fa-calendar"></i> Ngày: ${sub.timestamp}</span>
                            ${gpsHtml}
                        </div>
                    </div>
                    <div>
                        ${btnHtml}
                    </div>
                </div>
                <div>
                    <p class="text-small text-secondary">Xem nhanh hình ảnh đã chụp:</p>
                    <div class="submission-thumb-list margin-top-xs">
                        ${thumbsHtml}
                    </div>
                    ${managerNotesText}
                </div>
            `;
            container.appendChild(card);
        });
        
    } catch (e) {
        container.innerHTML = `<div class="empty-state text-danger">Không tải được danh sách checklist: ${e.message}</div>`;
    }
}

// Mở modal duyệt checklist chi tiết
async function openReviewModal(submissionId) {
    const modal = document.getElementById('review-modal');
    modal.classList.add('active');
    
    // Tải thông tin chi tiết bằng API submissions cũ và lọc
    // Để cho tiện, ta lưu danh sách sub hoặc fetch lại.
    // Lấy trạng thái tab duyệt hiện tại
    const activeSubTab = document.querySelector('.sub-tab-btn.active');
    const status = activeSubTab ? activeSubTab.getAttribute('data-status') : 'pending';
    
    try {
        const res = await fetch(`/api/manager/submissions?status=${status}`);
        const list = await res.json();
        const sub = list.find(s => s.id === submissionId);
        
        if (!sub) return;
        state.activeReviewSubmission = sub;
        
        // Đổ dữ liệu lên UI
        document.getElementById('rev-grader-name').textContent = sub.grader_name;
        document.getElementById('rev-area-name').textContent = sub.area_name;
        document.getElementById('rev-timestamp').textContent = sub.timestamp;
        document.getElementById('review-notes').value = sub.manager_notes || '';
        
        // Đổ dữ liệu định vị GPS
        const gpsWrapper = document.getElementById('rev-gps-wrapper');
        const gpsLink = document.getElementById('rev-gps-link');
        if (gpsWrapper && gpsLink) {
            if (sub.latitude && sub.longitude) {
                gpsLink.innerHTML = `<a href="https://www.google.com/maps?q=${sub.latitude},${sub.longitude}" target="_blank" style="color: var(--color-primary); font-weight: bold; text-decoration: underline;"><i class="fa-solid fa-location-dot"></i> Xem trên bản đồ (Toạ độ: ${sub.latitude}, ${sub.longitude})</a>`;
                gpsWrapper.classList.remove('hide');
            } else {
                gpsWrapper.classList.add('hide');
            }
        }
        
        // Ẩn hiện các nút duyệt tùy thuộc vào trạng thái
        const actionPanel = document.querySelector('.review-action-panel');
        if (sub.status === 'pending') {
            actionPanel.classList.remove('hide');
        } else {
            actionPanel.classList.add('hide');
        }
        
        // Render chi tiết từng hạng mục so sánh
        const container = document.getElementById('review-items-container');
        container.innerHTML = '';
        
        sub.details.forEach((item, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'review-item-row';
            
            // Hỗ trợ trường hợp chưa chấm điểm mục này (status = null)
            let gradeText = '';
            let gradeClass = '';
            if (item.status === 'pass') {
                gradeText = 'ĐẠT (SẠCH SẼ)';
                gradeClass = 'text-success';
            } else if (item.status === 'fail') {
                gradeText = 'KHÔNG ĐẠT (CẦN VỆ SINH LẠI)';
                gradeClass = 'text-danger';
            } else {
                gradeText = 'CHƯA ĐÁNH GIÁ (BỎ QUA)';
                gradeClass = 'text-muted';
            }
            
            const notesText = item.notes ? `Ghi chú nhân viên: "${item.notes}"` : (item.status ? 'Nhân viên không để lại ghi chú.' : '-');
            
            let refImgHtml = '';
            if (item.reference_image) {
                refImgHtml = `<img src="${item.reference_image}" class="compare-img" alt="Ảnh mẫu" onclick="openLightbox('${item.reference_image}', 'Ảnh mẫu tiêu chuẩn: ${item.task_name}')" style="cursor: pointer;">`;
            } else {
                refImgHtml = `
                    <div class="compare-img img-placeholder-svg">
                        <i class="fa-solid fa-image"></i>
                        <span>Chưa có ảnh mẫu</span>
                    </div>
                `;
            }
            
            let capImgHtml = '';
            if (item.captured_image) {
                capImgHtml = `<img src="${item.captured_image}" class="compare-img" alt="Ảnh chụp thực tế" onclick="openLightbox('${item.captured_image}', 'Ảnh thực tế: ${item.task_name}')" style="cursor: pointer;">`;
            } else {
                capImgHtml = `
                    <div class="compare-img img-placeholder-svg" style="background-color: rgba(255,255,255,0.02); color: var(--text-muted); font-size: 0.85rem; flex-direction: column; gap: 6px;">
                        <i class="fa-solid fa-camera" style="font-size: 1.5rem;"></i>
                        <span>Chưa thực hiện chụp</span>
                    </div>
                `;
            }
            
            itemRow.innerHTML = `
                <div class="review-item-title">${index + 1}. ${item.task_name}</div>
                <div class="review-images-compare">
                    <div class="compare-box">
                        <span>Ảnh mẫu tiêu chuẩn:</span>
                        ${refImgHtml}
                    </div>
                    <div class="compare-box">
                        <span>Ảnh thực tế chụp:</span>
                        ${capImgHtml}
                    </div>
                </div>
                <div class="review-item-status-notes margin-top-sm">
                    <div>Đánh giá của nhân sự: <strong class="${gradeClass}">${gradeText}</strong></div>
                    <div class="text-muted text-small">${notesText}</div>
                </div>
            `;
            container.appendChild(itemRow);
        });
        
    } catch (e) {
        alert("Lỗi khi tải chi tiết checklist: " + e.message);
    }
}

async function approveSubmission(status) {
    if (!state.activeReviewSubmission) return;
    
    const notes = document.getElementById('review-notes').value.trim();
    const actionBtn = status === 'approved' ? document.getElementById('approve-submission-btn') : document.getElementById('reject-submission-btn');
    
    actionBtn.disabled = true;
    try {
        const res = await fetch('/api/manager/submissions/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submission_id: state.activeReviewSubmission.id,
                status,
                notes
            })
        });
        
        if (!res.ok) throw new Error('Không thể duyệt checklist này');
        
        alert(status === 'approved' ? 'Đã duyệt đạt checklist ca làm việc này!' : 'Đã trả về yêu cầu nhân viên làm lại.');
        document.getElementById('review-modal').classList.remove('active');
        
        // Reload submissions list
        const activeSubTab = document.querySelector('.sub-tab-btn.active');
        loadChecklistSubmissions(activeSubTab ? activeSubTab.getAttribute('data-status') : 'pending');
    } catch (e) {
        alert(e.message);
    } finally {
        actionBtn.disabled = false;
    }
}

// ================= QUẢN LÝ: THÀNH VIÊN (STAFF MANAGEMENT) =================
async function loadManagerStaffList() {
    const tbody = document.querySelector('#manager-staff-table tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Đang tải danh sách nhân sự...</td></tr>';
    
    try {
        // Tải danh sách khu vực trước để fill dropdowns
        const areasRes = await fetch('/api/manager/areas');
        const areas = await areasRes.json();
        
        const areaSelect = document.getElementById('staff-area-select');
        areaSelect.innerHTML = '<option value="">Chọn khu vực mặc định...</option>';
        areas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            areaSelect.appendChild(opt);
        });
        
        const res = await fetch('/api/manager/staff');
        const staff = await res.json();
        
        tbody.innerHTML = '';
        // Lọc bỏ những nhân sự ở trạng thái 'inactive'
        const activeStaff = staff.filter(s => s.status === 'active');
        
        if (activeStaff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chưa cấu hình nhân viên nào.</td></tr>';
            return;
        }
        
        activeStaff.forEach(s => {
            const tr = document.createElement('tr');
            
            const roleMap = { 'manager': 'Quản lý', 'fulltime': 'Fulltime', 'parttime': 'Parttime' };
            const roleBadge = s.role === 'manager' ? 'badge-manager' : 'badge-role';
            
            tr.innerHTML = `
                <td><code>${s.code}</code></td>
                <td><strong>${s.name}</strong></td>
                <td><code>${s.cccd || '-'}</code></td>
                <td><span class="badge ${roleBadge}">${roleMap[s.role] || s.role}</span></td>
                <td>${s.area_name || '-'}</td>
                <td><span class="badge badge-approved">Đang hoạt động</span></td>
                <td class="text-center">
                    <button class="btn btn-outline btn-sm" onclick="openStaffModal(${s.id}, '${s.name}', '${s.code}', '${s.role}', ${s.area_id || 'null'}, '${s.cccd || ''}')">
                        <i class="fa-solid fa-edit text-primary"></i> Sửa
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="deleteStaff(${s.id})">
                        <i class="fa-solid fa-trash text-danger"></i> Xóa
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Lỗi khi tải danh sách.</td></tr>';
    }
}

function openStaffModal(id = '', name = '', code = '', role = 'fulltime', areaId = '', cccd = '') {
    const modal = document.getElementById('staff-modal');
    document.getElementById('staff-modal-title').textContent = id ? 'Cập Nhật Nhân Viên' : 'Thêm Nhân Viên';
    document.getElementById('staff-id').value = id;
    document.getElementById('staff-name').value = name;
    document.getElementById('staff-code').value = code;
    document.getElementById('staff-role').value = role;
    document.getElementById('staff-cccd').value = cccd;
    
    // Trigger ẩn/hiện khu vực dựa trên role
    const areaGroup = document.getElementById('staff-area-group');
    if (role === 'manager') areaGroup.classList.add('hide');
    else areaGroup.classList.remove('hide');
    
    const cccdInput = document.getElementById('staff-cccd');
    const toggleCCCDRequired = (currentRole) => {
        if (currentRole === 'manager') {
            cccdInput.removeAttribute('required');
            document.querySelector('label[for="staff-cccd"]').innerHTML = 'Số Căn cước công dân (CCCD) <span style="font-weight: normal; opacity: 0.6;">(Không bắt buộc)</span>:';
        } else {
            cccdInput.setAttribute('required', 'required');
            document.querySelector('label[for="staff-cccd"]').innerHTML = 'Số Căn cước công dân (CCCD) <span class="text-danger">*</span>:';
        }
    };
    
    toggleCCCDRequired(role);
    
    document.getElementById('staff-role').onchange = (e) => {
        const selectedRole = e.target.value;
        if (selectedRole === 'manager') areaGroup.classList.add('hide');
        else areaGroup.classList.remove('hide');
        
        toggleCCCDRequired(selectedRole);
    };
    
    // Chọn option khu vực tương ứng
    const areaSelect = document.getElementById('staff-area-select');
    areaSelect.value = areaId || '';
    
    modal.classList.add('active');
}

function generateRandomStaffCode() {
    const role = document.getElementById('staff-role').value;
    let prefix = 'FT';
    if (role === 'parttime') prefix = 'PT';
    else if (role === 'manager') prefix = 'MN';
    const rand = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('staff-code').value = `${prefix}${rand}`;
}

async function saveStaff(e) {
    e.preventDefault();
    const id = document.getElementById('staff-id').value;
    const name = document.getElementById('staff-name').value.trim();
    const code = document.getElementById('staff-code').value.trim().toUpperCase();
    const role = document.getElementById('staff-role').value;
    const cccd = document.getElementById('staff-cccd').value.trim();
    const areaId = document.getElementById('staff-area-select').value;
    
    // Validate CCCD trên client
    if (role !== 'manager') {
        if (!cccd) {
            alert('Số CCCD là bắt buộc đối với nhân viên!');
            return;
        }
        if (!/^\d{12}$/.test(cccd)) {
            alert('Số CCCD không hợp lệ! Vui lòng nhập đúng 12 chữ số.');
            return;
        }
    }
    
    try {
        const res = await fetch('/api/manager/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id ? parseInt(id) : null,
                name,
                code,
                role,
                cccd,
                area_id: areaId ? parseInt(areaId) : null
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Lưu thông tin thất bại');
        }
        
        document.getElementById('staff-modal').classList.remove('active');
        await loadManagerStaffList();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteStaff(id) {
    if (!confirm('Bạn chắc chắn muốn xóa nhân viên này? Tài khoản sẽ chuyển sang vô hiệu hóa.')) return;
    
    try {
        const res = await fetch('/api/manager/staff/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        if (!res.ok) throw new Error('Không xóa được nhân viên');
        await loadManagerStaffList();
    } catch (e) {
        alert(e.message);
    }
}

// ================= QUẢN LÝ: THIẾT LẬP KHU VỰC & CHECKLIST (CONFIGS) =================
async function loadManagerConfigData() {
    // 1. Tải danh sách khu vực
    const tbodyAreas = document.querySelector('#manager-areas-table tbody');
    tbodyAreas.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Đang tải...</td></tr>';
    
    try {
        const res = await fetch('/api/manager/areas');
        const areas = await res.json();
        
        tbodyAreas.innerHTML = '';
        
        // Cập nhật các select lọc và select trong item modal
        const filterSelect = document.getElementById('config-area-filter');
        const currentFilterVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Chọn khu vực lọc...</option>';
        
        const itemAreaSelect = document.getElementById('item-area-select');
        itemAreaSelect.innerHTML = '<option value="">Chọn khu vực...</option>';
        
        if (areas.length === 0) {
            tbodyAreas.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chưa có khu vực nào.</td></tr>';
            return;
        }
        
        areas.forEach(a => {
            // Dropdown filter
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            filterSelect.appendChild(opt);
            
            // Dropdown modal
            const opt2 = opt.cloneNode(true);
            itemAreaSelect.appendChild(opt2);
            
            // Render hàng trong bảng areas
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.name}</strong></td>
                <td class="text-muted text-small">${a.description || '-'}</td>
                <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="openAreaModal(${a.id}, '${a.name}', '${a.description}')"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-outline btn-sm" onclick="deleteArea(${a.id})"><i class="fa-solid fa-trash text-danger"></i></button>
                </td>
            `;
            tbodyAreas.appendChild(tr);
        });
        
        // Khôi phục giá trị lọc nếu có
        if (currentFilterVal && areas.some(a => a.id == currentFilterVal)) {
            filterSelect.value = currentFilterVal;
            loadManagerChecklistItems(currentFilterVal);
        } else if (areas.length > 0) {
            filterSelect.value = areas[0].id;
            loadManagerChecklistItems(areas[0].id);
        } else {
            document.querySelector('#manager-items-table tbody').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chọn một khu vực ở bộ lọc trên để xem công việc.</td></tr>';
        }
        
        // Tải thêm cấu hình phân công chấm chéo
        await loadManagerCrossCheckRules();
        
    } catch (e) {
        tbodyAreas.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Lỗi tải khu vực.</td></tr>';
    }
}

// Quản lý khu vực API
function openAreaModal(id = '', name = '', description = '') {
    const modal = document.getElementById('area-modal');
    document.getElementById('area-modal-title').textContent = id ? 'Cập Nhật Khu Vực' : 'Thêm Khu Vực';
    document.getElementById('area-id').value = id;
    document.getElementById('area-name').value = name;
    document.getElementById('area-desc').value = description;
    modal.classList.add('active');
}

async function saveArea(e) {
    e.preventDefault();
    const id = document.getElementById('area-id').value;
    const name = document.getElementById('area-name').value.trim();
    const description = document.getElementById('area-desc').value.trim();
    
    try {
        const res = await fetch('/api/manager/areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id ? parseInt(id) : null,
                name,
                description
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }
        
        document.getElementById('area-modal').classList.remove('active');
        await loadManagerConfigData();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteArea(id) {
    if (!confirm('Xóa khu vực này sẽ xóa toàn bộ checklist tương ứng. Bạn chắc chắn?')) return;
    try {
        const res = await fetch('/api/manager/areas/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('Thất bại');
        await loadManagerConfigData();
    } catch (e) {
        alert(e.message);
    }
}

// ================= QUẢN LÝ: QUY TẮC CHẤM CHÉO (CROSS-CHECK RULES) =================
async function loadManagerCrossCheckRules() {
    const tbody = document.querySelector('#manager-rules-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Đang tải cấu hình chấm chéo...</td></tr>';
    
    try {
        const res = await fetch('/api/manager/cross_check_rules');
        const rules = await res.json();
        
        tbody.innerHTML = '';
        if (rules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chưa cấu hình phân công chấm chéo nào. Hệ thống tự động phân bổ ngẫu nhiên.</td></tr>';
            return;
        }
        
        rules.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${r.from_area_name}</strong></td>
                <td><i class="fa-solid fa-arrow-right-long text-primary" style="margin-right: 8px;"></i> <strong>${r.to_area_name}</strong></td>
                <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="openRuleModal(${r.from_area_id}, ${r.to_area_id})"><i class="fa-solid fa-edit"></i> Sửa</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteRule(${r.from_area_id})"><i class="fa-solid fa-trash text-danger"></i> Xóa</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Lỗi tải quy tắc chấm chéo: ' + e.message + '</td></tr>';
    }
}

async function openRuleModal(fromAreaId = '', toAreaId = '') {
    const modal = document.getElementById('rule-modal');
    document.getElementById('rule-modal-title').textContent = fromAreaId ? 'Cập Nhật Quy Tắc Chấm Chéo' : 'Cấu Hình Quy Tắc Chấm Chéo';
    
    const fromSelect = document.getElementById('rule-from-select');
    const toSelect = document.getElementById('rule-to-select');
    
    fromSelect.innerHTML = '<option value="">Chọn bộ phận đi chấm...</option>';
    toSelect.innerHTML = '<option value="">Chọn bộ phận được chấm...</option>';
    
    try {
        const res = await fetch('/api/manager/areas');
        const areas = await res.json();
        
        areas.forEach(a => {
            const opt1 = document.createElement('option');
            opt1.value = a.id;
            opt1.textContent = a.name;
            fromSelect.appendChild(opt1);
            
            const opt2 = opt1.cloneNode(true);
            toSelect.appendChild(opt2);
        });
        
        fromSelect.value = fromAreaId || '';
        toSelect.value = toAreaId || '';
        
        if (fromAreaId) {
            fromSelect.setAttribute('disabled', 'disabled');
        } else {
            fromSelect.removeAttribute('disabled');
        }
        
        modal.classList.add('active');
    } catch (e) {
        alert('Không thể tải danh sách bộ phận: ' + e.message);
    }
}

function closeRuleModal() {
    document.getElementById('rule-modal').classList.remove('active');
}

async function saveRule(e) {
    e.preventDefault();
    const fromSelect = document.getElementById('rule-from-select');
    const fromAreaId = fromSelect.value;
    const toAreaId = document.getElementById('rule-to-select').value;
    
    if (!fromAreaId || !toAreaId) {
        alert('Vui lòng chọn đầy đủ bộ phận đi chấm và bộ phận được chấm!');
        return;
    }
    
    try {
        const res = await fetch('/api/manager/cross_check_rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_area_id: parseInt(fromAreaId),
                to_area_id: parseInt(toAreaId)
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Lưu quy tắc thất bại');
        }
        
        closeRuleModal();
        await loadManagerCrossCheckRules();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteRule(fromAreaId) {
    if (!confirm('Bạn chắc chắn muốn xóa quy tắc chấm chéo của bộ phận này?')) return;
    
    try {
        const res = await fetch('/api/manager/cross_check_rules/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_area_id: fromAreaId })
        });
        
        if (!res.ok) throw new Error('Không xóa được quy tắc');
        await loadManagerCrossCheckRules();
    } catch (e) {
        alert(e.message);
    }
}

// Quản lý hạng mục checklist
async function loadManagerChecklistItems(areaId) {
    const tbody = document.querySelector('#manager-items-table tbody');
    if (!areaId) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chọn một khu vực ở bộ lọc trên để xem công việc.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Đang tải checklist...</td></tr>';
    
    try {
        const res = await fetch(`/api/manager/checklist_items?area_id=${areaId}`);
        const items = await res.json();
        
        tbody.innerHTML = '';
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Chưa cấu hình công việc nào cho khu vực này.</td></tr>';
            return;
        }
        
        items.forEach(item => {
            const tr = document.createElement('tr');
            
            const imgHtml = item.reference_image 
                ? `<img src="${item.reference_image}" class="ref-img-thumbnail" alt="Ref" onclick="window.open('${item.reference_image}')">`
                : `<span class="text-muted text-small"><i class="fa-solid fa-image-slash"></i> Chưa có</span>`;
                
            tr.innerHTML = `
                <td><strong>${item.task_name}</strong></td>
                <td>${imgHtml}</td>
                <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="openItemModal(${item.id}, ${item.area_id}, '${item.task_name}')"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-outline btn-sm" onclick="deleteChecklistItem(${item.id}, ${item.area_id})"><i class="fa-solid fa-trash text-danger"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function openItemModal(id = '', areaId = '', taskName = '') {
    const modal = document.getElementById('item-modal');
    document.getElementById('item-modal-title').textContent = id ? 'Sửa Hạng Mục Checklist' : 'Thêm Hạng Mục Checklist';
    document.getElementById('item-id').value = id;
    document.getElementById('item-task').value = taskName;
    document.getElementById('item-image').value = ''; // Reset file input
    
    const filterAreaId = document.getElementById('config-area-filter').value;
    document.getElementById('item-area-select').value = areaId || filterAreaId || '';
    
    modal.classList.add('active');
}

async function saveChecklistItem(e) {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const areaId = document.getElementById('item-area-select').value;
    const taskName = document.getElementById('item-task').value.trim();
    const imageFile = document.getElementById('item-image').files[0];
    
    const formData = new FormData();
    if (id) formData.append('id', id);
    formData.append('area_id', areaId);
    formData.append('task_name', taskName);
    if (imageFile) formData.append('image', imageFile);
    
    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    
    try {
        const res = await fetch('/api/manager/checklist_items', {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Thao tác thất bại');
        }
        
        document.getElementById('item-modal').classList.remove('active');
        
        // Reload checklist items for currently selected area filter
        const filterAreaId = document.getElementById('config-area-filter').value;
        if (filterAreaId == areaId) {
            await loadManagerChecklistItems(areaId);
        } else {
            document.getElementById('config-area-filter').value = areaId;
            await loadManagerChecklistItems(areaId);
        }
    } catch (e) {
        alert(e.message);
    } finally {
        saveBtn.disabled = false;
    }
}

async function deleteChecklistItem(id, areaId) {
    if (!confirm('Bạn có chắc muốn xóa hạng mục checklist này?')) return;
    try {
        const res = await fetch('/api/manager/checklist_items/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('Thất bại');
        await loadManagerChecklistItems(areaId);
    } catch (e) {
        alert(e.message);
    }
}

// ================= GEOLOCATION & WATERMARK HELPERS =================
function getGPSLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("Trình duyệt không hỗ trợ định vị GPS.");
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const gps = {
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6)
                };
                resolve(gps);
            },
            (error) => {
                console.warn("Lỗi GPS:", error);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}

function drawWatermark(ctx, width, height, gpsStr) {
    const now = new Date();
    const dateStr = now.getDate().toString().padStart(2, '0') + '/' + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                    now.getFullYear();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0') + ':' + 
                    now.getSeconds().toString().padStart(2, '0');
    
    const watermarkText = `THỜI GIAN: ${dateStr} ${timeStr}` + (gpsStr ? ` | GPS: ${gpsStr}` : '');
    
    // Vẽ thanh nền bán trong suốt ở đáy ảnh
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, height - 32, width, 32);
    
    // Vẽ text thời gian & toạ độ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(watermarkText, 12, height - 16);
}

function updateCameraAspectRatio(ratio) {
    const container = document.querySelector('.camera-preview-container');
    if (container) {
        container.style.aspectRatio = '3/4'; // Cố định cứng tỉ lệ đứng 3:4 cho điện thoại
    }
    state.activeAspectRatio = 3/4;
}

function openLightbox(src, caption = '') {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const captionText = document.getElementById('lightbox-caption');
    
    if (modal && img) {
        img.src = src;
        if (captionText) captionText.textContent = caption;
        modal.classList.add('active');
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}
