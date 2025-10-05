import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let currentUserRole = null;

// Sign in with Google
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Create or update user in members collection
        await createOrUpdateMember(user);
        
        return user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}

// Create or update member in Firestore
async function createOrUpdateMember(user) {
    const memberRef = doc(db, 'members', user.uid);
    const memberDoc = await getDoc(memberRef);
    
    // Check if there's a pre-registered entry by email
    const emailDocId = user.email.replace('@', '_at_').replace(/\./g, '_');
    const emailMemberRef = doc(db, 'members', emailDocId);
    const emailMemberDoc = await getDoc(emailMemberRef);
    
    let role = 'user'; // Default role
    
    // If pre-registered by email, use that role
    if (emailMemberDoc.exists()) {
        role = emailMemberDoc.data().role || 'user';
    }
    
    if (!memberDoc.exists()) {
        // New member - create with appropriate role
        await setDoc(memberRef, {
            uid: user.uid,
            email: user.email,
            name: user.displayName || '',
            photoURL: user.photoURL || '',
            role: role,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            checkedIn: false,
            checkedInAt: null
        });
    } else {
        // Existing member - update last login
        await updateDoc(memberRef, {
            lastLogin: serverTimestamp(),
            name: user.displayName || memberDoc.data().name,
            photoURL: user.photoURL || memberDoc.data().photoURL
        });
    }
}

// Sign out
export async function signOutUser() {
    try {
        await signOut(auth);
        currentUser = null;
        currentUserRole = null;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

// Auth state change listener
export function onAuthStateChange(callback) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            // Get user role from members collection
            const memberRef = doc(db, 'members', user.uid);
            const memberDoc = await getDoc(memberRef);
            if (memberDoc.exists()) {
                currentUserRole = memberDoc.data().role;
            }
        } else {
            currentUserRole = null;
        }
        callback(user);
    });
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Check if current user is admin
export async function isUserAdmin() {
    if (!currentUser) return false;
    
    try {
        const memberRef = doc(db, 'members', currentUser.uid);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
            const role = memberDoc.data().role;
            return role === 'admin';
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Get all users (admin only)
export async function getAllUsers() {
    try {
        const membersRef = collection(db, 'members');
        const snapshot = await getDocs(membersRef);
        
        const users = [];
        snapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return users;
    } catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
}

// Check in a user
export async function checkInUser(userId) {
    try {
        const memberRef = doc(db, 'members', userId);
        await updateDoc(memberRef, {
            checkedIn: true,
            checkedInAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error checking in user:', error);
        throw error;
    }
}

// Update user role (admin only)
export async function updateUserRole(userId, newRole) {
    try {
        const memberRef = doc(db, 'members', userId);
        await updateDoc(memberRef, {
            role: newRole,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
}
