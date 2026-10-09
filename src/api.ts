import Constants from 'expo-constants';
export type Role='customer'|'driver'|'admin';
export type User={id:string;name:string;phone:string;role:Role;approved:boolean};
export type Session={token:string;user:User};
export type SavedOrder={id:string;service:string;summary:string;amount:number;status:string;customer_id:string;driver_id:string|null;customerName:string;driverName:string|null;fields:{name?:string;phone?:string;address:string;pickup:string;details:string};created:number};
export const roleName={customer:'Khách hàng',driver:'Tài xế',admin:'Admin'};
export const statusName:Record<string,string>={pending:'Chờ tài xế',accepted:'Đã nhận đơn',picked_up:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy'};
export function defaultServer(){const uri=Constants.expoConfig?.hostUri;const host=uri?.split(':')[0];return process.env.EXPO_PUBLIC_API_URL||(host?`http://${host}:3001`:'http://localhost:3001');}
export async function request<T>(base:string,path:string,token?:string,data?:unknown):Promise<T>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(base.replace(/\/$/,'')+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error||'Yêu cầu chưa thành công.');return result;}
 catch(e){if(e instanceof TypeError||(e as Error).name==='AbortError')throw new Error('Không kết nối được máy chủ. Kiểm tra cửa sổ Windows, Wi-Fi và quyền mạng của Node.js.');throw e;}finally{clearTimeout(timer);}
}
