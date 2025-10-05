import { signInWithGoogle, signOutUser, onAuthStateChange, getAllUsers, checkInUser, getCurrentUser, isUserAdmin, handleRedirectResult } from './firebase.js';

const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const userInfo = document.getElementById('userInfo');
const adminDashboard = document.getElementById('adminDashboard');
const googleSignInBtn = document.getElementById('googleSignIn');
const authStatus = document.getElementById('authStatus');
const signOutBtn = document.getElementById('signOut');
const refreshDataBtn = document.getElementById('refreshData');
const searchInput = document.getElementById('searchInput');
const userList = document.getElementById('userList');

const totalUsersEl = document.getElementById('totalUsers');
const checkedInUsersEl = document.getElementById('checkedInUsers');
const pendingUsersEl = document.getElementById('pendingUsers');
const checkinRateEl = document.getElementById('checkinRate');

let allUsers = [];
let isAdmin = false;

googleSignInBtn.addEventListener('click', handleGoogleSignIn);
signOutBtn.addEventListener('click', handleSignOut);
refreshDataBtn.addEventListener('click', loadUserData);
searchInput.addEventListener('input', filterUsers);

init();

function setAuthStatus(msg, type = 'info') {
    if (!authStatus) return;
    authStatus.textContent = msg;
    authStatus.style.color = type === 'error' ? '#dc3545' : (type === 'warn' ? '#d58512' : '#0d7c8c');
}

function init() {
    // Attempt to process any redirect result first
    handleRedirectResult();
    setAuthStatus('Ready to sign in');
    onAuthStateChange(async (user) => {
        if (user) {
            setAuthStatus('Signed in');
            loginSection.style.display = 'none';
            dashboard.style.display = 'block';
            isAdmin = await isUserAdmin();
            userInfo.innerHTML = `<h4>Welcome, ${user.displayName || user.email}</h4><p>Email: ${user.email}</p><p>Role: ${isAdmin ? 'Admin' : 'User'}</p>`;
            if (isAdmin) { adminDashboard.classList.remove('hidden'); }
            await loadUserData();
        } else {
            setAuthStatus('Not signed in');
            loginSection.style.display = 'block';
            dashboard.style.display = 'none';
        }
    });
}

async function handleGoogleSignIn() {
    try {
        if (googleSignInBtn) {
            googleSignInBtn.disabled = true;
            googleSignInBtn.textContent = 'Signing in...';
        }
        setAuthStatus('Attempting sign-in...');
        await signInWithGoogle();
    } catch (error) {
        console.error('Sign in error:', error);
        setAuthStatus('Sign-in failed: ' + (error.message || 'Unknown error'), 'error');
        alert('Failed to sign in: ' + error.message);
    } finally {
        if (googleSignInBtn) {
            googleSignInBtn.disabled = false;
            googleSignInBtn.textContent = 'Sign in with Google';
        }
    }
}

async function handleSignOut() {
    try {
        await signOutUser();
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

async function loadUserData() {
    try {
        allUsers = await getAllUsers();
        if (isAdmin) { updateStatistics(); }
        displayUsers(allUsers);
    } catch (error) {
        console.error('Load data error:', error);
        alert('Failed to load user data. Please refresh the page.');
    }
}

function updateStatistics() {
    const total = allUsers.length;
    const checkedIn = allUsers.filter(user => user.checkedIn).length;
    const pending = total - checkedIn;
    const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    totalUsersEl.textContent = total;
    checkedInUsersEl.textContent = checkedIn;
    pendingUsersEl.textContent = pending;
    checkinRateEl.textContent = `${rate}%`;
}

function displayUsers(users) {
    userList.innerHTML = '';
    if (users.length === 0) {
        userList.innerHTML = '<div class="user-item">No users found</div>';
        return;
    }
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user.checkedIn ? 'checked-in' : ''}`;
        userItem.innerHTML = `<div><strong>${user.name || user.email}</strong><br><small>${user.email}</small></div><button class="checkin-btn" onclick="handleCheckIn('${user.id}')" ${user.checkedIn ? 'disabled' : ''}>${user.checkedIn ? 'Checked In ✓' : 'Check In'}</button>`;
        userList.appendChild(userItem);
    });
}

function filterUsers() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.id && user.id.toLowerCase().includes(searchTerm))
    );
    displayUsers(filteredUsers);
}

window.handleCheckIn = async function(userId) {
    try {
        await checkInUser(userId);
        const userIndex = allUsers.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            allUsers[userIndex].checkedIn = true;
            allUsers[userIndex].checkedInAt = new Date();
        }
        displayUsers(allUsers);
        if (isAdmin) { updateStatistics(); }
        alert('User checked in successfully!');
    } catch (error) {
        console.error('Check in error:', error);
        alert('Failed to check in user: ' + error.message);
    }
};
