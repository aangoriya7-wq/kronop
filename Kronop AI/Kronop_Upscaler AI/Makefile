CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -g -DDEBUG
INCLUDES = -I.
LIBS = -lvulkan
TARGET = kronop_upscaler
PRODUCTION_TARGET = kronop_upscaler_prod
SOURCES = main.cpp Upscale_Core.cpp Upscale_Core_Extended.cpp
PRODUCTION_SOURCES = main_production.cpp Upscale_Core.cpp Upscale_Core_Extended.cpp
NEW_HEADERS = Weights_Manager.hpp Image_IO.hpp Vulkan_Validator.hpp

SHADER_SRC = upscale.comp
SHADER_SPV = upscale.comp.spv

all: shader $(TARGET)

production: shader $(PRODUCTION_TARGET)

$(TARGET): $(SOURCES)
	@echo "Compiling Kronop AI Upscaler..."
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(TARGET) $(SOURCES) $(LIBS)
	@if [ -f $(TARGET) ]; then \
		echo "✓ Build successful: $(TARGET)"; \
	else \
		echo "✗ Build failed!"; \
		exit 1; \
	fi

$(PRODUCTION_TARGET): $(PRODUCTION_SOURCES)
	@echo "Compiling Kronop AI Production Upscaler..."
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(PRODUCTION_TARGET) $(PRODUCTION_SOURCES) $(LIBS)
	@if [ -f $(PRODUCTION_TARGET) ]; then \
		echo "✓ Production build successful: $(PRODUCTION_TARGET)"; \
	else \
		echo "✗ Production build failed!"; \
		exit 1; \
	fi

clean:
	@echo "Cleaning up..."
	rm -f $(TARGET) $(PRODUCTION_TARGET) *.raw $(SHADER_SPV) *.jpg *.png *.bin
	@echo "✓ Clean complete"

install-deps:
	@echo "Installing dependencies..."
	sudo apt update
	sudo apt install -y libvulkan-dev vulkan-tools build-essential glslc
	@echo "✓ Dependencies installed"

# Download stb_image libraries
download-libs:
	@echo "Downloading stb_image libraries..."
	@if [ ! -f stb_image.h ]; then \
		curl -o stb_image.h https://raw.githubusercontent.com/nothings/stb/master/stb_image.h; \
		echo "✓ stb_image.h downloaded"; \
	fi
	@if [ ! -f stb_image_write.h ]; then \
		curl -o stb_image_write.h https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h; \
		echo "✓ stb_image_write.h downloaded"; \
	fi

# Full setup including dependencies and libraries
setup: install-deps download-libs
	@echo "✓ Complete setup finished"

test: $(TARGET)
	@echo "Running Kronop AI Upscaler test..."
	@if [ ! -f $(SHADER_SPV) ]; then \
		echo "Shader not found, compiling..."; \
		$(MAKE) shader; \
	fi
	./$(TARGET)
	@echo "✓ Test completed"

benchmark: $(TARGET)
	@echo "Running performance benchmark..."
	@if [ ! -f $(SHADER_SPV) ]; then \
		$(MAKE) shader; \
	fi
	@echo "Testing 1080p upscaling performance..."
	time ./$(TARGET)

debug: CXXFLAGS += -DDEBUG -O0
debug: $(TARGET)
	@echo "Debug build created"

validate-shader:
	@echo "Validating shader..."
	@if [ -f $(SHADER_SPV) ]; then \
		spirv-val $(SHADER_SPV); \
		echo "✓ Shader validation passed"; \
	else \
		echo "✗ Shader not found. Run 'make shader' first."; \
	fi

lines:
	@echo "Lines of code analysis:"
	@echo "======================"
	@wc -l *.cpp *.hpp *.comp *.h 2>/dev/null || echo "Some files not found"
	@echo "Total lines: $$(cat *.cpp *.hpp *.comp *.h 2>/dev/null | wc -l)"

help:
	@echo "Available targets:"
	@echo "  all          - Build everything (default)"
	@echo "  shader       - Compile Vulkan shader only"
	@echo "  $(TARGET)    - Build main executable only"
	@echo "  clean        - Remove build artifacts"
	@echo "  install-deps - Install system dependencies"
	@echo "  download-libs - Download stb_image libraries"
	@echo "  setup        - Full setup (deps + libs)"
	@echo "  test         - Run the upscaler test"
	@echo "  test-image   - Test with real image file"
	@echo "  benchmark    - Run performance benchmark"
	@echo "  debug        - Create debug build"
	@echo "  validate-shader - Validate SPIR-V shader"
	@echo "  lines        - Count lines of code"
	@echo "  help         - Show this help"

# Test with real image
test-image: $(TARGET)
	@echo "Testing with real image..."
	@if [ ! -f $(SHADER_SPV) ]; then \
		$(MAKE) shader; \
	fi
	@if [ ! -f test_input.jpg ]; then \
		echo "Creating test image..."; \
		$(MAKE) create-test-image; \
	fi
	./$(TARGET) test_input.jpg test_output.jpg
	@echo "✓ Image test completed"

# Create test image
create-test-image:
	@echo "Generating test image..."
	@if [ ! -f stb_image_write.h ]; then \
		$(MAKE) download-libs; \
	fi
	@echo "Creating test image generator..."
	@echo "#include \"Image_IO.hpp\"" > create_test_image.cpp
	@echo "#include <iostream>" >> create_test_image.cpp
	@echo "int main() {" >> create_test_image.cpp
	@echo "    ImageIO io;" >> create_test_image.cpp
	@echo "    auto imageData = io.createGradientImage(256, 256);" >> create_test_image.cpp
	@echo "    io.saveImage(\"test_input.jpg\", imageData, 256, 256);" >> create_test_image.cpp
	@echo "    std::cout << \"Test image created: test_input.jpg\" << std::endl;" >> create_test_image.cpp
	@echo "    return 0;" >> create_test_image.cpp
	@echo "}" >> create_test_image.cpp
	$(CXX) $(CXXFLAGS) -o create_test_image create_test_image.cpp
	./create_test_image
	rm -f create_test_image create_test_image.cpp

.PHONY: all shader clean install-deps download-libs setup test test-image create-test-image benchmark debug validate-shader lines help
