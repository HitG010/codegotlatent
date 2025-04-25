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
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
        path="/contest/:contestId/problem/:problemId"
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
      <Route path="/contest/:contestId/ranking" element={<ContestRanking />} />
      {/* Add more routes as needed */}
    </Routes>
    // </UserProvider>
  );
};

export default App;
