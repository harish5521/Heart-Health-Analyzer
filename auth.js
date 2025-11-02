
// auth.js - Complete Working Version with Delete Account Functionality

// Clear login fields function (at top of file)
function clearLoginFields() {
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    if (usernameField) usernameField.value = '';
    if (passwordField) passwordField.value = '';
    
    setTimeout(() => {
        if (usernameField) usernameField.value = '';
        if (passwordField) passwordField.value = '';
    }, 50);
}

document.addEventListener('DOMContentLoaded', function() {
    clearLoginFields();
    initializeTheme();
    setupThemeToggle();
    enforceBlankFields();

    // Login handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                const usernameOrEmail = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                let email = usernameOrEmail;
                
                // If input looks like a username (no @), try to find the associated email
                if (!usernameOrEmail.includes('@')) {
                    try {
                        // Check if user document exists with this username
                        const usersRef = db.collection('users');
                        const querySnapshot = await usersRef.where('username', '==', usernameOrEmail).limit(1).get();
                        
                        if (!querySnapshot.empty) {
                            const userData = querySnapshot.docs[0].data();
                            email = userData.email;
                        } else {
                            throw new Error('Invalid username or password');
                        }
                    } catch (queryError) {
                        // If database query fails due to permissions, provide helpful message
                        if (queryError.message.includes('permission')) {
                            throw new Error('Please sign in using your registered email address or contact support');
                        }
                        throw queryError;
                    }
                }
                
                // Sign in with email
                await auth.signInWithEmailAndPassword(email, password);
                window.location.href = 'main.html';
            } catch (error) {
                showErrorToast(getAuthErrorMessage(error));
                clearLoginFields();
            }
        });
    }

    // Permanent field clearing solution
    function enforceBlankFields() {
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        
        if (username) {
            username.value = '';
            username.setAttribute('autocomplete', 'new-username');
            username.setAttribute('readonly', true);
            username.addEventListener('focus', () => {
                username.removeAttribute('readonly');
            });
        }
        
        if (password) {
            password.value = '';
            password.setAttribute('autocomplete', 'new-password');
            password.setAttribute('readonly', true);
            password.addEventListener('focus', () => {
                password.removeAttribute('readonly');
            });
        }
    
        let interval = setInterval(() => {
            if (username) username.value = '';
            if (password) password.value = '';
        }, 100);
        
        setTimeout(() => clearInterval(interval), 2000);
    }

    // Theme Management Functions
    function initializeTheme() {
        // Default to light mode if no preference exists
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${savedTheme}-mode`);
        updateThemeButton(savedTheme);
    }

    function updateThemeButton(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            if (theme === 'dark') {
                themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i> Light Mode';
                themeToggle.classList.remove('btn-outline-light');
                themeToggle.classList.add('btn-light');
            } else {
                themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i> Dark Mode';
                themeToggle.classList.remove('btn-light');
                themeToggle.classList.add('btn-outline-light');
            }
        }
    }

    function setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('dark-mode');
                const newTheme = isDark ? 'light' : 'dark';
                
                document.body.classList.remove(isDark ? 'dark-mode' : 'light-mode');
                document.body.classList.add(`${newTheme}-mode`);
                
                updateThemeButton(newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    // Forgot Password Link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
            document.getElementById('forgotPasswordForm').reset();
            forgotPasswordModal.show();
        });
    }

    // Forgot Password Form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value;
            
            try {
                // Send password reset email directly (Firebase will silently fail for non-existent emails for security)
                await auth.sendPasswordResetEmail(email);
                showSuccessToast('If an account exists with this email, you will receive a password reset link');
                const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                modal.hide();
            } catch (error) {
                showErrorToast(getAuthErrorMessage(error));
            }
        });
    }

    // Create Account Link
    const createAccountLink = document.getElementById('createAccountLink');
    if (createAccountLink) {
        createAccountLink.addEventListener('click', function(e) {
            e.preventDefault();
            const createAccountModal = new bootstrap.Modal(document.getElementById('createAccountModal'));
            document.getElementById('registerForm').reset();
            createAccountModal.show();
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showErrorToast("Passwords do not match!");
                return;
            }
            
            try {
                // Try to create user with Firebase Auth first (this validates email isn't already registered)
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // Check if username already exists (do this after auth creation for better UX)
                try {
                    const usernameCheck = await db.collection('users').where('username', '==', username).limit(1).get();
                    if (!usernameCheck.empty) {
                        // Username exists, delete the created auth account and throw error
                        await userCredential.user.delete();
                        throw new Error('Username already exists');
                    }
                } catch (usernameCheckError) {
                    // If username check fails due to permissions, continue anyway (safer path)
                    if (!usernameCheckError.message.includes('Username already exists')) {
                        console.warn('Could not verify username availability:', usernameCheckError);
                    }
                }
                
                // Save user data to Firestore
                await db.collection('users').doc(userCredential.user.uid).set({
                    username: username,
                    email: email,
                    age: document.getElementById('regAge').value,
                    gender: document.querySelector('input[name="regGender"]:checked').value,
                    diabetes: document.getElementById('regDiabetes').checked,
                    kidneyDisease: document.getElementById('regKidneyDisease').checked,
                    familyHistory: document.getElementById('regFamilyHistory').checked,
                    heartCondition: document.getElementById('regHeartCondition').checked,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showSuccessToast('Account created successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
                modal.hide();
            } catch (error) {
                showErrorToast(getAuthErrorMessage(error));
            }
        });
    }

    // Logout Link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await auth.signOut();
                // Reset to light mode on logout
                localStorage.setItem('theme', 'light');
                window.location.href = 'index.html';
            } catch (error) {
                showErrorToast('Error signing out: ' + error.message);
            }
        });
    }

    // UPDATE PROFILE FUNCTIONALITY
    const updateProfileLink = document.getElementById('updateProfileLink');
    if (updateProfileLink) {
        updateProfileLink.addEventListener('click', async function(e) {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) {
                showErrorToast('Please login to update profile');
                return;
            }
            
            try {
                // Show loading state
                updateProfileLink.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
                
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    throw new Error('User profile not found');
                }
                
                const userData = userDoc.data();
                
                // Populate form fields
                document.getElementById('updateUsername').value = userData.username || '';
                document.getElementById('updateEmail').value = user.email || '';
                document.getElementById('updateAge').value = userData.age || '';
                
                // Set gender radio button
                const genderRadios = document.getElementsByName('updateGender');
                for (let radio of genderRadios) {
                    if (radio.value === userData.gender) {
                        radio.checked = true;
                        break;
                    }
                }
                
                // Set checkboxes
                document.getElementById('updateDiabetes').checked = userData.diabetes || false;
                document.getElementById('updateKidneyDisease').checked = userData.kidneyDisease || false;
                document.getElementById('updateFamilyHistory').checked = userData.familyHistory || false;
                document.getElementById('updateHeartCondition').checked = userData.heartCondition || false;
                
                // Clear password fields
                document.getElementById('updatePassword').value = '';
                document.getElementById('updateConfirmPassword').value = '';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('updateProfileModal'));
                modal.show();
                
            } catch (error) {
                showErrorToast('Error loading profile: ' + error.message);
            } finally {
                updateProfileLink.innerHTML = 'Update Profile';
            }
        });
    }

    // UPDATE PROFILE FORM SUBMISSION
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
                
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('User not authenticated');
                }
                
                // Get form values
                const newPassword = document.getElementById('updatePassword').value;
                const confirmPassword = document.getElementById('updateConfirmPassword').value;
                const username = document.getElementById('updateUsername').value;
                const age = document.getElementById('updateAge').value;
                const gender = document.querySelector('input[name="updateGender"]:checked').value;
                const diabetes = document.getElementById('updateDiabetes').checked;
                const kidneyDisease = document.getElementById('updateKidneyDisease').checked;
                const familyHistory = document.getElementById('updateFamilyHistory').checked;
                const heartCondition = document.getElementById('updateHeartCondition').checked;
                
                // Validate passwords if provided
                if (newPassword || confirmPassword) {
                    if (newPassword !== confirmPassword) {
                        throw new Error('Passwords do not match');
                    }
                    if (newPassword.length < 6) {
                        throw new Error('Password must be at least 6 characters');
                    }
                }
                
                // Update password if provided
                if (newPassword) {
                    await user.updatePassword(newPassword);
                }
                
                // Update profile data
                await db.collection('users').doc(user.uid).update({
                    username: username,
                    age: age,
                    gender: gender,
                    diabetes: diabetes,
                    kidneyDisease: kidneyDisease,
                    familyHistory: familyHistory,
                    heartCondition: heartCondition,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Show success and close modal
                showSuccessToast('Profile updated successfully!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('updateProfileModal'));
                modal.hide();
                
            } catch (error) {
                console.error('Update error:', error);
                showErrorToast(error.message || 'Failed to update profile');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // DELETE ACCOUNT FUNCTIONALITY
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to permanently delete your account? All your data will be lost!')) {
                return;
            }
            
            const user = auth.currentUser;
            if (!user) {
                showErrorToast('No user logged in');
                return;
            }
            
            try {
                // Delete user data first
                await db.collection('users').doc(user.uid).delete();
                
                // Delete all health history
                const historySnapshot = await db.collection('healthHistory')
                    .where('userId', '==', user.uid)
                    .get();
                
                const batch = db.batch();
                historySnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                // Delete the auth user
                await user.delete();
                
                showSuccessToast('Account deleted successfully. We\'re sorry to see you go!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error deleting account:', error);
                showErrorToast('Error deleting account: ' + error.message);
            }
        });
    }

    // Helper functions
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
});
