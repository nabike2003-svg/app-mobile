# Lâm Thao Ăn Gì?

Ứng dụng Expo/React Native cho khách hàng, tài xế và admin; backend Node.js + SQLite chạy trên Windows trong cùng mạng Wi-Fi. Bản thử có tài khoản và đơn lưu trên máy chủ, quán/giá/phí là dữ liệu minh họa, chưa có thanh toán hay tích hợp quán thật.

## Chạy trên Windows

Cài Node.js LTS (>=22.13). Giải nén ZIP và mở `MO-UNG-DUNG.cmd`, rồi quét QR bằng Expo Go tương thích SDK 57 trên iPhone cùng Wi-Fi. Cho phép Node.js qua tường lửa trên mạng riêng. Chỉ chạy một cửa sổ tại một thời điểm. Có thể dùng `MO-KHACH-HANG.cmd`, `MO-TAI-XE.cmd`, `MO-ADMIN.cmd` để chọn trước khu vực đăng nhập. Xem `HUONG-DAN.txt` để thử luồng ba vai trò.

## Phát triển

```sh
npm ci --cache /tmp/lamthao-npm
npm run dev
```

Máy chủ API cổng 3001; Expo tự chọn cổng Metro. App suy ra địa chỉ API từ máy Metro; có thể đặt `EXPO_PUBLIC_API_URL` hoặc sửa kết nối ở màn hình đăng nhập. Trong cloud bị chặn Expo API, dùng `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run dev`. Máy chủ và Metro phải restart ở task mới. Việc điện thoại truy cập cloud Metro chưa được hỗ trợ.

```sh
npm run check
npm test
EXPO_OFFLINE=1 npx expo export --platform all
```

SQLite nằm trong `data/lamthao.sqlite` (ignored). Lần đầu tạo admin với mật khẩu ngẫu nhiên trong `data/TAI-KHOAN-ADMIN.txt` (ignored); không in mật khẩu ra console. Không đưa thư mục data lên GitHub. Giữ data để dùng lại tài khoản và đơn. Session token nằm trong bộ nhớ app; mở lại cần đăng nhập. Mật khẩu lưu bằng scrypt + salt, session token lưu hash và có hạn 7 ngày; đăng xuất thu hồi session trên server. Không có tài khoản admin đăng ký công khai.

## Phân quyền

- Khách hàng đăng ký, đăng nhập, đặt đồ ăn/mua hộ/giao hàng, xem đơn của mình và hủy trước khi được nhận.
- Tài xế đăng ký, chờ admin duyệt, xem đơn mới, nhận đơn, xác nhận lấy và giao hàng; không truy cập tài khoản quản trị hoặc đơn của tài xế khác.
- Admin xem đơn và tài khoản, duyệt tài xế, hủy đơn chưa kết thúc.

Server tự tính tiền món từ danh mục và kiểm tra giỏ một quán. Nhận đơn là cập nhật có điều kiện để tránh hai tài xế nhận cùng đơn. Số điện thoại người nhận chỉ hiện cho tài xế sau khi nhận.

Cùng codebase có ba cấu hình tên/bundle qua `EXPO_PUBLIC_APP_ROLE=customer|driver|admin` trong `app.config.js`. Hiện dùng chung app Expo Go với ba khu vực; chưa có ba bản cài độc lập trên App Store, APK/IPA, hoặc thử trên thiết bị trong cloud. Các cấu hình riêng vẫn dùng phân quyền server, không cấp quyền dựa vào lựa chọn giao diện.

## Giới hạn

Bản local trên mạng riêng dùng HTTP, chưa phù hợp mở Internet. Trước vận hành thật cần HTTPS/hosting, xác thực số điện thoại/OTP, phục hồi mật khẩu, duyệt hồ sơ tài xế, quản lý quán/món, bản đồ, thông báo, thanh toán, đồng bộ/backup và kiểm thử thiết bị. Tiền hàng mua hộ chưa được xác nhận riêng. Không có phiên đăng nhập lưu bền vững trên thiết bị; không có quên mật khẩu. Không dùng dữ liệu nhạy cảm trong bản thử.
