import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Overview from "./pages/Overview";
import ManageLessonPlans from "./pages/ManageLessonPlans";
import ManageVisualAids from "./pages/ManageVisualAids";
import ManageTeachingStrategies from "./pages/ManageTeachingStrategies";
import ViewStudentRecords from "./pages/ViewStudentRecords";
import ViewProgressDashboard from "./pages/ViewProgressDashboard";
import CreateStudentProfile from "./pages/CreateStudentProfile";
import IEPGenerationPage from "./pages/IEPGenerationPage";
import ViewStudentProfile from "./pages/StudentProfiling/ViewStudentProfile";
import ViewSelectedStudentProfile from "./pages/StudentProfiling/ViewSelectedStudentProfile";
import UpdateStudentProfile from "./pages/StudentProfiling/UpdateStudentProfile";
import LoginSplash from "./components/LoginSplash";
import "./App.css";

const breadcrumbMap = {
  overview: "DASHBOARD/Overview",
  "create-student-profile": "DASHBOARD/Student Profiling",
  "view-student-profile": "DASHBOARD/Student Profiling",
  "update-student-profile": "DASHBOARD/Student Profiling",
  "ai-insight": "DASHBOARD/Student Profiling",
  "iep-generation": "DASHBOARD/AI-Based IEP Generation",
  "generate-iep": "DASHBOARD/AI-Based IEP Generation/ Generate IEP",
  "view-iep": "DASHBOARD/AI-Based IEP Generation/ View IEP",
  "manage-lesson-plans": "DASHBOARD/Instructional Support",
  "manage-visual-aids": "DASHBOARD/Instructional Support",
  "manage-teaching-strategies": "DASHBOARD/Instructional Support",
  "view-student-records": "DASHBOARD/Outcome Monitoring/ View Student Record",
  "view-progress-dashboard":
    "DASHBOARD/Outcome Monitoring/ View Progress Dashboard",
};

function Placeholder({ title }) {
  return (
    <div className="page-content">
      <div className="placeholder-page">
        <h2>{title}</h2>
        <p>This page is under construction.</p>
      </div>
    </div>
  );
}

function renderPage(
  activePage,
  setActivePage,
  selectedStudentId,
  setSelectedStudentId,
) {
  switch (activePage) {
    case "overview":
      return <Overview setActivePage={setActivePage} />;
    case "create-student-profile":
      return <CreateStudentProfile onBack={() => setActivePage("overview")} />;
    case "view-student-profile":
      return (
        <ViewStudentProfile
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      );
    case "view-student-detail":
      return (
        <ViewSelectedStudentProfile
          studentId={selectedStudentId}
          setActivePage={setActivePage}
        />
      );
    case "update-student-profile":
      return (
        <UpdateStudentProfile
          studentId={selectedStudentId}
          onBack={() => setActivePage("view-student-profile")}
        />
      );
    case "ai-insight":
      return <Placeholder title="Analyze & Generate AI Insight" />;
    case "iep-generation":
    case "generate-iep":
      return <IEPGenerationPage mode="generate" />;
    case "view-iep":
      return <IEPGenerationPage mode="view" />;
    case "manage-lesson-plans":
      return <ManageLessonPlans />;
    case "manage-visual-aids":
      return <ManageVisualAids />;
    case "manage-teaching-strategies":
      return <ManageTeachingStrategies />;

    default:
      return <Overview setActivePage={setActivePage} />;
    case "view-student-records":
      return <ViewStudentRecords />;
    case "view-progress-dashboard":
      return <ViewProgressDashboard />;
  }
}

function Dashboard() {
  const [activePage, setActivePage] = useState("overview");
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-area">
        <Topbar breadcrumb={breadcrumbMap[activePage] || "DASHBOARD"} />
        {renderPage(
          activePage,
          setActivePage,
          selectedStudentId,
          setSelectedStudentId,
        )}
      </div>
    </div>
  );
}
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState("");
  const [showSplash, setShowSplash] = useState(false);

  return (
    <>
      {showSplash && (
        <LoginSplash
          onComplete={() => {
            setShowSplash(false);
            navigate("/dashboard");
          }}
        />
      )}

      {!showSplash && (
        <Routes>
          <Route
            path="/"
            element={<LandingPage onGetStarted={() => navigate("/login")} />}
          />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage
                  onNavigateRegister={() => navigate("/register")}
                  onLoginSuccess={() => setShowSplash(true)}
                  successMessage={successMessage}
                  onClearMessage={() => setSuccessMessage("")}
                />
              )
            }
          />

          <Route
            path="/register"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <RegisterPage
                  onNavigateLogin={(msg) => {
                    setSuccessMessage(msg);
                    navigate("/login");
                  }}
                />
              )
            }
          />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
// function Router() {
//   const { user } = useAuth();
//   const [page, setPage] = useState("landing");
//   const [successMessage, setSuccessMessage] = useState("");
//   const [showSplash, setShowSplash] = useState(false);

//   const navigate = (to, msg = "") => {
//     setSuccessMessage(msg);
//     setPage(to);
//   };

//   const handleLoginSuccess = () => {
//     setShowSplash(true);
//   };

//   if (showSplash && !user) {
//     // User object not set yet but splash is showing — still show splash
//   }

//   if ((user || page === "dashboard") && !showSplash) return <Dashboard />;

//   return (
//     <>
//       {showSplash && (
//         <LoginSplash
//           onComplete={() => {
//             setShowSplash(false);
//             navigate("dashboard");
//           }}
//         />
//       )}
//       {!showSplash && page === "landing" && (
//         <LandingPage onGetStarted={() => navigate("login")} />
//       )}
//       {!showSplash && page === "login" && (
//         <LoginPage
//           onNavigateRegister={() => navigate("register")}
//           onLoginSuccess={handleLoginSuccess}
//           successMessage={successMessage}
//           onClearMessage={() => setSuccessMessage("")}
//         />
//       )}
//       {!showSplash && page === "register" && (
//         <RegisterPage onNavigateLogin={(msg) => navigate("login", msg)} />
//       )}
//     </>
//   );
// }

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
