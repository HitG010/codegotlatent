import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseApp } from "../data/firebase";

const handleGoogleSignUp = async () => {
    // Using a popup.
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    signInWithPopup(auth, provider).then(function(result) {
        // This gives you a Google Access Token.
        const token = result.user.accessToken;
        // The signed-in user info.
        const user = result.user;
        console.log("User signed in with Google: ", user);
        console.log("Google Access Token: ", token);
    }).catch(function(error) {
        console.error("Error during Google sign-in: ", error);
    });
}

const handleLogOut = () => {
    const auth = getAuth(firebaseApp);
    signOut(auth).then(()=> {
      console.log('logged out')
      window.location.href = '/';
    }).catch((error) => {
      console.log(error.message)
    })
  }

export { handleGoogleSignUp, handleLogOut };