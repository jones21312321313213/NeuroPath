import { useState, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/landingPage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import SkipLink from "./components/layout/SkipLink";
import Overview from "./pages/Overview";
import UserProfile from "./pages/UserProfilePage";
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
import TeacherTutorialModal from "./components/TeacherTutorialModal";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

function getBreadcrumb(pathname) {
  if (pathname === "/dashboard" || pathname === "/dashboard/") return "DASHBOARD / Home";
  if (pathname === "/dashboard/profile") return "DASHBOARD / My Profile";
  if (pathname === "/dashboard/students") return "DASHBOARD / Student Profiling / View Profiles";
  if (pathname === "/dashboard/students/create") return "DASHBOARD / Student Profiling / Create Profile";
  if (pathname.startsWith("/dashboard/students/") && pathname.endsWith("/edit")) return "DASHBOARD / Student Profiling / Edit Profile";
  if (pathname.startsWith("/dashboard/students/") && pathname.endsWith("/iep")) return "DASHBOARD / AI-Based IEP Generation / Generate IEP";
  if (pathname.startsWith("/dashboard/students/")) return "DASHBOARD / Student Profiling / Student Detail";
  if (pathname === "/dashboard/iep" || pathname === "/dashboard/iep/generate") return "DASHBOARD / AI-Based IEP Generation / Generate IEP";
  if (pathname === "/dashboard/iep/view") return "DASHBOARD / AI-Based IEP Generation / View IEP";
  if (pathname === "/dashboard/lessons") return "DASHBOARD / Instructional Support / Lesson Plans";
  if (pathname === "/dashboard/visual-aids") return "DASHBOARD / Instructional Support / Visual Aids";
  if (pathname === "/dashboard/strategies") return "DASHBOARD / Instructional Support / Teaching Strategies";
  if (pathname === "/dashboard/records") return "DASHBOARD / Outcome Monitoring / Student Records";
  if (pathname === "/dashboard/monitoring") return "DASHBOARD / Outcome Monitoring / Progress Dashboard";
  return "DASHBOARD / Home";
}

function DashboardLayout() {
  const { user, markTutorialComplete } = useAuth();
  const location = useLocation();
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

  const breadcrumb = useMemo(() => getBreadcrumb(location.pathname), [location.pathname]);
  const showTutorial = user && user.has_completed_tutorial === false;

  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <SkipLink targetId="main-content" />
      {showTutorial && (
        <TeacherTutorialModal onComplete={markTutorialComplete} />
      )}
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="main-area">
        <Topbar
          breadcrumb={breadcrumb}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content focus:outline-none"
          aria-label="Main content"
        >
          <Outlet />
        </main>
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

          {/* Protected Dashboard Nested Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="students" element={<ViewStudentProfile />} />
            <Route path="students/create" element={<CreateStudentProfile />} />
            <Route path="students/:id" element={<ViewSelectedStudentProfile />} />
            <Route path="students/:id/edit" element={<UpdateStudentProfile />} />
            <Route path="students/:id/iep" element={<IEPGenerationPage mode="generate" />} />
            <Route path="iep" element={<IEPGenerationPage mode="generate" />} />
            <Route path="iep/generate" element={<IEPGenerationPage mode="generate" />} />
            <Route path="iep/view" element={<IEPGenerationPage mode="view" />} />
            <Route path="lessons" element={<ManageLessonPlans />} />
            <Route path="visual-aids" element={<ManageVisualAids />} />
            <Route path="strategies" element={<ManageTeachingStrategies />} />
            <Route path="records" element={<ViewStudentRecords />} />
            <Route path="monitoring" element={<ViewProgressDashboard />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
