module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: '../native-modules/GPUMemoryModule/android',
        packageImportPath: 'import com.gpumemory.GPUMemoryPackage;',
      },
      ios: {
        podspecPath: '../native-modules/GPUMemoryModule/GPUMemoryModule.podspec',
      },
    },
  },
};
