/**
 * run_tests.cpp
 * Test Runner for Kronop Cleaner AI
 * Entry point for executing all tests and generating reports
 */

#include "test_framework.hpp"
#include <iostream>
#include <string>
#include <vector>

using namespace kronop;

int main(int argc, char* argv[]) {
    std::cout << "========================================" << std::endl;
    std::cout << "  Kronop Cleaner AI Test Suite" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // Parse command line arguments
    bool verbose = false;
    bool runBenchmarks = true;
    bool runUnitTests = true;
    bool runIntegrationTests = true;
    std::string reportFormat = "console";
    
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--verbose" || arg == "-v") {
            verbose = true;
        } else if (arg == "--no-benchmarks") {
            runBenchmarks = false;
        } else if (arg == "--no-integration") {
            runIntegrationTests = false;
        } else if (arg == "--unit-tests-only") {
            runBenchmarks = false;
            runIntegrationTests = false;
        } else if (arg == "--report-html") {
            reportFormat = "html";
        } else if (arg == "--report-json") {
            reportFormat = "json";
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "Usage: " << argv[0] << " [options]" << std::endl;
            std::cout << "Options:" << std::endl;
            std::cout << "  --verbose, -v           Enable verbose output" << std::endl;
            std::cout << "  --no-benchmarks        Skip performance benchmarks" << std::endl;
            std::cout << "  --no-integration       Skip integration tests" << std::endl;
            std::cout << "  --unit-tests-only      Run only unit tests" << std::endl;
            std::cout << "  --report-html          Generate HTML report" << std::endl;
            std::cout << "  --report-json          Generate JSON report" << std::endl;
            std::cout << "  --help, -h             Show this help message" << std::endl;
            return 0;
        }
    }
    
    // Create test framework
    TestFramework framework;
    framework.setVerbose(verbose);
    
    std::cout << "\nConfiguration:" << std::endl;
    std::cout << "  Verbose: " << (verbose ? "Yes" : "No") << std::endl;
    std::cout << "  Benchmarks: " << (runBenchmarks ? "Yes" : "No") << std::endl;
    std::cout << "  Integration Tests: " << (runIntegrationTests ? "Yes" : "No") << std::endl;
    std::cout << "  Report Format: " << reportFormat << std::endl;
    
    // Run tests
    bool success = true;
    
    if (runUnitTests) {
        success &= framework.runChunkManagerTests();
        success &= framework.runVideoStreamerTests();
        success &= framework.runVulkanComputeTests();
        success &= framework.runSecurityShieldTests();
        success &= framework.runDeblurCoreTests();
    }
    
    if (runBenchmarks) {
        success &= framework.runPerformanceBenchmarks();
    }
    
    if (runIntegrationTests) {
        success &= framework.runIntegrationTests();
    }
    
    // Generate report
    TestReportGenerator reporter(&framework);
    
    if (reportFormat == "html") {
        std::cout << "\nGenerating HTML report..." << std::endl;
        reporter.generateHTMLReport("test_report.html");
        std::cout << "Report saved to: test_report.html" << std::endl;
    } else if (reportFormat == "json") {
        std::cout << "\nGenerating JSON report..." << std::endl;
        reporter.generateJSONReport("test_report.json");
        std::cout << "Report saved to: test_report.json" << std::endl;
    } else {
        reporter.printSummaryReport();
        if (verbose) {
            reporter.printDetailedReport();
        }
    }
    
    // Final result
    std::cout << "\n========================================" << std::endl;
    if (success) {
        std::cout << "✅ ALL TESTS PASSED!" << std::endl;
        std::cout << "Kronop Cleaner AI is ready for deployment." << std::endl;
    } else {
        std::cout << "❌ SOME TESTS FAILED!" << std::endl;
        std::cout << "Please review the test results before deployment." << std::endl;
    }
    std::cout << "========================================" << std::endl;
    
    return success ? 0 : 1;
}
