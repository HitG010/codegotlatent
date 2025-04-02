// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-MmyMtGexSNIhkAUoZawVBh9ntL7kryY",
  authDomain: "code-got-latent.firebaseapp.com",
  projectId: "code-got-latent",
  storageBucket: "code-got-latent.firebasestorage.app",
  messagingSenderId: "32823906442",
  appId: "1:32823906442:web:0f17e7770109c6415e1d73",
  measurementId: "G-6RTT49KEP8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app as firebaseApp };