import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApi} from '../server/api.mjs';
async function fixture(t,dbPath=':memory:'){
 const api=createApi({dbPath});await new Promise(resolve=>api.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+api.server.address().port;
 t.after(async()=>{await new Promise(resolve=>api.server.close(resolve));api.close();});
 const req=async(path,token,data)=>{const r=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 const signup=async(phone,role='customer')=>{const r=await req('/auth/register',null,{name:'Khách thử',phone,role,password:'Password-test-123'});assert.equal(r.status,201);return r.data;};
 return {api,req,signup};
}
const fields={name:'Người nhận',phone:'0912345678',address:'Lâm Thao',pickup:'Chợ',details:'Rau'};
test('đăng ký, đăng nhập, bảo vệ quyền admin và đăng xuất',async t=>{
 const {api,req,signup}=await fixture(t);const customer=await signup('0912345678');
 assert.equal((await req('/orders')).status,401);
 assert.equal((await req('/auth/register',null,{name:'X',phone:'0922345678',password:'Password-test-123',role:'admin'})).status,400);
 assert.equal((await req('/users',customer.token)).status,403);
 assert.equal((await req('/auth/login',null,{phone:'0912345678',password:'Wrong-1234'})).status,401);
 const login=await req('/auth/login',null,{phone:'0912345678',password:'Password-test-123'});assert.equal(login.status,200);
 const stored=api.db.prepare('SELECT password FROM users WHERE id=?').get(customer.user.id);assert.notEqual(stored.password,'Password-test-123');
 await req('/auth/logout',login.data.token,{});assert.equal((await req('/auth/me',login.data.token)).status,401);
});
test('khách đặt đơn, admin duyệt, một tài xế nhận và hoàn thành',async t=>{
 const {api,req,signup}=await fixture(t);const c=await signup('0912345678');const other=await signup('0922345678');const d=await signup('0932345678','driver');const d2=await signup('0942345678','driver');
 api.createAdmin({name:'Admin thử',phone:'0900000000',password:'Admin-test-123'});
 const a=(await req('/auth/login',null,{phone:'0900000000',password:'Admin-test-123'})).data;
 assert.equal((await req('/orders',d.token)).status,403);
 await req('/users/'+d.user.id+'/approve',a.token,{});await req('/users/'+d2.user.id+'/approve',a.token,{});
 const created=await req('/orders',c.token,{service:'food',fields,items:[{id:'com',quantity:2,price:1}],amount:1});assert.equal(created.status,201);assert.equal(created.data.order.amount,85000);const id=created.data.order.id;
 assert.equal((await req('/orders',other.token)).data.orders.length,0);
 assert.equal((await req('/orders/'+id+'/cancel',other.token,{})).status,403);
 const available=(await req('/orders',d.token)).data.orders[0];assert.equal(available.fields.phone,undefined);
 const claims=await Promise.all([req('/orders/'+id+'/claim',d.token,{}),req('/orders/'+id+'/claim',d2.token,{})]);assert.deepEqual(claims.map(r=>r.status).sort(),[200,409]);
 const winner=claims[0].status===200?d:d2;const loser=winner===d?d2:d;
 assert.equal((await req('/orders/'+id+'/advance',loser.token,{})).status,403);
 assert.equal((await req('/orders/'+id+'/cancel',c.token,{})).status,409);
 assert.equal((await req('/orders/'+id+'/advance',winner.token,{})).data.order.status,'picked_up');
 assert.equal((await req('/orders/'+id+'/advance',winner.token,{})).data.order.status,'delivered');
 assert.equal((await req('/orders/'+id+'/advance',winner.token,{})).status,409);
 assert.equal((await req('/orders',c.token)).data.orders[0].status,'delivered');
 assert.equal((await req('/users',a.token)).data.users.length,5);
});
test('kiểm tra giỏ, mua hộ, giao hàng và hủy trước khi nhận',async t=>{
 const {req,signup}=await fixture(t);const c=await signup('0912345678');
 assert.equal((await req('/orders',c.token,{service:'food',fields,items:[{id:'com',quantity:-1}]})).status,400);
 assert.equal((await req('/orders',c.token,{service:'food',fields,items:[{id:'com',quantity:1},{id:'pho',quantity:1}]})).status,400);
 for(const service of ['shopping','delivery']){const r=await req('/orders',c.token,{service,fields});assert.equal(r.status,201);assert.equal(r.data.order.amount,15000);assert.equal((await req('/orders/'+r.data.order.id+'/cancel',c.token,{})).data.order.status,'cancelled');}
});
test('tài khoản và đơn tồn tại sau khi mở lại cơ sở dữ liệu',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'lamthao-api-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'db.sqlite');
 let api=createApi({dbPath:path});api.createAdmin({name:'Admin',phone:'0900000000',password:'Admin-test-123'});const uid=api.db.prepare('SELECT id FROM users').get().id;api.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?)').run('persisted-order',uid,null,'delivery','Hộp thử',15000,JSON.stringify(fields),'pending',Date.now());api.close();api=createApi({dbPath:path});assert.equal(api.db.prepare('SELECT status FROM orders WHERE id=?').get('persisted-order').status,'pending');assert.equal(api.db.prepare('SELECT count(*) AS n FROM users').get().n,1);assert.equal(api.createAdmin({name:'Other',phone:'0900000001',password:'Other-test-123'}),false);api.close();
});
