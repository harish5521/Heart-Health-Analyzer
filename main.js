
document.addEventListener('DOMContentLoaded', function() {
    const healthForm = document.getElementById('healthForm');
    const resultsCard = document.getElementById('resultsCard');
    const healthResults = document.getElementById('healthResults');
    const saveResultsBtn = document.getElementById('saveResultsBtn');
    const historyLink = document.getElementById('historyLink');
    // Add event delegation for individual clear buttons
document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('clear-entry-btn')) {
        const entryId = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this history entry?')) {
            try {
                await db.collection('healthHistory').doc(entryId).delete();
                const user = auth.currentUser;
                const history = await getHealthHistory(user.uid);
                populateHistoryTable(history);
                showSuccessToast('History entry deleted successfully');
            } catch (error) {
                showErrorToast('Error deleting entry: ' + error.message);
            }
        }
    }
});

// Add clear all history functionality
const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete ALL your history? This cannot be undone!')) {
            try {
                const user = auth.currentUser;
                const historySnapshot = await db.collection('healthHistory')
                    .where('userId', '==', user.uid)
                    .get();
                
                const batch = db.batch();
                historySnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                
                // Refresh the history display
                const history = await getHealthHistory(user.uid);
                populateHistoryTable(history);
                showSuccessToast('All history cleared successfully');
            } catch (error) {
                showErrorToast('Error clearing history: ' + error.message);
            }
        }
    });
}
// Add this function to main.js
function triggerHeartbeatAnimation() {
    const heartbeat = document.createElement('div');
    heartbeat.className = 'heartbeat-animation';
    document.body.appendChild(heartbeat);
    
    // Remove the element after animation completes
    setTimeout(() => {
        heartbeat.remove();
    }, 2000);
}
    // Clear any previous results and reset form on page load
    clearResults();

    function clearResults() {
        healthResults.innerHTML = '';
        resultsCard.style.display = 'none';
        saveResultsBtn.style.display = 'none';
        resetForm();
    }

    // Reset form function
    function resetForm() {
        if (healthForm) {
            healthForm.reset();
        }
    }

    // History Link functionality
    if (historyLink) {
        historyLink.addEventListener('click', async function(e) {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) {
                showErrorToast('Please login to view history');
                return;
            }
            
            const historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
            try {
                const history = await getHealthHistory(user.uid);
                const historyEmptyMessage = document.getElementById('historyEmptyMessage');
                const historyList = document.getElementById('historyList');
                
                if (history.length > 0) {
                    historyEmptyMessage.style.display = 'none';
                    populateHistoryTable(history);
                    historyList.style.display = 'block';
                } else {
                    historyEmptyMessage.style.display = 'block';
                    historyList.style.display = 'none';
                }
                historyModal.show();
            } catch (error) {
                showErrorToast('Error loading history: ' + error.message);
            }
        });
    }

