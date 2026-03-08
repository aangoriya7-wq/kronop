CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -g
INCLUDES = -I.
LIBS = -lvulkan
TARGET = kronop_color_artist
SOURCES = main.cpp Color_Core.cpp

SHADER_SRC = color_grade.comp
SHADER_SPV = color_grade.comp.spv

all: shader $(TARGET)

shader:
	@echo "Compiling Vulkan color grading shader..."
	glslc $(SHADER_SRC) -o $(SHADER_SPV)
	@if [ -f $(SHADER_SPV) ]; then \
		echo "✓ Color shader compiled successfully: $(SHADER_SPV)"; \
	else \
		echo "✗ Color shader compilation failed!"; \
		exit 1; \
	fi

$(TARGET): $(SOURCES)
	@echo "Compiling Kronop Color Artist..."
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(TARGET) $(SOURCES) $(LIBS)
	@if [ -f $(TARGET) ]; then \
		echo "✓ Color Artist build successful: $(TARGET)"; \
	else \
		echo "✗ Color Artist build failed!"; \
		exit 1; \
	fi

clean:
	@echo "Cleaning up..."
	rm -f $(TARGET) *.raw $(SHADER_SPV)
	@echo "✓ Clean complete"

install-deps:
	@echo "Installing dependencies..."
	sudo apt update
	sudo apt install -y libvulkan-dev vulkan-tools build-essential glslc
	@echo "✓ Dependencies installed"

test: $(TARGET)
	@echo "Running Kronop Color Artist test..."
	@if [ ! -f $(SHADER_SPV) ]; then \
		echo "Color shader not found, compiling..."; \
		$(MAKE) shader; \
	fi
	./$(TARGET)
	@echo "✓ Color Artist test completed"

benchmark: $(TARGET)
	@echo "Running color grading performance benchmark..."
	@if [ ! -f $(SHADER_SPV) ]; then \
		$(MAKE) shader; \
	fi
	@echo "Testing 4K color grading performance..."
	time ./$(TARGET)

debug: CXXFLAGS += -DDEBUG -O0
debug: $(TARGET)
	@echo "Debug build created"

validate-shader:
	@echo "Validating color shader..."
	@if [ -f $(SHADER_SPV) ]; then \
		spirv-val $(SHADER_SPV); \
		echo "✓ Color shader validation passed"; \
	else \
		echo "✗ Color shader not found. Run 'make shader' first."; \
	fi

lines:
	@echo "Lines of code analysis:"
	@echo "======================"
	@wc -l *.cpp *.hpp *.comp *.h 2>/dev/null || echo "Some files not found"
	@echo "Total lines: $$(cat *.cpp *.hpp *.comp *.h 2>/dev/null | wc -l)"

help:
	@echo "Available targets:"
	@echo "  all          - Build everything (default)"
	@echo "  shader       - Compile Vulkan color shader only"
	@echo "  $(TARGET)    - Build main executable only"
	@echo "  clean        - Remove build artifacts"
	@echo "  install-deps - Install system dependencies"
	@echo "  test         - Run color grading test"
	@echo "  benchmark    - Run performance benchmark"
	@echo "  debug        - Create debug build"
	@echo "  validate-shader - Validate SPIR-V shader"
	@echo "  lines        - Count lines of code"
	@echo "  help         - Show this help"

.PHONY: all shader clean install-deps test benchmark debug validate-shader lines help
