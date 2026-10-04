module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already adds the react-native-worklets plugin Reanimated needs.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