// Add this function to create the chart
function createHealthTrendChart(history) {
    // Sort by date (oldest first for the chart)
    const sortedHistory = [...history].sort((a, b) => a.date - b.date);
    
    const ctx = document.getElementById('healthTrendChart').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedHistory.map(item => item.formattedDate),
            datasets: [{
                label: 'Risk Score',
                data: sortedHistory.map(item => item.riskScore),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Risk Score'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = sortedHistory[context.dataIndex];
                            return [
                                `Score: ${item.riskScore}`,
                                `Level: ${item.riskLevel}`,
                                `Date: ${item.formattedDate}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Modify the populateHistoryTable function
function populateHistoryTable(history) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    // Create the chart first (existing code)
    createHealthTrendChart(history);
    
    // Then populate the list with clear buttons
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `list-group-item ${getRiskClass(item.riskScore)}`;
        historyItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${item.riskLevel} (Score: ${item.riskScore})</h5>
                <div>
                    <small class="me-3">${item.formattedDate}</small>
                    <button class="btn btn-sm btn-outline-danger clear-entry-btn" data-id="${item.id}">Clear</button>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Chest Pain:</strong> ${item.chestPain === 'yes' ? 'Yes' : 'No'}</p>
                    <p class="mb-1"><strong>Sleep:</strong> ${item.sleepHours} hrs</p>
                    <p class="mb-1"><strong>Activity:</strong> ${item.activityLevel}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Diet:</strong> ${item.dietQuality}</p>
                    <p class="mb-1"><strong>Weight:</strong> ${item.currentWeight} kg</p>
                    <p class="mb-1"><strong>Exercise:</strong> ${item.gym === 'yes' ? 'Yes' : 'No'}</p>
                </div>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}    function getRiskClass(score) {
        if (score >= 70) return 'risk-high';
        if (score >= 40) return 'risk-medium';
        if (score >= 20) return 'risk-low';
        return 'risk-info';
    }

    const getHealthHistory = async (userId) => {
        try {
            const snapshot = await db.collection('healthHistory')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            const history = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                history.push({
                    id: doc.id,
                    date: data.timestamp.toDate(),
                    formattedDate: data.timestamp.toDate().toLocaleDateString(),
                    riskScore: data.riskScore,
                    riskLevel: data.riskLevel,
                    chestPain: data.chestPain,
                    sleepHours: data.sleepHours,
                    workHours: data.workHours,
                    activityLevel: data.activityLevel,
                    dietQuality: data.dietQuality,
                    currentWeight: data.currentWeight,
                    streetFood: data.streetFood,
                    gym: data.gym,
                    sweetConsumption: data.sweetConsumption,
                    smoke: data.smoke,
                    alcohol: data.alcohol
                });
            });
            return history;
        } catch (error) {
            console.error("Error fetching health history:", error);
            throw error;
        }
    };

    const calculateRiskScore = (data) => {
        let score = 0;
        if (data.chestPain === 'yes') score += 30;
        if (data.sleepHours < 6) score += 10;
        if (data.workHours > 10) score += 5;
        if (data.activityLevel === 'sedentary') score += 15;
        else if (data.activityLevel === 'light') score += 5;
        if (data.dietQuality === 'poor') score += 20;
        else if (data.dietQuality === 'average') score += 10;
        if (data.streetFood > 3) score += data.streetFood * 2;
        if (data.sweetConsumption === 'often' || data.sweetConsumption === 'very_often') score += 10;
        else if (data.sweetConsumption === 'sometimes') score += 5;
        if (data.smoke === 'yes') score += 25;
        if (data.alcohol === 'yes') score += 10;
        return score;
    };

    if (healthForm) {
        healthForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            try {
                const chestPain = document.querySelector('input[name="chestPain"]:checked').value;
                const sleepHours = parseInt(document.getElementById('sleepHours').value);
                const workHours = parseInt(document.getElementById('workHours').value);
                const activityLevel = document.getElementById('activityLevel').value;
                const dietQuality = document.getElementById('dietQuality').value;
                const currentWeight = parseFloat(document.getElementById('currentWeight').value);
                const streetFood = parseInt(document.getElementById('streetFood').value);
                const gym = document.querySelector('input[name="gym"]:checked').value;
                const sweetConsumption = document.getElementById('sweetConsumption').value;
                const smoke = document.querySelector('input[name="smoke"]:checked').value;
                const alcohol = document.querySelector('input[name="alcohol"]:checked').value;
                
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const analysisResult = analyzeHealthData(
                    chestPain, sleepHours, workHours, activityLevel, 
                    dietQuality, currentWeight, streetFood, gym, 
                    sweetConsumption, smoke, alcohol
                );
                // Add this line before displayResults() call
triggerHeartbeatAnimation();
displayResults(analysisResult, { /* existing code */ });
                displayResults(analysisResult, {
                    chestPain, sleepHours, workHours, activityLevel, 
                    dietQuality, currentWeight, streetFood, gym, 
                    sweetConsumption, smoke, alcohol
                });
                
                // Show save button
                saveResultsBtn.style.display = 'block';
                
            } catch (error) {
                console.error('Error:', error);
                showErrorToast(error.message || 'Error processing your request. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Save Results Button
    if (saveResultsBtn) {
        saveResultsBtn.addEventListener('click', async function() {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');
                
                const healthData = {
                    chestPain: document.querySelector('input[name="chestPain"]:checked').value,
                    sleepHours: parseInt(document.getElementById('sleepHours').value),
                    workHours: parseInt(document.getElementById('workHours').value),
                    activityLevel: document.getElementById('activityLevel').value,
                    dietQuality: document.getElementById('dietQuality').value,
                    currentWeight: parseFloat(document.getElementById('currentWeight').value),
                    streetFood: parseInt(document.getElementById('streetFood').value),
                    gym: document.querySelector('input[name="gym"]:checked').value,
                    sweetConsumption: document.getElementById('sweetConsumption').value,
                    smoke: document.querySelector('input[name="smoke"]:checked').value,
                    alcohol: document.querySelector('input[name="alcohol"]:checked').value
                };
                
                const riskScore = calculateRiskScore(healthData);
                const riskLevel = getRiskLevel(riskScore);
                
                await db.collection('healthHistory').add({
                    userId: user.uid,
                    ...healthData,
                    riskScore: riskScore,
                    riskLevel: riskLevel,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showSuccessToast('Results saved successfully!');
                saveResultsBtn.style.display = 'none';
            } catch (error) {
                showErrorToast('Error saving results: ' + error.message);
            }
        });
    }
// Add this line before displayResults() call
//triggerHeartbeatAnimation();
//displayResults(analysisResult, { /* existing code */ });
    function displayResults(analysisResult, userInputs) {
        let resultsHTML = `
            <h4 class="${analysisResult.riskClass}">Your Heart Health Assessment: <strong>${analysisResult.riskLevel}</strong></h4>
            <p>Based on your inputs, here's your heart health analysis:</p>
            
            <h5 class="mt-4">Your Input Data:</h5>
            <div class="row">
                <div class="col-md-6">
                    <ul class="list-group mb-3">
                        <li class="list-group-item"><strong>Chest Pain:</strong> ${userInputs.chestPain === 'yes' ? 'Yes' : 'No'}</li>
                        <li class="list-group-item"><strong>Sleep Hours:</strong> ${userInputs.sleepHours} hours</li>
                        <li class="list-group-item"><strong>Work Hours:</strong> ${userInputs.workHours} hours</li>
                        <li class="list-group-item"><strong>Activity Level:</strong> ${userInputs.activityLevel}</li>
                        <li class="list-group-item"><strong>Diet Quality:</strong> ${userInputs.dietQuality}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <ul class="list-group mb-3">
                        <li class="list-group-item"><strong>Current Weight:</strong> ${userInputs.currentWeight} kg</li>
                        <li class="list-group-item"><strong>Street Food:</strong> ${userInputs.streetFood} times/week</li>
                        <li class="list-group-item"><strong>Gym:</strong> ${userInputs.gym === 'yes' ? 'Yes' : 'No'}</li>
                        <li class="list-group-item"><strong>Sweet Consumption:</strong> ${userInputs.sweetConsumption}</li>
                        <li class="list-group-item"><strong>Smoke:</strong> ${userInputs.smoke === 'yes' ? 'Yes' : 'No'}</li>
                        <li class="list-group-item"><strong>Alcohol:</strong> ${userInputs.alcohol === 'yes' ? 'Yes' : 'No'}</li>
                    </ul>
                </div>
            </div>
            
            <h5 class="mt-4">Risk Factors:</h5>
            <ul class="list-group mb-3">
                ${analysisResult.riskFactors.map(factor => `<li class="list-group-item">${factor}</li>`).join('')}
            </ul>
            
            <h5 class="mt-4">Positive Factors:</h5>
            <ul class="list-group mb-3">
                ${analysisResult.positiveFactors.map(factor => `<li class="list-group-item">${factor}</li>`).join('')}
            </ul>
            
            <h5 class="mt-4">Recommendations:</h5>
            <ul class="list-group mb-3">
                ${analysisResult.recommendations.map(rec => `<li class="list-group-item">${rec}</li>`).join('')}
            </ul>
            
            <div class="alert alert-info mt-4">
                <strong>Note:</strong> This assessment is for informational purposes only and is not a substitute for professional medical advice.
            </div>
        `;
        
        healthResults.innerHTML = resultsHTML;
        resultsCard.style.display = 'block';
        
        window.scrollTo({
            top: resultsCard.offsetTop - 20,
            behavior: 'smooth'
        });
    }

    function getRiskLevel(score) {
        if (score >= 70) return 'High Risk';
        if (score >= 40) return 'Medium Risk';
        if (score >= 20) return 'Low Risk';
        return 'Very Low Risk';
    }

    function analyzeHealthData(chestPain, sleepHours, workHours, activityLevel, dietQuality, currentWeight, streetFood, gym, sweetConsumption, smoke, alcohol) {
        const result = {
            riskScore: 0,
            riskLevel: '',
            riskClass: '',
            riskFactors: [],
            positiveFactors: [],
            recommendations: []
        };
        
        if (chestPain === 'yes') {
            result.riskScore += 30;
            result.riskFactors.push('Chest pain is a serious symptom that should be evaluated by a healthcare professional immediately.');
            result.recommendations.push('Seek immediate medical attention for your chest pain.');
        }
        
        if (sleepHours < 6) {
            result.riskScore += 10;
            result.riskFactors.push(`Getting only ${sleepHours} hours of sleep per night can increase heart disease risk.`);
            result.recommendations.push('Aim for 7-9 hours of sleep per night to support heart health.');
        } else if (sleepHours >= 7 && sleepHours <= 9) {
            result.positiveFactors.push(`Your sleep duration of ${sleepHours} hours is in the healthy range.`);
        }
        
        if (workHours > 10) {
            result.riskScore += 5;
            result.riskFactors.push(`Working ${workHours} hours per day may contribute to stress, which can impact heart health.`);
        }
        
        if (activityLevel === 'sedentary') {
            result.riskScore += 15;
            result.riskFactors.push('A sedentary lifestyle significantly increases heart disease risk.');
            result.recommendations.push('Try to incorporate at least 150 minutes of moderate exercise per week.');
        } else if (activityLevel === 'light') {
            result.riskScore += 5;
            result.riskFactors.push('Consider increasing your physical activity for better heart health.');
            result.recommendations.push('Try to incorporate at least 150 minutes of moderate exercise per week.');
        } else if (activityLevel === 'moderate' || activityLevel === 'active') {
            result.positiveFactors.push('Your physical activity level is good for heart health.');
        }
        
        if (dietQuality === 'poor') {
            result.riskScore += 20;
            result.riskFactors.push('A poor diet is a major risk factor for heart disease.');
            result.recommendations.push('Consider improving your diet with more fruits, vegetables, whole grains, and lean proteins.');
        } else if (dietQuality === 'average') {
            result.riskScore += 10;
            result.riskFactors.push('Improving your diet could benefit your heart health.');
            result.recommendations.push('Consider improving your diet with more fruits, vegetables, whole grains, and lean proteins.');
        } else if (dietQuality === 'good' || dietQuality === 'excellent') {
            result.positiveFactors.push('Your diet is supporting good heart health.');
        }
        
        if (streetFood > 3) {
            result.riskScore += streetFood * 2;
            result.riskFactors.push(`Eating street food ${streetFood} times per week may expose you to unhealthy fats and excess sodium.`);
            result.recommendations.push('Reduce street food consumption and opt for home-cooked meals when possible.');
        }
        
        if (gym === 'yes') {
            result.positiveFactors.push('Regular gym attendance is beneficial for cardiovascular health.');
        }
        
        if (sweetConsumption === 'often' || sweetConsumption === 'very_often') {
            result.riskScore += 10;
            result.riskFactors.push('Frequent sweet consumption can contribute to obesity and diabetes risk.');
            result.recommendations.push('Reduce sugar intake to improve heart health.');
        } else if (sweetConsumption === 'sometimes') {
            result.riskScore += 5;
        }
        
        if (smoke === 'yes') {
            result.riskScore += 25;
            result.riskFactors.push('Smoking is one of the most significant risk factors for heart disease.');
            result.recommendations.push('Quitting smoking is one of the best things you can do for your heart health.');
        }
        
        if (alcohol === 'yes') {
            result.riskScore += 10;
            result.riskFactors.push('Excessive alcohol consumption can negatively impact heart health.');
            result.recommendations.push('Limit alcohol consumption to moderate levels (1 drink/day for women, 2 for men).');
        }
        
        const user = auth.currentUser;
        if (user) {
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        
                        if (userData.diabetes) result.riskScore += 20;
                        if (userData.kidneyDisease) result.riskScore += 15;
                        if (userData.familyHistory) result.riskScore += 10;
                        if (userData.heartCondition) result.riskScore += 25;
                        if (userData.age > 45) result.riskScore += 5;
                        else if (userData.age > 60) result.riskScore += 10;
                    }
                })
                .catch(error => {
                    console.error('Error getting user data:', error);
                });
        }
        
        result.riskLevel = getRiskLevel(result.riskScore);
        result.riskClass = getRiskClass(result.riskScore);
        
        return result;
    }

    function showErrorToast(message) {
        const toastEl = document.getElementById('errorToast');
        if (toastEl) {
            const toastBody = toastEl.querySelector('.toast-body');
            toastBody.textContent = message;
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        } else {
            alert(message);
        }
    }
});

// Helper functions for auth functionality
function showSuccessToast(message) {
    const toastEl = document.getElementById('updateSuccessToast');
    if (toastEl) {
        const toastBody = toastEl.querySelector('.toast-body');
        toastBody.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        alert(message);
    }
}

function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/user-disabled': return 'This account has been disabled.';
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Invalid Credentials';
        case 'auth/invalid-login-credentials': return 'Invalid Credentials';
        case 'auth/email-already-in-use': return 'This email is already registered.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        default: return error.message || 'Invalid Credentials';
    }
}
// Video background control
document.addEventListener('visibilitychange', function() {
    const video = document.getElementById('bg-video');
    if (document.hidden) {
        video.pause();
    } else {
        video.play();
    }
});
// Force play on mobile (add to main.js)
function attemptVideoPlay() {
    const video = document.getElementById('bg-video');
    video.play().catch(e => {
        console.warn("Autoplay prevented:", e);
        // Show play button for mobile
        const playButton = document.createElement('button');
        playButton.innerHTML = '▶ Play Background';
        playButton.className = 'btn btn-sm btn-secondary position-fixed bottom-0 end-0 m-3';
        playButton.onclick = () => {
            video.play();
            playButton.remove();
        };
        document.body.appendChild(playButton);
    });
}

window.addEventListener('load', attemptVideoPlay);
// Add this to main.js to test video loading
document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('bg-video');
    video.onerror = function() {
        console.error("Video failed to load. Check path:", video.currentSrc);
    };
    video.oncanplay = function() {
        console.log("Video loaded successfully");
    };
});
// In your card creation code (main.js)
document.querySelectorAll('.card').forEach((card, index) => {
    card.style.setProperty('--order', index);
});
