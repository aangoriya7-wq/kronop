/**
 * Security_Shield.hpp
 * Commercial Security & License Verification System
 * Protects Kronop Cleaner AI intellectual property and ensures compliance
 */

#ifndef SECURITY_SHIELD_HPP
#define SECURITY_SHIELD_HPP

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <thread>
#include <random>
#include <cstdint>

namespace kronop {

/**
 * License Types
 */
enum class LicenseType {
    TRIAL = 0,
    BASIC = 1,
    PROFESSIONAL = 2,
    ENTERPRISE = 3,
    DEVELOPER = 4
};

/**
 * Security Configuration
 */
struct SecurityConfig {
    bool enableOnlineValidation;      // Online license validation
    bool enableAntiTampering;          // Anti-tampering protection
    bool enableHardwareBinding;        // Hardware-based licensing
    bool enableEncryption;             // Data encryption
    int encryptionLevel;               // Encryption strength (128/256/512)
    std::string licenseServerURL;      // License validation server
    int validationInterval;            // Validation check interval (seconds)
    int maxOfflineDays;                // Maximum offline usage days
    
    SecurityConfig()
        : enableOnlineValidation(true), enableAntiTampering(true),
          enableHardwareBinding(true), enableEncryption(true),
          encryptionLevel(256), licenseServerURL("https://api.kronop.ai/validate"),
          validationInterval(3600), maxOfflineDays(7) {}
};

/**
 * License Information
 */
struct LicenseData {
    std::string product;               // Product name
    std::string version;               // License version
    LicenseType type;                  // License type
    int duration;                      // Duration in days
    std::string fingerprint;           // Hardware fingerprint
    std::string signature;             // Digital signature
    
    LicenseData() : type(LicenseType::TRIAL), duration(30) {}
};

/**
 * License Information for Display
 */
struct LicenseInfo {
    bool isValid;                      // License validity status
    LicenseType type;                  // Current license type
    std::string licenseKey;            // License key
    std::string hardwareFingerprint;   // Hardware fingerprint
    uint64_t activationTime;           // Activation timestamp
    uint64_t expirationTime;           // Expiration timestamp
    int remainingDays;                 // Days remaining
    bool isTrial;                      // Is trial license
    int maxOfflineDays;                // Maximum offline days
    int currentOfflineDays;             // Current offline days
    
    LicenseInfo() : isValid(false), type(LicenseType::TRIAL),
                   activationTime(0), expirationTime(0),
                   remainingDays(0), isTrial(true),
                   maxOfflineDays(7), currentOfflineDays(0) {}
};

/**
 * Security Status Information
 */
struct SecurityStatus {
    bool isInitialized;                // Security system status
    bool isLicensed;                   // License status
    uint64_t lastValidationTime;       // Last validation timestamp
    int validationInterval;            // Validation check interval
    bool isOnlineValidationEnabled;    // Online validation status
    int encryptionLevel;               // Current encryption level
    bool antiTamperingEnabled;         // Anti-tampering status
    bool hardwareBindingEnabled;       // Hardware binding status
    
    SecurityStatus() : isInitialized(false), isLicensed(false),
                       lastValidationTime(0), validationInterval(3600),
                       isOnlineValidationEnabled(true), encryptionLevel(256),
                       antiTamperingEnabled(true), hardwareBindingEnabled(true) {}
};

/**
 * Security Shield - Main Security System
 * Handles license validation, encryption, and anti-tampering
 */
class SecurityShield {
public:
    explicit SecurityShield(const SecurityConfig& config = SecurityConfig());
    ~SecurityShield();
    
    // Initialization
    bool initialize();
    void shutdown();
    
    // License Management
    bool validateLicense();
    bool activateLicense(const std::string& licenseKey, LicenseType type, int durationDays);
    bool extendLicense(int additionalDays);
    bool deactivateLicense();
    
    // License Information
    LicenseInfo getLicenseInfo() const;
    SecurityStatus getSecurityStatus() const;
    
    // Security Features
    bool isLicensed() const { return isLicensed_; }
    bool isTrialExpired() const;
    bool canUseFeature(const std::string& feature) const;
    
    // Configuration
    void setConfig(const SecurityConfig& config);
    SecurityConfig getConfig() const { return config_; }
    
    // Encryption
    std::string encryptData(const std::string& data);
    std::string decryptData(const std::string& encryptedData);
    
    // Validation
    bool validateHardwareBinding();
    bool performOnlineValidation();

private:
    SecurityConfig config_;
    
    // License state
    bool isInitialized_;
    bool isLicensed_;
    LicenseType licenseType_;
    std::string licenseKey_;
    uint64_t activationTime_;
    uint64_t expirationTime_;
    int remainingDays_;
    
    // Hardware binding
    std::string hardwareFingerprint_;
    
    // Validation
    uint64_t lastValidationTime_;
    int validationInterval_;
    int maxOfflineDays_;
    int currentOfflineDays_;
    
    // Cryptographic components
    std::vector<uint8_t> encryptionKey_;
    std::vector<uint8_t> hmacKey_;
    std::string publicKey_;
    std::string privateKey_;
    
    // Random number generation
    mutable std::mt19937 rng_;
    
    // Thread safety
    mutable std::mutex securityMutex_;
    
