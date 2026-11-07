export default ({config}) => {
  const healthkit = process.env.BREAKWIND_HEALTHKIT === '1';
  return {
    ...config,
    extra:{...config.extra,healthkit},
    plugins:healthkit ? [...config.plugins,['@kingstinct/react-native-healthkit',{
      NSHealthShareUsageDescription:'只有在你点选导入时，破风才读取「健康」里的跑步运动摘要，供你核对并保存在本机。',
      NSHealthUpdateUsageDescription:false,
      background:false
    }]] : config.plugins
  };
};
