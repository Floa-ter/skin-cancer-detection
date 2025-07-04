// User Management and Data Storage
class UserSession {
    constructor() {
        this.currentUser = null;
        this.users = {}; // Store user-specific data
    }

    // Create new user account
    createUser(userData) {
        const userId = this.generateUserId();
        this.users[userId] = {
            id: userId,
            name: userData.name,
            email: userData.email,
            password: userData.password, // In real app, hash this!
            analysisHistory: [],
            stats: {
                totalAnalyses: 0,
                benignResults: 0,
                flaggedResults: 0,
                avgConfidence: 0
            },
            createdAt: new Date().toISOString()
        };
        return userId;
    }

    // Login user
    loginUser(email, password) {
        const user = Object.values(this.users).find(u => u.email === email && u.password === password);
        if (user) {
            this.currentUser = user.id;
            return user;
        }
        return null;
    }

    // Logout user
    logoutUser() {
        this.currentUser = null;
        this.clearUserData();
    }

    // Get current user data
    getCurrentUser() {
        return this.currentUser ? this.users[this.currentUser] : null;
    }

    // Add analysis to current user's history
    addAnalysis(analysisData) {
        if (!this.currentUser) return;
        
        const user = this.users[this.currentUser];
        const analysis = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...analysisData
        };
        
