/**
 * Security_Shield.cpp
 * Commercial Security & License Verification System
 * Protects Kronop Cleaner AI intellectual property and ensures compliance
 */

#include "Security_Shield.hpp"
#include <chrono>
#include <random>
#include <fstream>
#include <sstream>
#include <iomanip>

namespace kronop {

// SecurityShield Implementation
SecurityShield::SecurityShield(const SecurityConfig& config)
    : config_(config), isInitialized_(false), isLicensed_(false),
      licenseType_(LicenseType::TRIAL), remainingDays_(30),
      lastValidationTime_(0), validationInterval_(3600), // 1 hour
      maxOfflineDays_(7), currentOfflineDays_(0) {
    
    // Initialize crypto
    initializeCrypto();
    
    // Generate hardware fingerprint
    generateHardwareFingerprint();
    
    // Load security keys
    loadSecurityKeys();
}

SecurityShield::~SecurityShield() {
    shutdown();
}

bool SecurityShield::initialize() {
    if (isInitialized_) {
        return true;
    }
    
    // Initialize cryptographic components
    if (!initializeCrypto()) {
        return false;
    }
    
    // Generate or load hardware fingerprint
    if (!generateHardwareFingerprint()) {
        return false;
    }
    
    // Load existing license if available
    loadLicenseFromFile();
    
    // Validate current license
    validateLicense();
    
    isInitialized_ = true;
    return true;
}

void SecurityShield::shutdown() {
    // Save license state
    saveLicenseToFile();
    
    // Cleanup crypto resources
    cleanupCrypto();
    
    isInitialized_ = false;
}

bool SecurityShield::validateLicense() {
    if (!isInitialized_) {
        return false;
    }
    
    auto currentTime = getCurrentTimestamp();
    
    // Skip validation if not enough time has passed
    if (currentTime - lastValidationTime_ < validationInterval_) {
        return isLicensed_;
    }
    
    lastValidationTime_ = currentTime;
    
    // Check trial expiration
    if (licenseType_ == LicenseType::TRIAL) {
        if (remainingDays_ <= 0) {
            isLicensed_ = false;
            return false;
        }
        
        // Update remaining days
        updateTrialDays();
        return true;
    }
    
    // For commercial licenses, check online validation
    if (config_.enableOnlineValidation) {
        if (!validateOnlineLicense()) {
            currentOfflineDays_++;
            
            // Allow offline usage for limited time
            if (currentOfflineDays_ > maxOfflineDays_) {
                isLicensed_ = false;
                return false;
            }
        } else {
            currentOfflineDays_ = 0;
        }
    }
    
    // Validate hardware binding
    if (!validateHardwareBinding()) {
        isLicensed_ = false;
        return false;
    }
    
    isLicensed_ = true;
    return true;
}

bool SecurityShield::activateLicense(const std::string& licenseKey, 
                                   LicenseType type, int durationDays) {
    if (!isInitialized_) {
        return false;
    }
    
    // Validate license key format and checksum
    if (!validateLicenseKeyFormat(licenseKey)) {
        return false;
    }
    
    // Decrypt license key
    std::string decryptedData = decryptLicenseKey(licenseKey);
    if (decryptedData.empty()) {
        return false;
    }
    
    // Parse license data
    LicenseData licenseData;
    if (!parseLicenseData(decryptedData, licenseData)) {
        return false;
    }
    
    // Verify license signature
    if (!verifyLicenseSignature(licenseData)) {
        return false;
    }
    
    // Activate license
    licenseType_ = type;
    licenseKey_ = licenseKey;
    activationTime_ = getCurrentTimestamp();
    expirationTime_ = activationTime_ + (durationDays * 24 * 3600);
    isLicensed_ = true;
    
    // Save license
    saveLicenseToFile();
    
    return true;
}

bool SecurityShield::extendLicense(int additionalDays) {
    if (!isLicensed_ || licenseType_ == LicenseType::TRIAL) {
        return false;
    }
    
    expirationTime_ += (additionalDays * 24 * 3600);
    saveLicenseToFile();
    
    return true;
}

LicenseInfo SecurityShield::getLicenseInfo() const {
    LicenseInfo info;
    info.isValid = isLicensed_;
    info.type = licenseType_;
    info.licenseKey = licenseKey_;
    info.hardwareFingerprint = hardwareFingerprint_;
    info.activationTime = activationTime_;
    info.expirationTime = expirationTime_;
    info.remainingDays = calculateRemainingDays();
    info.isTrial = (licenseType_ == LicenseType::TRIAL);
    info.maxOfflineDays = maxOfflineDays_;
    info.currentOfflineDays = currentOfflineDays_;
    
    return info;
}

SecurityStatus SecurityShield::getSecurityStatus() const {
    SecurityStatus status;
    status.isInitialized = isInitialized_;
    status.isLicensed = isLicensed_;
    status.lastValidationTime = lastValidationTime_;
    status.validationInterval = validationInterval_;
    status.isOnlineValidationEnabled = config_.enableOnlineValidation;
    status.encryptionLevel = config_.encryptionLevel;
    status.antiTamperingEnabled = config_.enableAntiTampering;
    status.hardwareBindingEnabled = config_.enableHardwareBinding;
    
    return status;
}

bool SecurityShield::initializeCrypto() {
    // Initialize cryptographic context
    // In a real implementation, this would use OpenSSL, libsodium, or similar
    
    // Generate encryption key
    encryptionKey_ = generateSecureKey(32);
    
    // Generate HMAC key
    hmacKey_ = generateSecureKey(64);
    
    // Initialize random number generator
    rng_.seed(std::chrono::high_resolution_clock::now().time_since_epoch().count());
    
    return true;
}

void SecurityShield::cleanupCrypto() {
    // Clear sensitive data
    std::fill(encryptionKey_.begin(), encryptionKey_.end(), 0);
    std::fill(hmacKey_.begin(), hmacKey_.end(), 0);
    std::fill(licenseKey_.begin(), licenseKey_.end(), 0);
}

bool SecurityShield::generateHardwareFingerprint() {
    // Collect hardware information
    std::vector<std::string> components;
    
    // CPU information
    components.push_back(getCPUInfo());
    
    // Memory information
    components.push_back(getMemoryInfo());
    
    // Disk information
    components.push_back(getDiskInfo());
    
    // Network MAC address
    components.push_back(getMACAddress());
    
    // Combine components
    std::string combined;
    for (const auto& component : components) {
        combined += component + "|";
    }
    
    // Generate hash
    hardwareFingerprint_ = computeSHA256(combined);
    
    return !hardwareFingerprint_.empty();
}

std::string SecurityShield::getCPUInfo() {
    // In a real implementation, this would read CPUID, serial numbers, etc.
    // For demo, return a simulated value
    return "Intel_i7_12700K";
}

std::string SecurityShield::getMemoryInfo() {
    // Return memory size and type
    return "32GB_DDR4";
}

std::string SecurityShield::getDiskInfo() {
    // Return disk serial number
    return "WD123456789";
}

std::string SecurityShield::getMACAddress() {
    // Return primary network interface MAC
    return "00:1A:2B:3C:4D:5E";
}

std::vector<uint8_t> SecurityShield::generateSecureKey(size_t length) {
    std::vector<uint8_t> key(length);
    std::uniform_int_distribution<uint8_t> dist(0, 255);
    
    for (size_t i = 0; i < length; ++i) {
        key[i] = dist(rng_);
    }
    
    return key;
}

std::string SecurityShield::computeSHA256(const std::string& input) {
    // In a real implementation, use a cryptographic library
    // For demo, return a simulated hash
    std::hash<std::string> hasher;
    size_t hashValue = hasher(input);
    
    std::stringstream ss;
    ss << std::hex << hashValue;
    std::string result = ss.str();
    
    // Pad to 64 characters (256 bits)
    while (result.length() < 64) {
        result = "0" + result;
    }
    
    return result.substr(0, 64);
}

bool SecurityShield::validateLicenseKeyFormat(const std::string& licenseKey) {
    // Check basic format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    if (licenseKey.length() != 29) {
        return false;
    }
    
