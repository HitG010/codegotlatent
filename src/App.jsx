import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import ProblemSet from './pages/ProblemSet';
import Problem from './pages/problem';
import Home from './pages/home';

const App = () => {
  const location = useLocation();
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
    <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />}/>
            <Route path="/problemSet" element={<ProblemSet />} />
            <Route path="/problem/:id" element={<Problem/>} />
    </Routes>
  );
}

export default App;
