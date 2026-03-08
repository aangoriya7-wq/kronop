#include "Media_Processor.hpp"
#include <iostream>
#include <vector>

int main(int argc, char* argv[]) {
    try {
        MediaProcessor processor;
        
        if (argc == 1) {
            // Demo mode - show capabilities and create demo files
            processor.showSupportedFormats();
            processor.createDemoFiles();
            
            std::cout << "\n🎉 KRONOP AI MEDIA PROCESSOR DEMO COMPLETE!" << std::endl;
            std::cout << "=========================================" << std::endl;
            std::cout << "Check the enhanced demo files!" << std::endl;
            
        } else if (argc == 3) {
            // Single file processing
            std::string input = argv[1];
            std::string output = argv[2];
            
            if (!processor.processMedia(input, output)) {
                return 1;
            }
            
        } else if (argc >= 4) {
            // Batch processing mode
            std::string outputDir = argv[argc - 1];
            std::vector<std::string> inputFiles;
            
            for (int i = 1; i < argc - 1; ++i) {
                inputFiles.push_back(argv[i]);
            }
            
            if (!processor.processBatch(inputFiles, outputDir)) {
                return 1;
            }
            
        } else {
            // Show usage
            std::cout << "🎬 KRONOP AI MEDIA PROCESSOR V2" << std::endl;
            std::cout << "===============================" << std::endl;
            std::cout << "Automatically detects and processes photos and videos!" << std::endl;
            std::cout << std::endl;
            std::cout << "USAGE:" << std::endl;
            std::cout << "  " << argv[0] << "                           - Run demo and show supported formats" << std::endl;
            std::cout << "  " << argv[0] << " <input> <output>           - Process single media file" << std::endl;
            std::cout << "  " << argv[0] << " <file1> <file2> ... <dir> - Batch process multiple files" << std::endl;
            std::cout << std::endl;
            std::cout << "EXAMPLES:" << std::endl;
            std::cout << "  " << argv[0] << " photo.jpg enhanced_photo.jpg" << std::endl;
            std::cout << "  " << argv[0] << " video.mp4 enhanced_video.mp4" << std::endl;
            std::cout << "  " << argv[0] << " img1.jpg img2.jpg img3.jpg ./enhanced/" << std::endl;
            std::cout << std::endl;
            std::cout << "SUPPORTED FORMATS:" << std::endl;
            processor.showSupportedFormats();
            return 1;
        }
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