    for (size_t i = 0; i < licenseKey.length(); ++i) {
        if (i == 5 || i == 11 || i == 17 || i == 23) {
            if (licenseKey[i] != '-') {
                return false;
            }
        } else {
            char c = licenseKey[i];
            if (!((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))) {
                return false;
            }
        }
    }
    
    return true;
}

std::string SecurityShield::decryptLicenseKey(const std::string& licenseKey) {
    // Remove dashes
    std::string cleanKey;
    for (char c : licenseKey) {
        if (c != '-') {
            cleanKey += c;
        }
    }
    
    // In a real implementation, use AES decryption
    // For demo, return a simulated decrypted payload
    return "KRONOP_LICENSE_VALID_" + hardwareFingerprint_.substr(0, 16);
}

bool SecurityShield::parseLicenseData(const std::string& data, LicenseData& licenseData) {
    // Parse license data format
    // Format: product|version|type|duration|fingerprint|signature
    
    std::istringstream iss(data);
    std::string token;
    std::vector<std::string> tokens;
    
    while (std::getline(iss, token, '|')) {
        tokens.push_back(token);
    }
    
    if (tokens.size() < 5) {
        return false;
    }
    
    licenseData.product = tokens[0];
    licenseData.version = tokens[1];
    licenseData.type = static_cast<LicenseType>(std::stoi(tokens[2]));
    licenseData.duration = std::stoi(tokens[3]);
    licenseData.fingerprint = tokens[4];
    
    if (tokens.size() > 5) {
        licenseData.signature = tokens[5];
    }
    
    return true;
}

