// Script to add admin users to Firestore
// Run this once to set up initial admins

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdmins() {
    const admins = [
        {
            email: 'andrewpcarlson85@gmail.com',
            name: 'Andrew Carlson',
            role: 'admin'
        },
        {
            email: 'savannahbcarlson@gmail.com',
            name: 'Savannah Carlson',
            role: 'admin'
        }
    ];

    console.log('Adding admins to Firestore...');

    for (const admin of admins) {
        // Use email as temporary ID (will be updated when they first sign in)
        const docId = admin.email.replace('@', '_at_').replace(/\./g, '_');
        const memberRef = doc(db, 'members', docId);
        
        try {
            await setDoc(memberRef, {
                email: admin.email,
                name: admin.name,
                role: admin.role,
                createdAt: serverTimestamp(),
                checkedIn: false,
                checkedInAt: null,
                isPreRegistered: true
            });
            console.log(`✓ Added ${admin.name} (${admin.email}) as admin`);
        } catch (error) {
            console.error(`✗ Error adding ${admin.email}:`, error);
        }
    }

    console.log('\nAdmins added successfully!');
    console.log('They will need to sign in once to link their Google account.');
}

// Run the script
addAdmins().catch(console.error);
