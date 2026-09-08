import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/landingPage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Overview from "./pages/Overview";
import UserProfile from "./pages/UserProfilePage"; // 👈 Updated path to match UserProfilePage exactly
import ManageLessonPlans from "./pages/ManageLessonPlans";
import ManageVisualAids from "./pages/ManageVisualAids";
import ManageTeachingStrategies from "./pages/ManageTeachingStrategies";
import ViewStudentRecords from "./pages/ViewStudentRecords";
import ViewProgressDashboard from "./pages/ViewProgressDashboard";
import CreateStudentProfile from "./pages/CreateStudentProfile";
import IEPGenerationPage from "./pages/IepGenerationPage";
import ViewStudentProfile from "./pages/StudentProfiling/ViewStudentProfile";
import ViewSelectedStudentProfile from "./pages/StudentProfiling/ViewSelectedStudentProfile";
import UpdateStudentProfile from "./pages/StudentProfiling/UpdateStudentProfile";
import LoginSplash from "./components/LoginSplash";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";


const breadcrumbMap = {
  home: "DASHBOARD / Home",
  overview: "DASHBOARD / Home",
  "my-profile": "DASHBOARD / My Profile",
  "create-student-profile": "DASHBOARD / Student Profiling / Create Profile",
  "view-student-profile": "DASHBOARD / Student Profiling / View Profiles",
  "update-student-profile": "DASHBOARD / Student Profiling / Edit Profile",
  "iep-generation": "DASHBOARD / AI-Based IEP Generation",
  "generate-iep": "DASHBOARD / AI-Based IEP Generation / Generate IEP",
  "view-iep": "DASHBOARD / AI-Based IEP Generation / View IEP",
  "manage-lesson-plans": "DASHBOARD / Instructional Support / Lesson Plans",
  "manage-visual-aids": "DASHBOARD / Instructional Support / Visual Aids",
  "manage-teaching-strategies":
    "DASHBOARD / Instructional Support / Teaching Strategies",
  "view-student-records": "DASHBOARD / Outcome Monitoring / Student Records",
  "view-progress-dashboard":
    "DASHBOARD / Outcome Monitoring / Progress Dashboard",
};

function renderPage(
  activePage,
  setActivePage,
  selectedStudentId,
  setSelectedStudentId,
) {
  switch (activePage) {
    case "home":
    case "overview":
      return <Overview setActivePage={setActivePage} />;
    case "my-profile":
      return <UserProfile />; // Wired up the switch statement destination
    case "create-student-profile":
      return (
        <CreateStudentProfile
          onBack={() => setActivePage("home")}
          setActivePage={setActivePage}
          setSelectedStudentId={setSelectedStudentId}
        />
      );
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
    case "iep-generation":
    case "generate-iep":
      return (
        <IEPGenerationPage
          mode="generate"
          initialStudentId={selectedStudentId}
          setActivePage={setActivePage}
        />
      );
    case "view-iep":
      return (
        <IEPGenerationPage
          mode="view"
          initialStudentId={selectedStudentId}
          setActivePage={setActivePage}
        />
      );
    case "manage-lesson-plans":
      return <ManageLessonPlans setActivePage={setActivePage} />;
    case "manage-visual-aids":
      return <ManageVisualAids setActivePage={setActivePage} />;
    case "manage-teaching-strategies":
      return <ManageTeachingStrategies setActivePage={setActivePage} />;
    case "view-student-records":
      return <ViewStudentRecords setActivePage={setActivePage} />;
    case "view-progress-dashboard":
      return <ViewProgressDashboard setActivePage={setActivePage} />;

    default:
      return <Overview setActivePage={setActivePage} />;
  }
}

function Dashboard() {
  const [activePage, setActivePage] = useState("home");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("neuropath_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("neuropath_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="main-area">
        <Topbar
          breadcrumb={breadcrumbMap[activePage] || "DASHBOARD / Home"}
          setActivePage={setActivePage}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
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
          <Route path="*" element={<NotFoundPage />} />
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
