// Native provider credentials are read only during configuration/build.
// Configure both values in .env or the EAS build environment.
module.exports = ({ config }) => {
  const rvApiKey = process.env.HISTORYLENS_RV_API_KEY;
  const rvProjectId = process.env.HISTORYLENS_RV_PROJECT_ID;
  const enabled = Boolean(rvApiKey && rvProjectId);
  return {
    ...config,
    plugins: config.plugins.map(plugin => Array.isArray(plugin) && plugin[0] === '@reactvision/react-viro'
      ? [plugin[0], { ...plugin[1], provider: enabled ? 'reactvision' : 'none', ...(enabled ? { rvApiKey, rvProjectId } : {}) }]
      : plugin),
    extra: { ...config.extra, surfaceAnchorProvider: enabled ? 'reactvision' : 'none' },
  };
};