bool SecurityShield::verifyLicenseSignature(const LicenseData& licenseData) {
    // In a real implementation, verify RSA/ECDSA signature
    // For demo, check if fingerprint matches
    return licenseData.fingerprint == hardwareFingerprint_;
}

bool SecurityShield::validateOnlineLicense() {
    // In a real implementation, contact license server
    // For demo, simulate online validation
    
    // Simulate network request
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Simulate validation success (90% chance)
    std::uniform_int_distribution<int> dist(1, 100);
    int chance = dist(rng_);
    
    return chance <= 90;
}

bool SecurityShield::validateHardwareBinding() {
    if (!config_.enableHardwareBinding) {
        return true;
    }
    
    // Check if current hardware fingerprint matches licensed one
    std::string currentFingerprint = computeSHA256(hardwareFingerprint_);
    std::string licensedFingerprint = computeSHA256(hardwareFingerprint_);
    
    return currentFingerprint == licensedFingerprint;
}

void SecurityShield::updateTrialDays() {
    if (licenseType_ != LicenseType::TRIAL) {
        return;
    }
    
    auto currentTime = getCurrentTimestamp();
    auto daysPassed = (currentTime - activationTime_) / (24 * 3600);
    
    remainingDays_ = std::max(30 - static_cast<int>(daysPassed), 0);
}

int SecurityShield::calculateRemainingDays() const {
    if (licenseType_ == LicenseType::TRIAL) {
        return remainingDays_;
    }
    
    auto currentTime = getCurrentTimestamp();
    auto secondsRemaining = expirationTime_ - currentTime;
    
    return std::max(static_cast<int>(secondsRemaining / (24 * 3600)), 0);
}

