import { useState } from "react";
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
import "./App.css";

const breadcrumbMap = {
  overview: "DASHBOARD/Overview",
  "create-student-profile": "DASHBOARD/Student Profiling",
  "view-student-profile": "DASHBOARD/Student Profiling",
  "update-student-profile": "DASHBOARD/Student Profiling",
  "ai-insight": "DASHBOARD/Student Profiling",
  "iep-generation": "DASHBOARD/AI-Based IEP Generation",
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

function renderPage(activePage, setActivePage) {
  switch (activePage) {
    case "overview":
      return <Overview setActivePage={setActivePage} />;
    case "create-student-profile":
      return <CreateStudentProfile onBack={() => setActivePage("overview")} />;
    case "view-student-profile":
      return <Placeholder title="View Student Profile" />;
    case "update-student-profile":
      return <Placeholder title="Update Student Profile" />;
    case "ai-insight":
      return <Placeholder title="Analyze & Generate AI Insight" />;
    case "iep-generation":
      return <Placeholder title="AI-Based IEP Generation" />;
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

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-area">
        <Topbar breadcrumb={breadcrumbMap[activePage] || "DASHBOARD"} />
        {renderPage(activePage, setActivePage)}
      </div>
    </div>
  );
}

function Router() {
  const { user } = useAuth();
  const [page, setPage] = useState("landing");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = (to, msg = "") => {
    setSuccessMessage(msg);
    setPage(to);
  };

  if (user || page === "dashboard") return <Dashboard />;

  return (
    <>
      {page === "landing" && (
        <LandingPage onGetStarted={() => navigate("login")} />
      )}
      {page === "login" && (
        <LoginPage
          onNavigateRegister={() => navigate("register")}
          onLoginSuccess={() => navigate("dashboard")}
          successMessage={successMessage}
          onClearMessage={() => setSuccessMessage("")}
        />
      )}
      {page === "register" && (
        <RegisterPage onNavigateLogin={(msg) => navigate("login", msg)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
