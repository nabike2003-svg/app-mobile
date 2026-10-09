module.exports = ({config}) => {
 const role=process.env.EXPO_PUBLIC_APP_ROLE;
 const suffix={customer:'Khách hàng',driver:'Tài xế',admin:'Admin'}[role];
 return {...config,name:suffix?`Lâm Thao · ${suffix}`:config.name,
  slug:suffix?`lam-thao-${role}`:config.slug,
  ios:{...config.ios,bundleIdentifier:suffix?`com.lamthao.angi.${role}`:'com.lamthao.angi'},
  android:{...config.android,package:suffix?`com.lamthao.angi.${role}`:'com.lamthao.angi'}};
};