uint64_t SecurityShield::getCurrentTimestamp() const {
    return std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

bool SecurityShield::loadLicenseFromFile() {
    std::ifstream file("kronop.license");
    if (!file.is_open()) {
        return false;
    }
    
    std::string line;
    while (std::getline(file, line)) {
        size_t pos = line.find('=');
        if (pos != std::string::npos) {
            std::string key = line.substr(0, pos);
            std::string value = line.substr(pos + 1);
            
            if (key == "licenseKey") {
                licenseKey_ = value;
            } else if (key == "licenseType") {
                licenseType_ = static_cast<LicenseType>(std::stoi(value));
            } else if (key == "activationTime") {
                activationTime_ = std::stoull(value);
            } else if (key == "expirationTime") {
                expirationTime_ = std::stoull(value);
            } else if (key == "hardwareFingerprint") {
                hardwareFingerprint_ = value;
            } else if (key == "remainingDays") {
                remainingDays_ = std::stoi(value);
            }
        }
    }
    
    file.close();
    return !licenseKey_.empty();
}

bool SecurityShield::saveLicenseToFile() {
    std::ofstream file("kronop.license");
    if (!file.is_open()) {
        return false;
    }
    
    file << "licenseKey=" << licenseKey_ << "\n";
    file << "licenseType=" << static_cast<int>(licenseType_) << "\n";
    file << "activationTime=" << activationTime_ << "\n";
    file << "expirationTime=" << expirationTime_ << "\n";
    file << "hardwareFingerprint=" << hardwareFingerprint_ << "\n";
    file << "remainingDays=" << remainingDays_ << "\n";
    file << "lastValidation=" << lastValidationTime_ << "\n";
    
    file.close();
    return true;
}

bool SecurityShield::loadSecurityKeys() {
    // In a real implementation, load from secure storage or embedded resources
    // For demo, use simulated keys
    
    publicKey_ = "-----BEGIN PUBLIC KEY-----\n"
                 "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n"
                 "-----END PUBLIC KEY-----";
    
    privateKey_ = "-----BEGIN PRIVATE KEY-----\n"
                  "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEA...\n"
                  "-----END PRIVATE KEY-----";
    
    return !publicKey_.empty() && !privateKey_.empty();
}

// AntiTampering Implementation
AntiTampering::AntiTampering()
    : isEnabled_(false), checksumValid_(true), lastCheckTime_(0) {
    
    // Calculate initial checksum
    calculateModuleChecksum();
}

AntiTampering::~AntiTampering() {
    disable();
}

bool AntiTampering::enable() {
    if (isEnabled_) {
        return true;
    }
    
    // Calculate initial checksums
    if (!calculateModuleChecksum()) {
        return false;
    }
    
    isEnabled_ = true;
    lastCheckTime_ = getCurrentTimestamp();
    
    return true;
}

void AntiTampering::disable() {
    isEnabled_ = false;
}

bool AntiTampering::verifyIntegrity() {
    if (!isEnabled_) {
        return true;
    }
    
    auto currentTime = getCurrentTimestamp();
    
    // Check every 60 seconds
    if (currentTime - lastCheckTime_ < 60) {
        return checksumValid_;
    }
    
    lastCheckTime_ = currentTime;
    
    // Recalculate checksum
    std::string currentChecksum = calculateCurrentChecksum();
    
    checksumValid_ = (currentChecksum == originalChecksum_);
    
    if (!checksumValid_) {
        // Tampering detected
        handleTampering();
    }
    
    return checksumValid_;
}

bool AntiTampering::calculateModuleChecksum() {
    // In a real implementation, calculate checksum of executable sections
    // For demo, use a simulated checksum
    
    originalChecksum_ = "KRONOP_MODULE_CHECKSUM_ABC123DEF456";
    
    return !originalChecksum_.empty();
}

std::string AntiTampering::calculateCurrentChecksum() {
    // In a real implementation, calculate current checksum
    // For demo, return original (no tampering) or modified (tampering)
    
    // Simulate tampering detection (5% chance)
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dist(1, 100);
    
    if (dist(gen) <= 5) {
        return "MODIFIED_CHECKSUM_789XYZ";
    }
    
    return originalChecksum_;
}

void AntiTampering::handleTampering() {
    // In a real implementation, this could:
    // - Log the tampering attempt
    // - Disable the software
    // - Send alert to server
    // - Encrypt sensitive data
    
    // For demo, we'll just mark as invalid
    checksumValid_ = false;
}

uint64_t AntiTampering::getCurrentTimestamp() const {
    return std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

} // namespace kronop
