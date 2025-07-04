/**
 * History Management System for Skin Cancer Classification
 * Handles analysis history display, filtering, searching, and management
 */

class HistoryManager {
    constructor() {
        this.currentUser = null;
        this.analysisHistory = [];
        this.filteredHistory = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.renderHistory();
        this.updateStats();
    }

    loadUserData() {
        // Load current user
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        if (!this.currentUser) {
            this.redirectToLogin();
            return;
        }

        // Load user's analysis history
        this.analysisHistory = JSON.parse(
            localStorage.getItem(`history_${this.currentUser.email}`) || '[]'
        );
        this.filteredHistory = [...this.analysisHistory];
    }

    redirectToLogin() {
        alert('Please login to view your analysis history.');
        window.location.href = 'login.html';
    }

    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSortOrder(e.target.value);
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearchQuery(e.target.value);
            });
        }

        // Clear history button
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        // Export buttons
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                this.exportToJson();
            });
        }
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                this.exportToCsv();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshHistory();
            });
        }
    }

    setFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
        
        this.applyFiltersAndSort();
    }

    setSortOrder(sortOrder) {
        this.currentSort = sortOrder;
        this.applyFiltersAndSort();
    }

    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.applyFiltersAndSort();
    }

    applyFiltersAndSort() {
        let filtered = [...this.analysisHistory];

        // Apply filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(item => item.result === this.currentFilter);
        }

        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(item => {
                return (
                    item.fileName.toLowerCase().includes(this.searchQuery) ||
                    item.result.toLowerCase().includes(this.searchQuery) ||
                    new Date(item.date).toLocaleDateString().includes(this.searchQuery)
                );
            });
        }

        // Apply sort
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'confidence-high':
                    return b.confidence - a.confidence;
                case 'confidence-low':
                    return a.confidence - b.confidence;
                case 'filename-az':
                    return a.fileName.localeCompare(b.fileName);
                case 'filename-za':
                    return b.fileName.localeCompare(a.fileName);
                default:
                    return new Date(b.date) - new Date(a.date);
            }
        });

        this.filteredHistory = filtered;
        this.renderHistory();
        this.updateFilteredStats();
    }

    renderHistory() {
        const historyContainer = document.getElementById('historyContainer');
        const noResultsMessage = document.getElementById('noResultsMessage');
        
        if (!historyContainer) return;

        if (this.filteredHistory.length === 0) {
            historyContainer.style.display = 'none';
            if (noResultsMessage) {
                noResultsMessage.style.display = 'block';
                noResultsMessage.innerHTML = this.getNoResultsMessage();
            }
            return;
        }

        historyContainer.style.display = 'block';
        if (noResultsMessage) {
            noResultsMessage.style.display = 'none';
        }

        const historyHtml = this.filteredHistory.map((item, index) => {
            return this.createHistoryItemHtml(item, index);
        }).join('');

        historyContainer.innerHTML = historyHtml;

        // Add event listeners to delete buttons
        this.setupDeleteButtons();
    }

    createHistoryItemHtml(item, index) {
        const date = new Date(item.date);
        const formattedDate = this.formatDate(date);
        const timeAgo = this.getTimeAgo(date);
        const resultClass = item.result === 'benign' ? 'benign' : 'malignant';
        const resultIcon = item.result === 'benign' ? '✅' : '⚠️';
        const confidenceColor = this.getConfidenceColor(item.confidence);

        return `
            <div class="history-item" data-index="${index}" data-original-index="${this.analysisHistory.indexOf(item)}">
                <div class="history-header">
                    <div class="history-main-info">
                        <div class="history-result ${resultClass}">
                            <span class="result-icon">${resultIcon}</span>
                            <span class="result-text">${item.result === 'benign' ? 'Benign' : 'Malignant'}</span>
                        </div>
                        <div class="history-confidence" style="color: ${confidenceColor}">
                            <strong>${item.confidence.toFixed(1)}%</strong> confidence
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="action-btn view-btn" onclick="historyManager.viewDetails(${this.analysisHistory.indexOf(item)})" title="View Details">
                            <i class="icon">👁️</i>
                        </button>
                        <button class="action-btn delete-btn" onclick="historyManager.deleteAnalysis(${this.analysisHistory.indexOf(item)})" title="Delete">
                            <i class="icon">🗑️</i>
                        </button>
                    </div>
                </div>
                
                <div class="history-details">
                    <div class="detail-item">
                        <span class="detail-label">File:</span>
                        <span class="detail-value">${item.fileName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time Ago:</span>
                        <span class="detail-value">${timeAgo}</span>
                    </div>
                    ${item.notes ? `
                        <div class="detail-item">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${item.notes}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="history-recommendation">
                    ${this.getRecommendationText(item.result, item.confidence)}
                </div>
            </div>
        `;
    }

    setupDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.closest('.history-item').dataset.originalIndex);
                this.deleteAnalysis(index);
            });
        });
    }

    viewDetails(index) {
        const item = this.analysisHistory[index];
        if (!item) return;

        const modal = this.createDetailModal(item);
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    createDetailModal(item) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Analysis Details</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-section">
                            <h4>Result Information</h4>
                            <div class="result-badge ${item.result}">
                                ${item.result === 'benign' ? '✅ Benign' : '⚠️ Malignant'}
                            </div>
                            <p><strong>Confidence:</strong> ${item.confidence.toFixed(1)}%</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4>File Information</h4>
                            <p><strong>Filename:</strong> ${item.fileName}</p>
                            <p><strong>Analysis Date:</strong> ${this.formatDate(new Date(item.date))}</p>
                            <p><strong>Time Ago:</strong> ${this.getTimeAgo(new Date(item.date))}</p>
                        </div>
                    </div>
                    
                    <div class="recommendation-section">
                        <h4>Medical Recommendation</h4>
                        <div class="recommendation-text">
                            ${this.getDetailedRecommendation(item.result, item.confidence)}
                        </div>
                    </div>
                    
                    <div class="notes-section">
                        <h4>Notes</h4>
                        <textarea class="notes-input" placeholder="Add your notes here..." 
                                  onchange="historyManager.updateNotes(${this.analysisHistory.indexOf(item)}, this.value)">${item.notes || ''}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        // Close modal when clicking overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    updateNotes(index, notes) {
        if (this.analysisHistory[index]) {
            this.analysisHistory[index].notes = notes;
            this.saveHistory();
        }
    }

    deleteAnalysis(index) {
        if (!confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
            return;
        }

        this.analysisHistory.splice(index, 1);
        this.saveHistory();
        this.applyFiltersAndSort();
        this.updateStats();
        
        this.showNotification('Analysis deleted successfully', 'success');
    }

    clearHistory() {
        if (!confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
            return;
        }

        this.analysisHistory = [];
        this.filteredHistory = [];
        this.saveHistory();
        this.renderHistory();
        this.updateStats();
        
        this.showNotification('History cleared successfully', 'success');
    }

    refreshHistory() {
        this.loadUserData();
        this.applyFiltersAndSort();
        this.updateStats();
        this.showNotification('History refreshed', 'info');
    }

    exportToJson() {
        if (this.analysisHistory.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }

        const exportData = {
            user: this.currentUser.name,
            email: this.currentUser.email,
            exportDate: new Date().toISOString(),
            totalAnalyses: this.analysisHistory.length,
            analyses: this.analysisHistory.map(item => ({
                ...item,
                formattedDate: this.formatDate(new Date(item.date))
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        this.downloadFile(dataBlob, `skincare-ai-history-${new Date().toISOString().split('T')[0]}.json`);
        this.showNotification('History exported as JSON', 'success');
    }

    exportToCsv() {
        if (this.analysisHistory.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }

        const headers = ['Date', 'Time', 'Filename', 'Result', 'Confidence (%)', 'Notes'];
        const csvData = [headers];

        this.analysisHistory.forEach(item => {
            const date = new Date(item.date);
            csvData.push([
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                item.fileName,
                item.result,
                item.confidence.toFixed(1),
                item.notes || ''
            ]);
        });

        const csvContent = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadFile(dataBlob, `skincare-ai-history-${new Date().toISOString().split('T')[0]}.csv`);
        this.showNotification('History exported as CSV', 'success');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateStats() {
        const totalAnalyses = this.analysisHistory.length;
        const benignCount = this.analysisHistory.filter(item => item.result === 'benign').length;
        const malignantCount = this.analysisHistory.filter(item => item.result === 'malignant').length;
        
        // Update stats display
        const totalElement = document.getElementById('totalAnalyses');
        const benignElement = document.getElementById('benignCount');
        const malignantElement = document.getElementById('malignantCount');
        
        if (totalElement) totalElement.textContent = totalAnalyses;
        if (benignElement) benignElement.textContent = benignCount;
        if (malignantElement) malignantElement.textContent = malignantCount;

        // Update percentages
        if (totalAnalyses > 0) {
            const benignPercentage = ((benignCount / totalAnalyses) * 100).toFixed(1);
            const malignantPercentage = ((malignantCount / totalAnalyses) * 100).toFixed(1);
            
            const benignPercentElement = document.getElementById('benignPercentage');
            const malignantPercentElement = document.getElementById('malignantPercentage');
            
            if (benignPercentElement) benignPercentElement.textContent = `${benignPercentage}%`;
            if (malignantPercentElement) malignantPercentElement.textContent = `${malignantPercentage}%`;
        }
    }

    updateFilteredStats() {
        const filteredCountElement = document.getElementById('filteredCount');
        if (filteredCountElement) {
            filteredCountElement.textContent = this.filteredHistory.length;
        }
    }

    saveHistory() {
        localStorage.setItem(`history_${this.currentUser.email}`, JSON.stringify(this.analysisHistory));
    }

    // Utility functions
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }

    getConfidenceColor(confidence) {
        if (confidence >= 90) return '#28a745';
        if (confidence >= 75) return '#ffc107';
        return '#dc3545';
    }

    getNoResultsMessage() {
        if (this.analysisHistory.length === 0) {
            return `
                <div class="no-results">
                    <div class="no-results-icon">📊</div>
                    <h3>No Analysis History</h3>
                    <p>You haven't analyzed any images yet. Start by uploading an image in the dashboard!</p>
                    <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
                </div>
            `;
        } else if (this.searchQuery) {
            return `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No Search Results</h3>
                    <p>No analyses found matching "${this.searchQuery}"</p>
                    <button class="btn btn-secondary" onclick="historyManager.clearSearch()">Clear Search</button>
                </div>
            `;
        } else {
            return `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No Results Found</h3>
                    <p>No analyses match the current filter criteria</p>
                    <button class="btn btn-secondary" onclick="historyManager.clearFilters()">Clear Filters</button>
                </div>
            `;
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            this.setSearchQuery('');
        }
    }

    clearFilters() {
        this.setFilter('all');
        this.setSortOrder('newest');
        this.clearSearch();
    }

    getRecommendationText(result, confidence) {
        if (result === 'malignant') {
            return `
                <div class="recommendation malignant">
                    <strong>⚠️ Important:</strong> This analysis suggests potential malignancy. 
                    Please consult a dermatologist immediately for professional evaluation.
                </div>
            `;
        } else {
            return `
                <div class="recommendation benign">
                    <strong>✅ Good News:</strong> This analysis suggests the lesion is likely benign. 
                    Continue regular skin monitoring and routine check-ups.
                </div>
            `;
        }
    }

    getDetailedRecommendation(result, confidence) {
        if (result === 'malignant') {
            return `
                <div class="detailed-recommendation malignant">
                    <h5>⚠️ Potentially Malignant Lesion Detected</h5>
                    <p><strong>Immediate Actions Required:</strong></p>
                    <ul>
                        <li>Schedule an appointment with a dermatologist within 1-2 weeks</li>
                        <li>Bring this analysis report to your appointment</li>
                        <li>Monitor the lesion for any rapid changes</li>
                        <li>Avoid sun exposure to the affected area</li>
                        <li>Do not attempt to remove or treat the lesion yourself</li>
                    </ul>
                    <p><strong>What to Expect:</strong></p>
                    <ul>
                        <li>Professional dermatoscopic examination</li>
                        <li>Possible biopsy for definitive diagnosis</li>
                        <li>Treatment plan if malignancy is confirmed</li>
                    </ul>
                    <div class="urgency-note">
                        <strong>Remember:</strong> Early detection and treatment significantly improve outcomes for skin cancer.
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="detailed-recommendation benign">
                    <h5>✅ Likely Benign Lesion</h5>
                    <p><strong>Recommended Actions:</strong></p>
                    <ul>
                        <li>Continue regular monthly skin self-examinations</li>
                        <li>Schedule annual dermatological check-ups</li>
                        <li>Monitor for any changes in size, color, or texture</li>
                        <li>Use sun protection (SPF 30+ sunscreen, protective clothing)</li>
                        <li>Take photos for future comparison</li>
                    </ul>
                    <p><strong>Watch for Changes:</strong></p>
                    <ul>
                        <li>Asymmetry in shape</li>
                        <li>Border irregularity</li>
                        <li>Color variation</li>
                        <li>Diameter growth</li>
                        <li>Evolution or changes over time</li>
                    </ul>
                    <div class="maintenance-note">
                        <strong>Remember:</strong> Regular monitoring is key to maintaining skin health, even for benign lesions.
                    </div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize history manager when DOM is loaded
let historyManager;

document.addEventListener('DOMContentLoaded', function() {
    historyManager = new HistoryManager();
});

// Export for global access
window.historyManager = historyManager;