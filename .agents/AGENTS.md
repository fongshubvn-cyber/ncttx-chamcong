# Rules

- Khi người dùng cần cập nhật hoặc đẩy code lên GitHub, luôn cung cấp một câu lệnh PowerShell một dòng (one-liner) duy nhất để tự động thực hiện toàn bộ chu trình `git add .`, `git commit` (kèm thời gian tự động) và `git push` sử dụng đường dẫn git của GitHub Desktop:
  `$git="C:\Users\Admin\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"; cd E:\Jobs\chamcong; & $git add .; & $git commit -m "Auto update: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"; & $git push origin main`
