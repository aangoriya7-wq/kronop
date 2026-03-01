/**
 * Redundancy Manager - Data Redundancy and Verification
 * 
 * Manages data redundancy across multiple edge nodes
 * Provides data integrity verification
 * Implements checksum validation
 * 
 * Features:
 * - Data redundancy verification
 * - Checksum validation
 * - Data integrity scoring
 * - Failover support
 */

package streaming

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"sync"
	"time"
)

// VerifyRedundancy verifies data redundancy across multiple sources
func (rm *RedundancyManager) VerifyRedundancy(aggregatedData *AggregatedData, sourceDataList []*SourceData) (*AggregatedData, error) {
	startTime := time.Now()

	log.Printf("🔍 Starting redundancy verification for %d sources", len(sourceDataList))

	if !rm.verificationEnabled {
		log.Printf("⚠️ Redundancy verification disabled")
		return aggregatedData, nil
	}

	// Filter successful sources
	var successfulSources []*SourceData
	for _, sourceData := range sourceDataList {
		if sourceData.Success {
			successfulSources = append(successfulSources, sourceData)
		}
	}

	if len(successfulSources) < rm.redundancyFactor {
		return nil, fmt.Errorf("insufficient sources for redundancy verification: got %d, required %d", 
			len(successfulSources), rm.redundancyFactor)
	}

	// Perform data validation
	validationResult, err := rm.dataValidator.ValidateData(aggregatedData.Data, successfulSources)
	if err != nil {
		return nil, fmt.Errorf("data validation failed: %w", err)
	}

	// Update aggregated data with verification results
	aggregatedData.IntegrityVerified = validationResult.Valid
	aggregatedData.ValidationTime = validationResult.ValidationTime
	aggregatedData.RedundancyScore = validationResult.RedundancyScore

	// Update metrics
	rm.updateRedundancyMetrics(len(successfulSources), validationResult.ValidationTime, validationResult.Valid)

	validationTime := time.Since(startTime)
	log.Printf("🔥 Redundancy verification completed: %v, verified=%v, score=%.2f", 
		validationTime, validationResult.Valid, validationResult.RedundancyScore)

	return aggregatedData, nil
}

// ValidateData validates data integrity across multiple sources
func (dv *DataValidator) ValidateData(data []byte, sources []*SourceData) (*ValidationResult, error) {
	startTime := time.Now()

	log.Printf("🔍 Starting data validation with %d sources", len(sources))

	result := &ValidationResult{
		ValidationTime: time.Since(startTime),
		Valid:          false,
		RedundancyScore: 0.0,
		VerifiedSources: make([]string, 0),
		MismatchedSources: make([]string, 0),
	}

	if len(sources) == 0 {
		result.ErrorMessage = "no sources provided for validation"
		return result, fmt.Errorf("no sources provided")
	}

	// Calculate primary data checksum
	primaryChecksum := dv.calculateChecksum(data)
	log.Printf("🔐 Primary data checksum: %s", primaryChecksum)

	// Validate against each source
	validSources := 0
	for _, source := range sources {
		sourceChecksum := dv.calculateChecksum(source.Data)
		
		log.Printf("🔐 Source %s checksum: %s", source.NodeID, sourceChecksum)

		if sourceChecksum == primaryChecksum {
			result.VerifiedSources = append(result.VerifiedSources, source.NodeID)
			validSources++
		} else {
			result.MismatchedSources = append(result.MismatchedSources, source.NodeID)
			log.Printf("⚠️ Checksum mismatch for source %s: expected %s, got %s", 
				source.NodeID, primaryChecksum, sourceChecksum)
		}
	}

	// Calculate redundancy score
	totalSources := len(sources)
	result.RedundancyScore = float64(validSources) / float64(totalSources)
	result.Valid = result.RedundancyScore >= dv.validationThreshold

	result.ValidationTime = time.Since(startTime)

	// Update metrics
	dv.updateValidatorMetrics(len(sources), validSources, result.ValidationTime, result.Valid)

	log.Printf("🔥 Data validation completed: %v, valid=%v, score=%.2f, verified=%d/%d", 
		result.ValidationTime, result.Valid, result.RedundancyScore, validSources, totalSources)

	return result, nil
}