        user.analysisHistory.push(analysis);
        this.updateUserStats();
    }

    // Update user statistics
    updateUserStats() {
        if (!this.currentUser) return;
        
        const user = this.users[this.currentUser];
        const history = user.analysisHistory;
        
        user.stats.totalAnalyses = history.length;
        user.stats.benignResults = history.filter(a => a.result === 'Benign').length;
        user.stats.flaggedResults = history.filter(a => a.result === 'Malignant' || a.result === 'Suspicious').length;
        
        if (history.length > 0) {
            const totalConfidence = history.reduce((sum, a) => sum + a.confidence, 0);
            user.stats.avgConfidence = Math.round(totalConfidence / history.length);
        }
    }

    // Clear user-specific UI data
    clearUserData() {
        // Reset statistics display
        document.querySelectorAll('.stat-number').forEach((el, index) => {
            const values = ['0', '0', '0', '0%'];
            el.textContent = values[index];
        });
        
        // Clear history container
        const historyContainer = document.querySelector('.history-container');
        if (historyContainer) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #666;">No analysis history available.</p>';
        }
        
        // Clear any analysis results
        const resultsSection = document.querySelector('.results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        // Reset image preview
        const imagePreview = document.querySelector('.image-preview');
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }
    }

    // Generate unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Clear specific user's history
    clearUserHistory() {
        if (!this.currentUser) return;
        
        this.users[this.currentUser].analysisHistory = [];
        this.updateUserStats();
        this.refreshDashboard();
        this.refreshHistory();
    }

    // Refresh dashboard with current user data
    refreshDashboard() {
        if (!this.currentUser) return;
        
        const user = this.users[this.currentUser];
        const stats = user.stats;
        
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length >= 4) {
            statNumbers[0].textContent = stats.totalAnalyses;
            statNumbers[1].textContent = stats.benignResults;
            statNumbers[2].textContent = stats.flaggedResults;
            statNumbers[3].textContent = stats.avgConfidence + '%';
        }
    }

    // Refresh history display
    refreshHistory() {
        if (!this.currentUser) return;
        
        const user = this.users[this.currentUser];
        const historyContainer = document.querySelector('.history-container');
        
        if (!historyContainer) return;
        
        if (user.analysisHistory.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #666;">No analysis history available.</p>';
            return;
        }
        
        historyContainer.innerHTML = user.analysisHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(analysis => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-date">${new Date(analysis.timestamp).toLocaleDateString()}</span>
                        <span class="history-result ${analysis.result.toLowerCase()}">${analysis.result}</span>
                    </div>
                    <div class="history-details">
                        <p><strong>Confidence:</strong> ${analysis.confidence}%</p>
                        <p><strong>Recommendation:</strong> ${analysis.advice}</p>
                        ${analysis.imageName ? `<p><strong>Image:</strong> ${analysis.imageName}</p>` : ''}
                    </div>
                </div>
            `).join('');
    }
}

// Initialize user session
const userSession = new UserSession();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.querySelector('.logout-btn');
const authToggles = document.querySelectorAll('.auth-toggle');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.querySelector('.upload-section');
const imagePreview = document.querySelector('.image-preview');
const analyzeBtn = document.querySelector('.analyze-btn');
const loading = document.querySelector('.loading');
const results = document.querySelector('.results');

// Authentication Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        
        const user = userSession.loginUser(email, password);
        if (user) {
            document.querySelector('.user-name').textContent = user.name;
            showSection('dashboard');
            userSession.refreshDashboard();
            userSession.refreshHistory();
        } else {
            alert('Invalid email or password');
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(signupForm);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };
        
        // Check if user already exists
        const existingUser = Object.values(userSession.users).find(u => u.email === userData.email);
        if (existingUser) {
            alert('User with this email already exists');
            return;
        }
        
        const userId = userSession.createUser(userData);
        userSession.currentUser = userId;
        document.querySelector('.user-name').textContent = userData.name;
        showSection('dashboard');
        userSession.refreshDashboard();
        userSession.refreshHistory();
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        userSession.logoutUser();
        showSection('login');
        document.querySelector('.user-name').textContent = 'User';
    });
}

// Auth toggle functionality
authToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const target = toggle.getAttribute('data-target');
        showSection(target);
    });
});

// Navigation functionality
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (!userSession.getCurrentUser()) {
            showSection('login');
            return;
        }
        
        const section = link.getAttribute('data-section');
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        showSection(section);
    });
});

// Section display function
function showSection(sectionId) {
    pageSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Show/hide navbar based on section
    const navbar = document.querySelector('.navbar');
    if (sectionId === 'login' || sectionId === 'signup') {
        navbar.style.display = 'none';
    } else {
        navbar.style.display = 'flex';
    }
}

// File upload functionality
if (uploadSection && fileInput) {
    uploadSection.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadSection.classList.add('drag-over');
    });
    
    uploadSection.addEventListener('dragleave', () => {
        uploadSection.classList.remove('drag-over');
    });
    
    uploadSection.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSection.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// File selection handler
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = imagePreview.querySelector('.preview-image');
        img.src = e.target.result;
        img.dataset.filename = file.name;
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Remove image functionality
const removeImageBtn = document.querySelector('.remove-image');
if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
        imagePreview.style.display = 'none';
        fileInput.value = '';
        results.style.display = 'none';
    });
}

// Analyze image functionality
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
        if (!userSession.getCurrentUser()) {
            alert('Please login to use this feature');
            return;
        }
        
        const img = imagePreview.querySelector('.preview-image');
        if (!img.src || img.src === '') {
            alert('Please upload an image first');
            return;
        }

        // Show loading
        loading.style.display = 'block';
        results.style.display = 'none';

        // Simulate AI analysis
        setTimeout(() => {
            const analysisResult = simulateAIAnalysis();
            displayResults(analysisResult);
            
            // Add to user's history
            userSession.addAnalysis({
                ...analysisResult,
                imageName: img.dataset.filename
            });
            
            // Refresh dashboard stats
            userSession.refreshDashboard();
            
            loading.style.display = 'none';
        }, 3000);
    });
}

// Simulate AI analysis
function simulateAIAnalysis() {
    const outcomes = [
        { result: 'Benign', confidence: Math.floor(Math.random() * 20) + 75, advice: 'This lesion appears to be benign. Continue regular skin self-examinations and consult a dermatologist if you notice any changes.' },
        { result: 'Suspicious', confidence: Math.floor(Math.random() * 15) + 60, advice: 'This lesion shows some concerning features. Please schedule an appointment with a dermatologist for professional evaluation as soon as possible.' },
        { result: 'Malignant', confidence: Math.floor(Math.random() * 10) + 85, advice: 'This lesion shows features that may indicate malignancy. Please seek immediate medical attention from a qualified dermatologist or oncologist.' }
    ];
    
    return outcomes[Math.floor(Math.random() * outcomes.length)];
}

// Display analysis results
function displayResults(analysis) {
    const resultTitle = results.querySelector('.result-title');
    const resultConfidence = results.querySelector('.result-confidence');
    const resultAdvice = results.querySelector('.result-advice');
    
    resultTitle.innerHTML = `<h3 style="color: ${getResultColor(analysis.result)}">Result: ${analysis.result}</h3>`;
    resultConfidence.innerHTML = `<p><strong>Confidence Level:</strong> ${analysis.confidence}%</p>`;
    resultAdvice.innerHTML = `<p><strong>Recommendation:</strong> ${analysis.advice}</p>`;
    
    results.style.display = 'block';
}

// Get result color
function getResultColor(result) {
    switch(result) {
        case 'Benign': return '#28a745';
        case 'Suspicious': return '#ffc107';
        case 'Malignant': return '#dc3545';
        default: return '#333';
    }
}

// Export history function
// Export history function as PDF
function exportHistory() {
    if (!userSession.getCurrentUser()) {
        alert('Please login to export history');
        return;
    }
    
    const user = userSession.getCurrentUser();
    if (user.analysisHistory.length === 0) {
        alert('No analysis history to export');
        return;
    }
    
    // Create a new PDF document
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147);
    doc.text('SkinGuard AI Analysis Report', 105, 20, { align: 'center' });
    
    // Add user information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Patient Name: ${user.name}`, 14, 30);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 38);
    doc.text(`Total Analyses: ${user.analysisHistory.length}`, 14, 46);
    
    // Add table header
    const headers = [["Date", "Result", "Confidence", "Recommendation"]];
    
    // Prepare data for the table
    const data = user.analysisHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(analysis => [
            new Date(analysis.timestamp).toLocaleDateString(),
            analysis.result,
            `${analysis.confidence}%`,
            analysis.advice
        ]);
    
    // Add the table to the PDF
    doc.autoTable({
        head: headers,
        body: data,
        startY: 60,
        theme: 'grid',
        headStyles: {
            fillColor: [40, 53, 147],
            textColor: 255
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240]
        },
        styles: {
            cellPadding: 3,
            fontSize: 10,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 'auto' }
        }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    // Save the PDF
    doc.save(`SkinGuard_Report_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Clear history function
function clearHistory() {
    if (!userSession.getCurrentUser()) {
        alert('Please login to clear history');
        return;
    }
    
    if (confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
        userSession.clearUserHistory();
        alert('Analysis history cleared successfully');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    showSection('login');
    
    // Add CSS for history items if not present
    if (!document.querySelector('#history-styles')) {
        const style = document.createElement('style');
        style.id = 'history-styles';
        style.textContent = `
            .history-item {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border-left: 4px solid #007bff;
            }
            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .history-date {
                font-weight: bold;
                color: #333;
            }
            .history-result {
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .history-result.benign {
                background: #d4edda;
                color: #155724;
            }
            .history-result.suspicious {
                background: #fff3cd;
                color: #856404;
            }
            .history-result.malignant {
                background: #f8d7da;
                color: #721c24;
            }
            .history-details p {
                margin: 5px 0;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }
});