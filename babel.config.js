module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      '@babel/plugin-syntax-import-meta',
      'react-native-reanimated/plugin',
      'transform-remove-console',
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};