    // Internal methods
    bool initializeCrypto();
    void cleanupCrypto();
    
    // Hardware fingerprint
    bool generateHardwareFingerprint();
    std::string getCPUInfo();
    std::string getMemoryInfo();
    std::string getDiskInfo();
    std::string getMACAddress();
    
    // Cryptographic utilities
    std::vector<uint8_t> generateSecureKey(size_t length);
    std::string computeSHA256(const std::string& input);
    std::string computeHMAC(const std::string& data);
    
    // License processing
    bool validateLicenseKeyFormat(const std::string& licenseKey);
    std::string decryptLicenseKey(const std::string& licenseKey);
    bool parseLicenseData(const std::string& data, LicenseData& licenseData);
    bool verifyLicenseSignature(const LicenseData& licenseData);
    bool validateOnlineLicense();
    bool validateHardwareBinding();
    
    // License management
    void updateTrialDays();
    int calculateRemainingDays() const;
    uint64_t getCurrentTimestamp() const;
    
    // File operations
    bool loadLicenseFromFile();
    bool saveLicenseToFile();
    bool loadSecurityKeys();
    
    // Feature validation
    bool isFeatureEnabled(LicenseType type, const std::string& feature) const;
};

/**
 * Anti-Tampering System
 * Monitors application integrity
 */
class AntiTampering {
public:
    AntiTampering();
    ~AntiTampering();
    
    // Control
    bool enable();
    void disable();
    
    // Integrity checking
    bool verifyIntegrity();
    bool isIntegrityValid() const { return checksumValid_; }
    
    // Configuration
    void setCheckInterval(int seconds);
    int getCheckInterval() const;

private:
    bool isEnabled_;
    bool checksumValid_;
    std::string originalChecksum_;
    uint64_t lastCheckTime_;
    int checkInterval_;
    
    // Thread for periodic checking
    std::unique_ptr<std::thread> checkThread_;
    std::atomic<bool> stopChecking_;
    
    // Internal methods
    bool calculateModuleChecksum();
    std::string calculateCurrentChecksum();
    void handleTampering();
    uint64_t getCurrentTimestamp() const;
    
    // Periodic checking
    void periodicCheck();
};

/**
 * Feature Access Control
 * Manages feature access based on license type
 */
class FeatureAccess {
public:
    explicit FeatureAccess(LicenseType licenseType);
    
    // Feature checking
    bool canAccessFeature(const std::string& feature) const;
    bool canAccessAdvancedFeatures() const;
    bool canUseCommercialFeatures() const;
    
    // License information
    LicenseType getLicenseType() const { return licenseType_; }
    std::vector<std::string> getAvailableFeatures() const;
    
    // Configuration
    void setLicenseType(LicenseType type);

private:
    LicenseType licenseType_;
    
    // Feature definitions
    struct Feature {
        std::string name;
        LicenseType minLicense;
        std::string description;
    };
    
    std::vector<Feature> features_;
    
    // Internal methods
    void initializeFeatures();
    const Feature* findFeature(const std::string& name) const;
};

/**
 * Security Audit Logger
 * Logs security events for compliance
 */
class SecurityAuditLogger {
public:
    SecurityAuditLogger();
    ~SecurityAuditLogger();
    
    // Logging
    void logLicenseValidation(bool success, const std::string& details = "");
    void logTamperingAttempt(const std::string& details);
    void logFeatureAccess(const std::string& feature, bool allowed);
    void logSecurityEvent(const std::string& eventType, const std::string& details);
    
    // Configuration
    void setLogLevel(int level);
    void setLogFile(const std::string& filePath);
    void enableFileLogging(bool enable);
    
    // Statistics
    int getEventCount(const std::string& eventType) const;
    std::vector<std::string> getRecentEvents(int count = 10) const;

private:
    int logLevel_;
    std::string logFilePath_;
    bool enableFileLogging_;
    
    // Event storage
    std::vector<std::string> eventLog_;
    std::mutex logMutex_;
    
    // Internal methods
    void writeLogEntry(const std::string& entry);
    std::string formatLogEntry(const std::string& eventType, const std::string& details);
    std::string getCurrentTimestamp() const;
};

/**
 * License Validator
 * Core license validation logic
 */
class LicenseValidator {
public:
    explicit LicenseValidator(const SecurityConfig& config);
    
    // Validation
    bool validateLicenseKey(const std::string& licenseKey);
    bool validateLicenseData(const LicenseData& data);
    bool validateHardwareBinding(const std::string& fingerprint);
    bool validateOnlineLicense(const std::string& licenseKey);
    
    // License generation (for development/testing)
    std::string generateLicenseKey(LicenseType type, int durationDays, 
                                  const std::string& hardwareFingerprint);
    
    // Configuration
    void setValidationServer(const std::string& serverURL);
    void setPublicKey(const std::string& publicKey);

private:
    SecurityConfig config_;
    std::string publicKey_;
    
    // Internal methods
    bool verifyDigitalSignature(const std::string& data, const std::string& signature);
    std::string encryptLicenseData(const LicenseData& data);
    LicenseData decryptLicenseData(const std::string& encryptedData);
    bool contactValidationServer(const std::string& licenseKey);
};

} // namespace kronop

#endif // SECURITY_SHIELD_HPP