// ValidationResult represents validation result
type ValidationResult struct {
	Valid               bool          `json:"valid"`
	VerifiedSources     []string      `json:"verified_sources"`
	MismatchedSources   []string      `json:"mismatched_sources"`
	ValidationTime      time.Duration `json:"validation_time"`
	RedundancyScore     float64       `json:"redundancy_score"`
	ErrorMessage        string        `json:"error_message"`
	ValidationMethod    string        `json:"validation_method"`
	ChecksumAlgorithm    string        `json:"checksum_algorithm"`
}

// calculateChecksum calculates checksum for data
func (dv *DataValidator) calculateChecksum(data []byte) string {
	switch dv.checksumAlgorithm {
	case "sha256":
		hash := sha256.Sum256(data)
		return hex.EncodeToString(hash[:])
	default:
		// Simple checksum fallback
		var sum uint32
		for _, b := range data {
			sum += uint32(b)
		}
		return fmt.Sprintf("%x", sum)
	}
}

// VerifyChecksum verifies checksum of data
func (dv *DataValidator) VerifyChecksum(data []byte, expectedChecksum string) bool {
	actualChecksum := dv.calculateChecksum(data)
	return actualChecksum == expectedChecksum
}

// ValidateHash validates hash of data
func (dv *DataValidator) ValidateHash(data []byte, expectedHash string) bool {
	// For demo, use same checksum method
	return dv.VerifyChecksum(data, expectedHash)
}

// ValidateSignature validates signature of data
func (dv *DataValidator) ValidateSignature(data []byte, expectedSignature string) bool {
	// In production, implement proper digital signature verification
	// For demo, return true
	return true
}

// updateValidatorMetrics updates validator metrics
func (dv *DataValidator) updateValidatorMetrics(totalSources, validSources int, validationTime time.Duration, valid bool) {
	dv.metrics.mu.Lock()
	defer dv.metrics.mu.Unlock()

	dv.metrics.TotalValidations++

	if valid {
		dv.metrics.ChecksumValidations++ // Simplified for demo
	}

	// Update average validation time
	if dv.metrics.AverageValidationTime == 0 {
		dv.metrics.AverageValidationTime = validationTime
	} else {
		dv.metrics.AverageValidationTime = (dv.metrics.AverageValidationTime + validationTime) / 2
	}

	// Update validation accuracy
	accuracy := float64(validSources) / float64(totalSources)
	if dv.metrics.ValidationAccuracy == 0 {
		dv.metrics.ValidationAccuracy = accuracy
	} else {
		dv.metrics.ValidationAccuracy = (dv.metrics.ValidationAccuracy + accuracy) / 2
	}

	dv.metrics.LastUpdated = time.Now()
}

// updateRedundancyMetrics updates redundancy metrics
func (rm *RedundancyManager) updateRedundancyMetrics(sourceCount int, validationTime time.Duration, valid bool) {
	rm.metrics.mu.Lock()
	defer rm.metrics.mu.Unlock()

	rm.metrics.TotalValidations++

	if valid {
		rm.metrics.SuccessfulValidations++
	} else {
		rm.metrics.FailedValidations++
	}

	// Update data integrity score
	if valid {
		rm.metrics.DataIntegrityScore = 0.95 // High integrity for valid data
	} else {
		rm.metrics.DataIntegrityScore = 0.5 // Lower integrity for invalid data
	}

	// Update redundancy coverage
	coverage := float64(sourceCount) / float64(rm.redundancyFactor)
	if rm.metrics.RedundancyCoverage == 0 {
		rm.metrics.RedundancyCoverage = coverage
	} else {
		rm.metrics.RedundancyCoverage = (rm.metrics.RedundancyCoverage + coverage) / 2
	}

	// Update validation time
	if rm.metrics.ValidationTime == 0 {
		rm.metrics.ValidationTime = validationTime
	} else {
		rm.metrics.ValidationTime = (rm.metrics.ValidationTime + validationTime) / 2
	}

	rm.metrics.LastUpdated = time.Now()
}

// GetMetrics returns redundancy manager metrics
func (rm *RedundancyManager) GetMetrics() *RedundancyMetrics {
	rm.metrics.mu.RLock()
	defer rm.metrics.mu.RUnlock()
	
	metrics := *rm.metrics
	return &metrics
}

