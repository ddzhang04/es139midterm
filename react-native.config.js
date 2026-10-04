// UI-only simulator builds omit the hardware AR engine. Device builds retain it.
module.exports = {
  dependencies:
    process.env.HISTORYLENS_UI_PREVIEW === '1'
      ? { '@reactvision/react-viro': { platforms: { ios: null, android: null } } }
      : {},
};
