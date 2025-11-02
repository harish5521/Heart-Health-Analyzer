
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwQAHW8FRYYmStv-70L__PVMWWceGtw20",
    authDomain: "heart22341.firebaseapp.com",
    projectId: "heart22341",
    storageBucket: "heart22341.appspot.com",
    messagingSenderId: "218972963235",
    appId: "1:218972963235:web:2d272e785c0716ab499a16",
    measurementId: "G-6QMGR3LX31"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize EmailJS
emailjs.init("7Wp8V9RZsRK1OuWTd");