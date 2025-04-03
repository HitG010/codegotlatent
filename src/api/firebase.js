import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import axios from "axios";
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
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);

const handleGoogleSignUp = async () => {
    // Using a popup.
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    signInWithPopup(auth, provider).then(async function(result) {
        // This gives you a Google Access Token.
        const token = result.user.accessToken;
        // The signed-in user info.
        const user = result.user;
        console.log("User signed in with Google: ", user);
        console.log("Google Access Token: ", token);
        
        // send the user to backend to create a new user or log in the user
        // and store the returned uuid to local storage
        // const uuid = await axios.post(`${import.meta.env.VITE_BASE_URL}/auth`, {
        //     email: user.email,
        //     displayName: user.displayName

        // });
        // localStorage.setItem('uuid', uuid.data);
        // // set this uuid in the user context
        
        // console.log("UUID: ", uuid);
    }).catch(function(error) {
        console.error("Error during Google sign-in: ", error);
    });
}

const handleLogOut = () => {
    const auth = getAuth(firebaseApp);
    signOut(auth).then(()=> {
      console.log('logged out')
      localStorage.removeItem('uuid');
      window.location.href = '/';
    }).catch((error) => {
      console.log(error.message)
    })
  }

export { firebaseApp, handleGoogleSignUp, handleLogOut };