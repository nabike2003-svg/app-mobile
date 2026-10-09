import test from 'node:test';
import assert from 'node:assert/strict';
import {menu,addItem,total,validateOrder} from '../src/orders.mjs';
const fields={name:'Khách thử',phone:'0912345678',address:'Lâm Thao',details:'Một túi rau',pickup:'Chợ'};
test('giỏ cộng số lượng và tính đúng tiền',()=>{const cart=addItem(addItem([],menu[0]),menu[0]);assert.equal(cart[0].quantity,2);assert.equal(total(cart),70000);});
test('không gộp hai quán vào một đơn',()=>assert.throws(()=>addItem(addItem([],menu[0]),menu[1])));
test('đơn đồ ăn cần món và số điện thoại hợp lệ',()=>{assert.ok(validateOrder('food',fields,[]));assert.ok(validateOrder('food',{...fields,phone:'123'},addItem([],menu[0])));assert.equal(validateOrder('food',fields,addItem([],menu[0])),'');});
test('mua hộ và giao hàng cần mô tả và nơi lấy',()=>{for(const service of ['shopping','delivery']){assert.ok(validateOrder(service,{...fields,pickup:''},[]));assert.ok(validateOrder(service,{...fields,details:''},[]));assert.equal(validateOrder(service,fields,[]),'');}});
