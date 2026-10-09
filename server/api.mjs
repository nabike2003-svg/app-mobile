import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {menu,deliveryFee,validateOrder} from '../src/orders.mjs';
const publicUser=u=>({id:u.id,name:u.name,phone:u.phone,role:u.role,approved:!!u.approved});
const phone=s=>String(s||'').replace(/\s/g,'').replace(/^\+84/,'0');
function fail(status,message){throw Object.assign(new Error(message),{status});}
function hashPassword(password,salt=randomBytes(16).toString('hex')){return salt+':'+scryptSync(password,salt,64).toString('hex');}
function verify(password,hash){const [salt,expected]=hash.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex'));}
const digest=s=>createHash('sha256').update(s).digest('hex');
export function createApi({dbPath='data/lamthao.sqlite'}={}){
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,approved INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES users(id),driver_id TEXT REFERENCES users(id),service TEXT NOT NULL,summary TEXT NOT NULL,amount INTEGER NOT NULL,fields TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);
 `);
 const session=u=>{const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+7*86400000);return {token,user:publicUser(u)};};
 const orderView=o=>({...o,fields:JSON.parse(o.fields),customerName:db.prepare('SELECT name FROM users WHERE id=?').get(o.customer_id)?.name,driverName:o.driver_id?db.prepare('SELECT name FROM users WHERE id=?').get(o.driver_id)?.name:null});
 const limited=new Map();
 function throttle(req,path){const key=req.socket.remoteAddress+path;const now=Date.now();const entry=limited.get(key)||{start:now,count:0};if(now-entry.start>60000){entry.start=now;entry.count=0;}entry.count++;limited.set(key,entry);if(limited.size>5000)limited.clear();if(entry.count>30)fail(429,'Thử quá nhiều lần. Vui lòng đợi một phút.');}
 async function body(req){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>20000)fail(413,'Dữ liệu quá lớn.');}try{return JSON.parse(data||'{}');}catch{fail(400,'Dữ liệu không hợp lệ.');}}
 const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const send=(status,payload)=>{res.writeHead(status);res.end(JSON.stringify(payload));};
 try{
 const path=new URL(req.url,'http://local').pathname;const method=req.method;
 const origin=req.headers.origin;if(origin){try{if(new URL(origin).hostname===new URL('http://'+req.headers.host).hostname){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');}}catch{}}
 if(method==='OPTIONS')return send(204,{});
 if(path==='/health'&&method==='GET')return send(200,{ok:true});
 if(['/auth/register','/auth/login'].includes(path)&&method==='POST'){
 throttle(req,path);const data=await body(req);const p=phone(data.phone);const password=typeof data.password==='string'?data.password:'';
 if(!/^0\d{9}$/.test(p)||password.length<8||password.length>128)fail(400,'Nhập số điện thoại 10 chữ số và mật khẩu từ 8 đến 128 ký tự.');
 if(path==='/auth/register'){
 if(!['customer','driver'].includes(data.role))fail(400,'Chỉ được đăng ký khách hàng hoặc tài xế.');
 const name=typeof data.name==='string'?data.name.trim():'';if(!name||name.length>80)fail(400,'Tên cần từ 1 đến 80 ký tự.');
 if(db.prepare('SELECT id FROM users WHERE phone=?').get(p))fail(409,'Số điện thoại đã đăng ký.');
 const u={id:randomUUID(),name,phone:p,password:hashPassword(password),role:data.role,approved:data.role==='customer'?1:0};
 db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(u.id,u.name,u.phone,u.password,u.role,u.approved);return send(201,session(u));
 }
 const u=db.prepare('SELECT * FROM users WHERE phone=?').get(p);
 if(!u||!verify(password,u.password))fail(401,'Số điện thoại hoặc mật khẩu chưa đúng.');return send(200,session(u));
 }
 const token=req.headers.authorization?.replace(/^Bearer /,'');const u=token?db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now()):null;
 if(!u)fail(401,'Vui lòng đăng nhập lại.');
 if(path==='/auth/me'&&method==='GET')return send(200,{user:publicUser(u)});
 if(path==='/auth/logout'&&method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));return send(200,{ok:true});}
 if(path==='/users'&&method==='GET'){if(u.role!=='admin')fail(403,'Chỉ admin được quản lý tài khoản.');return send(200,{users:db.prepare('SELECT * FROM users ORDER BY rowid DESC').all().map(publicUser)});}
 const approval=path.match(/^\/users\/([^/]+)\/approve$/);
 if(approval&&method==='POST'){if(u.role!=='admin')fail(403,'Chỉ admin được duyệt tài xế.');const result=db.prepare("UPDATE users SET approved=1 WHERE id=? AND role='driver'").run(approval[1]);if(!result.changes)fail(404,'Không tìm thấy tài xế.');return send(200,{ok:true});}
 if(path==='/orders'&&method==='GET'){
 let rows;
 if(u.role==='admin')rows=db.prepare('SELECT * FROM orders ORDER BY created DESC').all();
 else if(u.role==='customer')rows=db.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY created DESC').all(u.id);
 else {if(!u.approved)fail(403,'Tài xế đang chờ admin duyệt.');rows=db.prepare("SELECT * FROM orders WHERE driver_id=? OR (status='pending' AND driver_id IS NULL) ORDER BY created DESC").all(u.id);}
 return send(200,{orders:rows.map(o=>{const result=orderView(o);if(u.role==='driver'&&o.driver_id!==u.id)result.fields={pickup:result.fields.pickup,address:result.fields.address,details:result.fields.details};return result;})});
 }
 if(path==='/orders'&&method==='POST'){
 if(u.role!=='customer')fail(403,'Chỉ khách hàng được đặt đơn.');const data=await body(req);if(!['food','shopping','delivery'].includes(data.service))fail(400,'Dịch vụ không hợp lệ.');
 const fields={};for(const key of ['name','phone','address','pickup','details']){fields[key]=typeof data.fields?.[key]==='string'?data.fields[key].trim():'';if(fields[key].length>500)fail(400,'Thông tin quá dài.');}
 const cart=[];if(data.service==='food'){
 if(!Array.isArray(data.items)||data.items.length>20)fail(400,'Giỏ không hợp lệ.');const seen=new Set();
 for(const i of data.items){const product=menu.find(m=>m.id===i.id);if(!product||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>50||seen.has(i.id))fail(400,'Món hoặc số lượng không hợp lệ.');seen.add(i.id);cart.push({...product,quantity:i.quantity});}
 if(new Set(cart.map(i=>i.shop)).size>1)fail(400,'Mỗi đơn chỉ thuộc một quán.');fields.pickup=cart[0]?.shop||'';
 }
 const error=validateOrder(data.service,fields,cart);if(error)fail(400,error);
 const summary=data.service==='food'?cart.map(i=>`${i.name} ×${i.quantity}`).join(', '):fields.details;
 const amount=deliveryFee+cart.reduce((sum,i)=>sum+i.price*i.quantity,0);const id=randomUUID();
 db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?)').run(id,u.id,null,data.service,summary,amount,JSON.stringify(fields),'pending',Date.now());return send(201,{order:orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(id))});
 }
 const action=path.match(/^\/orders\/([^/]+)\/(claim|advance|cancel)$/);
 if(action&&method==='POST'){
 const [,id,op]=action;const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id);if(!o)fail(404,'Không tìm thấy đơn.');
 if(op==='claim'){
 if(u.role!=='driver'||!u.approved)fail(403,'Chỉ tài xế đã duyệt được nhận đơn.');
 const result=db.prepare("UPDATE orders SET driver_id=?,status='accepted' WHERE id=? AND driver_id IS NULL AND status='pending'").run(u.id,id);if(!result.changes)fail(409,'Đơn đã được nhận hoặc hủy.');
 }else if(op==='advance'){
 if(u.role!=='driver'||o.driver_id!==u.id||!u.approved)fail(403,'Chỉ tài xế của đơn được cập nhật.');
 const next={accepted:'picked_up',picked_up:'delivered'}[o.status];if(!next)fail(409,'Không thể cập nhật trạng thái này.');
 const result=db.prepare('UPDATE orders SET status=? WHERE id=? AND status=?').run(next,id,o.status);if(!result.changes)fail(409,'Trạng thái đã thay đổi.');
 }else{
 if(u.role!=='admin'&&o.customer_id!==u.id)fail(403,'Không có quyền hủy đơn.');
 if(u.role!=='admin'&&o.status!=='pending')fail(409,'Chỉ hủy được đơn chưa nhận.');
 if(['delivered','cancelled'].includes(o.status))fail(409,'Đơn đã kết thúc.');
 const result=db.prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status=?").run(id,o.status);if(!result.changes)fail(409,'Trạng thái đã thay đổi.');
 }return send(200,{order:orderView(db.prepare('SELECT * FROM orders WHERE id=?').get(id))});
 }
 fail(404,'Không tìm thấy chức năng.');
 }catch(e){send(e.status||500,{error:e.status?e.message:'Máy chủ gặp lỗi. Vui lòng thử lại.'});}
 });
 return {server,db,createAdmin({name,phone:p,password}){if(db.prepare("SELECT id FROM users WHERE role='admin'").get())return false;db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(randomUUID(),name,phone(p),hashPassword(password),'admin',1);return true;},close(){db.close();}};
}
