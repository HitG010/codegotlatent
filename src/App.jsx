import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import ProblemSet from "./pages/ProblemSet";
import Problem from "./pages/problem";
import Home from "./pages/home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
// import UserProvider from './providers/userProvider';
import Setusername from "./pages/Setusername";
import Contests from "./pages/Contests";
import Contest from "./pages/Contest";
import ContestProblem from "./pages/ContestProblem";
import Submission from "./pages/Submission";
import { useUserInit } from "./providers/useUserInit";
import AuthRoute from "./providers/authRoute";
import ContestRanking from "./pages/ContestRanking";
import User from "./pages/User";
import Admin from "./pages/Admin";
import EditProblem from "./pages/ProbEdit";
import Settings from "./pages/Settings";
import Login2 from "./pages/login2";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ContestForm from "./pages/ContestForm";
import AddTestCase from "./pages/AddTestCase";
import RedirectHandler from "./RedirectHandler";
import NotFound from "./pages/404";

const App = () => {
  const location = useLocation();
  useUserInit(); // Initialize user state and refresh token on app load
  // run testcases flow
  // problemID
  // fetch testcases for problemID
  // submit the code with testcases (batch submission)
  // get the tokens for the submissions
  // poll the server for submission status
  // get the results for the submissions
  // show the results in UI

  // submit code flow
  // get the code from the editor
  // submit the code to the server
  // get the token for the submission
  // poll the server for submission status
  // get the result for the submission
  // show the result in UI
  // populate database with submission result

  return (
    // <UserProvider>
    <GoogleOAuthProvider 
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      onScriptLoadError={() => console.log('Google Script Load Error')}
      onScriptLoadSuccess={() => console.log('Google Script Loaded Successfully')}
    >
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login2 />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/setusername" element={<Setusername />} />
        <Route
          path="/home"
          element={
            <AuthRoute>
              <Home />
            </AuthRoute>
          }
        />
        <Route
          path="/problemSet"
          element={
            <AuthRoute>
              <ProblemSet />
            </AuthRoute>
          }
        />
        <Route
          path="/problem/:id"
          element={
            <AuthRoute>
              <Problem />
            </AuthRoute>
          }
        />
        <Route
          path="/contests"
          element={
            <AuthRoute>
              <Contests />
            </AuthRoute>
          }
        />
        <Route
          path="/contest/:contestId"
          element={
            <AuthRoute>
              <Contest />
            </AuthRoute>
          }
        />
        <Route
          path="/contest/:contestId/problem/:id"
          element={
            <AuthRoute>
              <ContestProblem />
            </AuthRoute>
          }
        />
        <Route
          path="/submission/:submissionId"
          element={
            <AuthRoute>
              <Submission />
            </AuthRoute>
          }
        />
        <Route
          path="/contest/:contestId/ranking"
          element={<ContestRanking />}
        />
        <Route path="/user/:userName" element={<User />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/edit-problem" element={<EditProblem />} />
        <Route
          path="/admin/edit-problem/:problemId"
          element={<EditProblem />}
        />
        <Route path="/admin/contest/new" element={<ContestForm />} />
        <Route path="/admin/contest/:id" element={<ContestForm />} />
        <Route path="/admin/addTestCase" element={<AddTestCase />} />
        {/* Add more routes as needed */}

        <Route path="/settings" element={<Settings />} />
        <Route path="/:path" element={<RedirectHandler />} />
        {/* Add more routes as needed */}
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </GoogleOAuthProvider>
  );
};

export default App;
