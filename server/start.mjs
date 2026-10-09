import {createApi} from './api.mjs';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const api=createApi();
const password=randomBytes(12).toString('base64url');
if(api.createAdmin({name:'Quản trị Lâm Thao',phone:'0900000000',password})){
 writeFileSync('data/TAI-KHOAN-ADMIN.txt','Tài khoản admin chỉ dùng cho máy chủ này. Không gửi file này lên mạng.\nSố điện thoại: 0900000000\nMật khẩu: '+password+'\n',{mode:0o600});
}
api.server.listen(3001,'0.0.0.0',()=>console.log('Máy chủ Lâm Thao chạy ở cổng 3001. Tài khoản admin nằm trong data/TAI-KHOAN-ADMIN.txt. Không chia sẻ mật khẩu.'));
