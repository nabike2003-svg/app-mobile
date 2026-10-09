# Lâm Thao Ăn Gì?

Bản mẫu ứng dụng Android/iPhone bằng Expo và React Native, với đặt đồ ăn, mua hộ và giao hàng tại Lâm Thao. Quán và giá là dữ liệu minh họa.

## Phát triển

Dùng Node.js 22 hoặc 24.

```sh
npm ci --cache /tmp/lamthao-npm
npm start
```

Mở bằng phiên bản Expo Go tương thích Expo SDK 57 trên điện thoại và quét QR trong mạng truy cập được máy phát triển. Nếu Expo Go không tương thích, cần development build. Môi trường cloud không bảo đảm điện thoại truy cập được Metro; không có tunnel được thiết lập. Build iOS cần macOS/Xcode hoặc dịch vụ build riêng. Chưa tạo APK/IPA và chưa kiểm tra trên thiết bị thật.

```sh
npm run web
npm run check
npm test
EXPO_OFFLINE=1 npx expo export --platform all
```

Khi máy cloud không truy cập được API Expo, dùng `EXPO_OFFLINE=1 npm start` để dùng dữ liệu SDK đã cài. Export all xác minh bundle Android/iOS/web, không tạo binary native.

## Đã có

- Chọn đồ ăn, mua hộ hoặc giao hàng.
- Tìm món/quán, lọc danh mục, tăng giảm số lượng; mỗi giỏ thuộc một quán.
- Biểu mẫu người nhận, địa chỉ, điện thoại; mua hộ và giao hàng có địa chỉ lấy/mua và mô tả hàng.
- Kiểm tra trường bắt buộc và tạo đơn mô phỏng; xem danh sách đơn thử.

Giỏ, thông tin người nhận và đơn chỉ lưu trong bộ nhớ; đóng hoặc tải lại ứng dụng sẽ mất. Dùng thông tin giả để thử. Không có thanh toán, kết nối quán/tài xế hay gửi đơn thật. Phí giao 15.000 đ là minh họa; yêu cầu mua hộ chưa bao gồm tiền hàng.

Để triển khai thật cần backend, đăng nhập, dữ liệu quán/món, app hoặc cổng quản lý quán và tài xế, xác nhận giá mua hộ, tính phí giao, trạng thái đơn, bản đồ và thanh toán.
