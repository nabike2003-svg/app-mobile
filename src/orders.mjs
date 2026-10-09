export const deliveryFee = 15000;
export const menu = [
 {id:'com', shop:'Bếp Nhà Lâm Thao', name:'Cơm gà rang gừng', price:35000, icon:'🍱', category:'Cơm nhà'},
 {id:'pho', shop:'Bún Phở Góc Phố', name:'Phở bò tái', price:40000, icon:'🍜', category:'Bún phở'},
 {id:'tra', shop:'Trà Sữa Đồi Chè', name:'Trà sữa trân châu', price:28000, icon:'🧋', category:'Đồ uống'},
 {id:'nem', shop:'Ăn Vặt Tan Trường', name:'Nem chua rán', price:30000, icon:'🍟', category:'Ăn vặt'}
];
export function total(cart) { return cart.reduce((sum,item)=>sum+item.price*item.quantity,0); }
export function addItem(cart, product) {
 if(cart.length && cart[0].shop!==product.shop) throw new Error('Vui lòng hoàn tất hoặc xóa giỏ của quán hiện tại trước.');
 const existing=cart.find(item=>item.id===product.id);
 return existing?cart.map(item=>item.id===product.id?{...item,quantity:item.quantity+1}:item):[...cart,{...product,quantity:1}];
}
export function validateOrder(service, fields, cart) {
 if(!fields.name.trim() || !fields.address.trim()) return 'Vui lòng nhập tên và địa chỉ nhận.';
 if(!/^(?:\+84|0)\d{9}$/.test(fields.phone.replace(/\s/g,''))) return 'Số điện thoại cần có dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.';
 if(service==='food'&&!cart.length) return 'Bạn chưa chọn món.';
 if(service!=='food'&&!fields.details.trim()) return 'Vui lòng mô tả món hàng cần mua hoặc cần giao.';
 if(service!=='food'&&!fields.pickup.trim()) return 'Vui lòng nhập nơi mua hoặc địa chỉ lấy hàng.';
 return '';
}