// GetValidatorMetrics returns validator metrics
func (dv *DataValidator) GetMetrics() *ValidatorMetrics {
	dv.metrics.mu.RLock()
	defer dv.metrics.mu.RUnlock()
	
	metrics := *dv.metrics
	return &metrics
}

// SetValidationThreshold sets validation threshold
func (rm *RedundancyManager) SetValidationThreshold(threshold float64) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	rm.dataValidator.validationThreshold = threshold
	log.Printf("🔐 Redundancy validation threshold set to %.2f", threshold)
}

// SetChecksumAlgorithm sets checksum algorithm
func (rm *RedundancyManager) SetChecksumAlgorithm(algorithm string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	rm.dataValidator.checksumAlgorithm = algorithm
	log.Printf("🔐 Checksum algorithm set to: %s", algorithm)
}

// EnableVerification enables/disables verification
func (rm *RedundancyManager) EnableVerification(enabled bool) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	
	rm.verificationEnabled = enabled
	rm.checksumValidation = enabled
	rm.dataValidator.validationMethods = []string{"checksum", "hash"}
	
	log.Printf("🔐 Redundancy verification %s", map[bool]string{true: "enabled", false: "disabled"}[enabled])
}

// VerifyDataIntegrity performs comprehensive data integrity check
func (rm *RedundancyManager) VerifyDataIntegrity(data []byte, sources []*SourceData) (*IntegrityReport, error) {
	startTime := time.Now()

	log.Printf("🔍 Starting comprehensive data integrity check")

	report := &IntegrityReport{
		StartTime: startTime,
		Valid:     false,
		Score:     0.0,
		Issues:    make([]string, 0),
	}

	// Check data size consistency
	sizes := make(map[int64]int)
	for _, source := range sources {
		if source.Success {
			sizes[source.Size]++
		}
	}

	if len(sizes) > 1 {
		report.Issues = append(report.Issues, "Inconsistent data sizes across sources")
		report.Score -= 0.2
	}

	// Perform checksum validation
	validationResult, err := rm.dataValidator.ValidateData(data, sources)
	if err != nil {
		report.Issues = append(report.Issues, fmt.Sprintf("Validation failed: %v", err))
		report.Score -= 0.3
	} else {
		if validationResult.Valid {
			report.Score += 0.5
		} else {
			report.Issues = append(report.Issues, "Checksum validation failed")
			report.Score -= 0.3
		}
	}

	// Check redundancy factor
	if len(sources) < rm.redundancyFactor {
		report.Issues = append(report.Issues, 
			fmt.Sprintf("Insufficient redundancy: got %d, required %d", len(sources), rm.redundancyFactor))
		report.Score -= 0.2
	} else {
		report.Score += 0.2
	}

	// Determine overall validity
	report.Valid = report.Score >= 0.7
	report.EndTime = time.Now()
	report.Duration = report.EndTime.Sub(report.StartTime)

	// Update metrics
	rm.updateRedundancyMetrics(len(sources), report.Duration, report.Valid)

	log.Printf("🔥 Data integrity check completed: %v, valid=%v, score=%.2f", 
		report.Duration, report.Valid, report.Score)

	return report, nil
}

// IntegrityReport represents comprehensive integrity report
type IntegrityReport struct {
	StartTime         time.Time     `json:"start_time"`
	EndTime           time.Time     `json:"end_time"`
	Duration          time.Duration `json:"duration"`
	Valid             bool          `json:"valid"`
	Score             float64       `json:"score"`                // 0.0 to 1.0
	Issues            []string      `json:"issues"`
	VerifiedSources   []string      `json:"verified_sources"`
	MismatchedSources []string      `json:"mismatched_sources"`
	RedundancyScore   float64       `json:"redundancy_score"`
	ValidationMethod  string        `json:"validation_method"`
}

// Close closes the redundancy manager
func (rm *RedundancyManager) Close() error {
	log.Println("🔌 Redundancy manager closed")
	return nil
}

// Close closes the data validator
func (dv *DataValidator) Close() error {
	log.Println("🔌 Data validator closed")
	return nil
}
