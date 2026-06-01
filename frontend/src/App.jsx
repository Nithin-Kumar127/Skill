import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import Proposals from "./pages/Proposals";
import MyProposals from "./pages/MyProposals";
import AdminDashboard from "./pages/AdminDashboard";
import CreateGig from "./pages/CreateGig";
import Marketplace from "./pages/Marketplace";
import GigDetails from "./pages/GigDetails";
import ManageGig from "./pages/ManageGig";
import FreelancerProfileView from "./pages/FreelancerProfileView";

// Structural subpage dependencies mapped natively to parent layout views
import Overview from "./pages/Overview";
import MyWork from "./pages/MyWork";
import FreelancerApplyVerification from "./pages/FreelancerApplyVerification";

// New Security Feature System Pages
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public Entry Interfaces For Core Security Operations */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes Namespace Framework */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/my-work" element={<MyWork />} />
              <Route
                path="/verify-notice"
                element={<FreelancerApplyVerification />}
              />
              <Route path="/create-gig" element={<CreateGig />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/gigs/:id" element={<GigDetails />} />
              <Route path="/manage-gig/:id" element={<ManageGig />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/my-proposals" element={<MyProposals />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="/profile/freelancer"
                element={<FreelancerProfileView />}
              />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
