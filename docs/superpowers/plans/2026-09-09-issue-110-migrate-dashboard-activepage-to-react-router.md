# Dashboard ActivePage to React Router Nested Routes Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the monolithic `activePage` / `selectedStudentId` prop-drilled switch-case state machine in `App.jsx` to native `react-router-dom` nested routes under `/dashboard`, enabling browser history (Back/Forward), direct deep-linking, URL bookmarks, and state persistence on page refresh.

**Architecture:** 
1. Convert `Dashboard` in `App.jsx` from a switch-case state renderer into a layout component rendering `<Sidebar />`, `<Topbar />`, and `<Outlet />`.
2. Define clean nested routes under `/dashboard`:
   - `/dashboard` (index) -> `<Overview />`
   - `/dashboard/profile` -> `<UserProfile />`
   - `/dashboard/students` -> `<ViewStudentProfile />`
   - `/dashboard/students/create` -> `<CreateStudentProfile />`
   - `/dashboard/students/:id` -> `<ViewSelectedStudentProfile />`
   - `/dashboard/students/:id/edit` -> `<UpdateStudentProfile />`
   - `/dashboard/students/:id/iep` -> `<IEPGenerationPage mode="generate" />`
   - `/dashboard/iep` / `/dashboard/iep/generate` -> `<IEPGenerationPage mode="generate" />`
   - `/dashboard/iep/view` -> `<IEPGenerationPage mode="view" />`
   - `/dashboard/lessons` -> `<ManageLessonPlans />`
   - `/dashboard/visual-aids` -> `<ManageVisualAids />`
   - `/dashboard/strategies` -> `<ManageTeachingStrategies />`
   - `/dashboard/records` -> `<ViewStudentRecords />`
   - `/dashboard/monitoring` -> `<ViewProgressDashboard />`
3. Migrate `Sidebar` and `Topbar` to use `useNavigate()` and `useLocation().pathname` for active state matching and breadcrumb generation.
4. Update individual page components to read params via `useParams()` (`id`) and navigate via `useNavigate()`, while maintaining optional backwards-compatible prop support for legacy tests.
5. Add unit and integration tests covering nested routing, deep linking, parameter resolution, and history navigation.

**Tech Stack:** React 19, React Router v7 (`react-router-dom`), Vitest, React Testing Library.

## Global Constraints

- **Frontend only:** All changes are strictly limited to `neuropath-frontend/`. No backend modifications or new API endpoints.
- **URL Schema:**
  - `/dashboard` -> Overview
  - `/dashboard/profile` -> Teacher Profile
  - `/dashboard/students` -> Student Profiles List
  - `/dashboard/students/create` -> Create Student Profile
  - `/dashboard/students/:id` -> View Student Detail
  - `/dashboard/students/:id/edit` -> Edit Student Profile
  - `/dashboard/students/:id/iep` -> IEP Generation
  - `/dashboard/lessons` -> Lesson Plans
  - `/dashboard/visual-aids` -> Visual Aids
  - `/dashboard/strategies` -> Teaching Strategies
  - `/dashboard/records` -> Student Records
  - `/dashboard/monitoring` -> Progress Dashboard
- **Navigation UX:** Browser Back/Forward buttons and F5 refresh must preserve the exact active view and student context.
- **Verification:** `npm test` and `npm run build` in `neuropath-frontend/`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `neuropath-frontend/src/App.jsx` | **Modify.** Replace switch-case `renderPage` and local `activePage` / `selectedStudentId` state with nested React Router `<Route>` definitions under `/dashboard` with an `<Outlet />` layout. Provide dynamic breadcrumbs based on `useLocation().pathname`. |
| `neuropath-frontend/src/App.test.jsx` | **Create.** Integration tests for dashboard nested routes, deep links (`/dashboard/students/:id`, `/dashboard/students/:id/iep`), and 404 fallback routing. |
| `neuropath-frontend/src/components/layout/Sidebar.jsx` | **Modify.** Update navigation items to use route paths and derive active state and expanded subnavs from `useLocation().pathname`. |
| `neuropath-frontend/src/components/layout/Sidebar.test.jsx` | **Modify.** Update Sidebar tests to render inside a `MemoryRouter` and verify route navigation. |
| `neuropath-frontend/src/components/layout/Topbar.jsx` | **Modify.** Derive breadcrumbs or use `useNavigate()` to route teacher avatar click to `/dashboard/profile`. |
| `neuropath-frontend/src/pages/Overview.jsx` | **Modify.** Use `useNavigate()` for Getting Started steps and Quick Actions navigation to `/dashboard/...` routes. |
| `neuropath-frontend/src/pages/Overview.test.jsx` | **Modify.** Update Overview tests to verify `useNavigate()` calls with route URLs. |
| `neuropath-frontend/src/pages/CreateStudentProfile.jsx` | **Modify.** Update Next Steps CTAs and back buttons to navigate to `/dashboard/students/:id/iep` and `/dashboard/students/:id` via `useNavigate()`. |
| `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx` | **Modify.** Verify Next Step navigation calls target URLs. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx` | **Modify.** Update student table row clicks, "Create Student", and "Generate IEP" actions to use `useNavigate()` with `/dashboard/students/:id` and `/dashboard/students/:id/iep`. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx` | **Modify.** Use `useParams()` to read `id` and `useNavigate()` to navigate back to `/dashboard/students` or edit `/dashboard/students/:id/edit`. |
| `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx` | **Create.** Unit tests verifying `useParams()` extraction and navigation. |
| `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx` | **Modify.** Use `useParams()` to read `id` and `useNavigate()` on back / completion. |
| `neuropath-frontend/src/pages/IepGenerationPage.jsx` | **Modify.** Support `useParams()` for student ID and route navigation for actions. |
| `neuropath-frontend/src/pages/ManageLessonPlans.jsx` | **Modify.** Use `useNavigate()` for routing. |
| `neuropath-frontend/src/pages/ManageVisualAids.jsx` | **Modify.** Use `useNavigate()` for routing. |
| `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx` | **Modify.** Use `useNavigate()` for routing. |
| `neuropath-frontend/src/pages/ViewStudentRecords.jsx` | **Modify.** Use `useNavigate()` for routing. |
| `neuropath-frontend/src/pages/ViewProgressDashboard.jsx` | **Modify.** Use `useNavigate()` for routing. |

---

## Task 1: Setup React Router Nested Dashboard Layout and App Integration Tests

**Files:**
- Create: `neuropath-frontend/src/App.test.jsx`
- Modify: `neuropath-frontend/src/App.jsx`

**Interfaces:**
- Consumes: React Router v7 (`Routes`, `Route`, `Outlet`, `useLocation`, `useNavigate`, `useParams`).
- Produces: Nested routing layout under `/dashboard` with clean URLs and dynamic breadcrumb generation.

- [ ] **Step 1: Write the failing integration test**

Create `neuropath-frontend/src/App.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { studentsAPI, iepAPI } from "./api/client";

vi.mock("./context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock("./api/client", () => ({
  studentsAPI: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 4, name: "Alex Johnson" }),
  },
  iepAPI: {
    dashboardStats: vi.fn().mockResolvedValue({ active_ieps: 0, ai_insights: 0 }),
    listByStudent: vi.fn().mockResolvedValue([]),
    listGoalsByStudent: vi.fn().mockResolvedValue([]),
  },
  lessonPlansAPI: {
    getDirectory: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
  },
  visualAidsAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  teachingStrategiesAPI: {
    getDirectory: vi.fn().mockResolvedValue([]),
  },
  trackingAPI: {
    getProgressDashboard: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("./components/ui/CountUp", () => ({
  default: ({ to }) => <span>{to}</span>,
}));

vi.mock("./components/ui/GlareHover", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe("App Router Nested Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe" },
    });
  });

  it("renders Overview when navigating to /dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/good morning|good afternoon|good evening/i)).toBeInTheDocument();
    expect(screen.getByText(/getting started/i)).toBeInTheDocument();
  });

  it("renders Student Profiles list when navigating to /dashboard/students", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/students"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/student profiling/i)).toBeInTheDocument();
  });

  it("renders Create Student Profile when navigating to /dashboard/students/create", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/students/create"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/create student profile/i)).toBeInTheDocument();
  });

  it("renders Lesson Plans when navigating to /dashboard/lessons", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/lessons"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/lesson plans/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL because `Dashboard` still uses `switch(activePage)` rather than React Router nested `<Outlet />` routes.

- [ ] **Step 3: Update `App.jsx` with nested routes and dynamic breadcrumbs**

Modify `neuropath-frontend/src/App.jsx`:

```jsx
import { useState, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/landingPage";
import LoginPage from "./pages/loginPage";
import RegisterPage from "./pages/registerPage";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
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
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

export function getBreadcrumb(pathname) {
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

  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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
        <Outlet />
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "refactor(router): convert dashboard into nested react-router routes (#110)"
```

---

## Task 2: Refactor Sidebar and Topbar for React Router Navigation

**Files:**
- Modify: `neuropath-frontend/src/components/layout/Sidebar.jsx`
- Modify: `neuropath-frontend/src/components/layout/Sidebar.test.jsx`
- Modify: `neuropath-frontend/src/components/layout/Topbar.jsx`

**Interfaces:**
- Consumes: `useNavigate`, `useLocation` from `react-router-dom`.
- Produces: Navigation item clicks route via `navigate(path)`, active highlight and category expansions are derived from `location.pathname`.

- [ ] **Step 1: Update Sidebar.jsx navigation model**

Modify `neuropath-frontend/src/components/layout/Sidebar.jsx` to map navigation paths and track active states via `location.pathname`:

```jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LogoutModal from "./LogoutModal";

const navItems = [
  {
    label: "Home",
    path: "/dashboard",
    icon: "ti-home-2",
    exact: true,
    children: [],
  },
  {
    label: "Student Profiling",
    key: "student-profiling",
    pathPrefix: "/dashboard/students",
    icon: "ti-users",
    children: [
      { label: "Create Student Profile", path: "/dashboard/students/create" },
      { label: "View Student Profile", path: "/dashboard/students", exact: true },
    ],
  },
  {
    label: "AI-Based IEP Generation",
    key: "iep-generation",
    pathPrefix: "/dashboard/iep",
    icon: "ti-sparkles",
    children: [
      { label: "Generate IEP", path: "/dashboard/iep/generate" },
      { label: "View IEP", path: "/dashboard/iep/view" },
    ],
  },
  {
    label: "Instructional Support",
    key: "instructional-support",
    icon: "ti-books",
    children: [
      { label: "Manage Lesson Plans", path: "/dashboard/lessons" },
      { label: "Manage Visual Aids", path: "/dashboard/visual-aids" },
      { label: "Manage Teaching Strategies", path: "/dashboard/strategies" },
    ],
  },
  {
    label: "Outcome Monitoring",
    key: "outcome-monitoring",
    icon: "ti-chart-bar",
    children: [
      { label: "View Student Records", path: "/dashboard/records" },
      { label: "View Progress Dashboard", path: "/dashboard/monitoring" },
    ],
  },
];

export default function Sidebar({
  activePage,
  setActivePage,
  collapsed = false,
  onToggleCollapse,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location?.pathname || "/dashboard";

  const [expanded, setExpanded] = useState({
    "student-profiling": false,
    "iep-generation": false,
    "instructional-support": false,
    "outcome-monitoring": false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-expand group if current path is under that group
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        const hasMatchingChild = item.children.some(
          (child) => child.path === currentPath || (child.path !== "/dashboard/students" && currentPath.startsWith(child.path))
        );
        if (hasMatchingChild || (item.pathPrefix && currentPath.startsWith(item.pathPrefix))) {
          setExpanded((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [currentPath]);

  const toggleExpand = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmLogout = async () => {
    await logout();
    sessionStorage.clear();
    setIsModalOpen(false);
    navigate("/login");
  };

  const isItemActive = (item) => {
    if (item.exact) return currentPath === item.path;
    if (item.path && currentPath === item.path) return true;
    if (item.pathPrefix && currentPath.startsWith(item.pathPrefix)) return true;
    if (item.children?.some((child) => child.exact ? currentPath === child.path : currentPath.startsWith(child.path))) return true;
    if (activePage && (item.key === activePage || item.path === activePage)) return true;
    return false;
  };

  const handleNavClick = (e, item) => {
    e.stopPropagation();
    if (collapsed) {
      if (onToggleCollapse) onToggleCollapse();
      if (item.children.length > 0) {
        setExpanded((prev) => ({ ...prev, [item.key]: true }));
      } else if (item.path) {
        navigate(item.path);
        if (setActivePage) setActivePage(item.key || item.path);
      }
      return;
    }

    if (item.children.length > 0) {
      toggleExpand(item.key);
    } else if (item.path) {
      navigate(item.path);
      if (setActivePage) setActivePage(item.key || item.path);
    }
  };

  const handleToggleCollapse = (e) => {
    e.stopPropagation();
    onToggleCollapse?.();
  };

  return (
    <>
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""}`}
        onClick={(e) => {
          if (!e.target.closest("button")) {
            onToggleCollapse?.();
          }
        }}
      >
        <div
          className="sidebar-header"
          onClick={handleToggleCollapse}
          title={collapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
        >
          {!collapsed ? (
            <div className="sidebar-brand">
              <div className="sidebar-brand-info">
                <span className="sidebar-brand-name">NeuroPath</span>
                <span className="sidebar-brand-tag">Special Ed Workspace</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand collapsed">
              <span className="sidebar-brand-abbr">NP</span>
            </div>
          )}
        </div>

        <hr className="sidebar-divider" />

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const isCategoryExpanded = expanded[item.key];

            return (
              <div key={item.key || item.path} className="sidebar-nav-group">
                <button
                  type="button"
                  className={`sidebar-nav-item ${active ? "active" : ""}`}
                  onClick={(e) => handleNavClick(e, item)}
                  title={collapsed ? item.label : undefined}
                >
                  <i className={`ti ${item.icon} sidebar-icon`} aria-hidden="true" />
                  {!collapsed && (
                    <>
                      <span className="sidebar-label">{item.label}</span>
                      {item.children.length > 0 && (
                        <i
                          className={`ti ti-chevron-right sidebar-chevron ${isCategoryExpanded ? "rotated" : ""}`}
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                  {collapsed && (
                    <span className="sidebar-tooltip">{item.label}</span>
                  )}
                </button>

                {!collapsed && item.children.length > 0 && isCategoryExpanded && (
                  <div className="sidebar-subnav">
                    {item.children.map((child) => {
                      const isChildActive = child.exact
                        ? currentPath === child.path
                        : currentPath.startsWith(child.path);

                      return (
                        <button
                          key={child.path}
                          type="button"
                          className={`sidebar-subnav-item ${isChildActive ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(child.path);
                            if (setActivePage) setActivePage(child.key || child.path);
                          }}
                        >
                          <span className="subnav-bullet" />
                          <span className="subnav-label">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div
          className="sidebar-empty-space"
          data-testid="sidebar-empty-space"
          onClick={handleToggleCollapse}
          role="button"
          tabIndex={0}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleCollapse?.();
            }
          }}
        />

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            title={collapsed ? "Log out" : undefined}
          >
            <i className="ti ti-logout-2" aria-hidden="true" />
            {!collapsed && <span>Log Out</span>}
            {collapsed && <span className="sidebar-tooltip">Log Out</span>}
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
```

- [ ] **Step 2: Update Topbar.jsx**

Modify `neuropath-frontend/src/components/layout/Topbar.jsx`:

```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Topbar.css";

export default function Topbar({ breadcrumb, setActivePage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teacherName = `Teacher ${user?.first_name || ""}`;
  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();

  const handleProfileClick = () => {
    navigate("/dashboard/profile");
    if (setActivePage) setActivePage("my-profile");
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-user">
        <div
          className="topbar-pill"
          onClick={handleProfileClick}
          style={{ cursor: "pointer" }}
        >
          <div className="topbar-pill-avatar">{initials || "👤"}</div>
          <span className="topbar-pill-name">{teacherName}</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update `Sidebar.test.jsx` with MemoryRouter wrapper**

Modify `neuropath-frontend/src/components/layout/Sidebar.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Sidebar component", () => {
  const mockSetActivePage = vi.fn();
  const mockOnToggleCollapse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { first_name: "Jane", last_name: "Doe" },
      logout: vi.fn(),
    });
  });

  it("renders Home and all major navigation categories", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Student Profiling")).toBeInTheDocument();
    expect(screen.getByText("AI-Based IEP Generation")).toBeInTheDocument();
    expect(screen.getByText("Instructional Support")).toBeInTheDocument();
    expect(screen.getByText("Outcome Monitoring")).toBeInTheDocument();
  });

  it("calls onToggleCollapse when sidebar header or empty space is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const header = screen.getByTitle(/click to collapse sidebar/i);
    await user.click(header);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(1);

    const emptySpace = screen.getByTestId("sidebar-empty-space");
    await user.click(emptySpace);
    expect(mockOnToggleCollapse).toHaveBeenCalledTimes(2);
  });

  it("renders in collapsed mode with collapsed class", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={true}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    const aside = container.querySelector("aside.sidebar");
    expect(aside).toHaveClass("collapsed");
    expect(screen.getByTestId("sidebar-empty-space")).toBeInTheDocument();
  });

  it("expands child links when clicking on a category in expanded mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar
          collapsed={false}
          onToggleCollapse={mockOnToggleCollapse}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText("Create Student Profile")).not.toBeInTheDocument();
    const profilingBtn = screen.getByRole("button", { name: /student profiling/i });
    await user.click(profilingBtn);

    expect(screen.getByText("Create Student Profile")).toBeInTheDocument();
    expect(screen.getByText("View Student Profile")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run Sidebar tests**

Run: `npx vitest run src/components/layout/Sidebar.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.jsx src/components/layout/Sidebar.test.jsx src/components/layout/Topbar.jsx
git commit -m "refactor(layout): update Sidebar and Topbar to use react-router navigation (#110)"
```

---

## Task 3: Migrate Student Profiling Views (`ViewSelectedStudentProfile`, `UpdateStudentProfile`, `ViewStudentProfile`, `CreateStudentProfile`)

**Files:**
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx`
- Create: `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.jsx`
- Modify: `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`

**Interfaces:**
- Consumes: `useParams()` (`const { id } = useParams()`), `useNavigate()` (`navigate(...)`).
- Produces: Direct URL linking to `/dashboard/students/:id`, `/dashboard/students/:id/edit`, `/dashboard/students/:id/iep`, and `/dashboard/students/create`.

- [ ] **Step 1: Write failing unit test for `ViewSelectedStudentProfile` with `useParams`**

Create `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ViewSelectedStudentProfile from "./ViewSelectedStudentProfile";
import { studentsAPI } from "../../api/client";

vi.mock("../../api/client", () => ({
  studentsAPI: {
    get: vi.fn(),
  },
  iepAPI: {
    listByStudent: vi.fn().mockResolvedValue([]),
    listGoalsByStudent: vi.fn().mockResolvedValue([]),
  },
}));

describe("ViewSelectedStudentProfile useParams and routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads student profile using route parameter id", async () => {
    studentsAPI.get.mockResolvedValue({
      id: 42,
      name: "Sam Smith",
      age: 10,
      gender: "Male",
      grade_level: "5th Grade",
      guardian_name: "Parent Smith",
      guardian_contact: "555-0100",
      difficulty_markers: ["Difficulty in Communicating"],
      preferences: JSON.stringify({ preferredLearningStyle: "Visual" }),
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/students/42"]}>
        <Routes>
          <Route
            path="/dashboard/students/:id"
            element={<ViewSelectedStudentProfile />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(studentsAPI.get).toHaveBeenCalledWith("42");
      expect(screen.getByDisplayValue("Sam Smith")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Update `ViewSelectedStudentProfile.jsx`**

Modify `neuropath-frontend/src/pages/StudentProfiling/ViewSelectedStudentProfile.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/ViewSelectedStudentProfile.css";
import StudentInsightsTab from "./StudentInsightsTab";
import { studentsAPI } from "../../api/client";

function getProfileDetails(student) {
  if (student?.profileDetails && typeof student.profileDetails === "object") {
    return student.profileDetails;
  }

  if (!student?.preferences) return {};

  if (typeof student.preferences === "string") {
    try {
      const parsed = JSON.parse(student.preferences);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof student.preferences === "object" ? student.preferences : {};
}

function ReadOnlyInput({ label, value }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <input className="form-input" value={value || "—"} readOnly />
    </div>
  );
}

function ReadOnlyTextArea({ label, value, rows = 4 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" rows={rows} value={value || "—"} readOnly />
    </div>
  );
}

export default function ViewSelectedStudentProfile({ studentId: propStudentId, setActivePage }) {
  const { id: routeStudentId } = useParams();
  const navigate = useNavigate();
  const studentId = propStudentId || routeStudentId;

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });

    studentsAPI
      .get(studentId)
      .then((response) => {
        if (cancelled) return;
        setSelected(response?.data || response);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load student details.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const details = useMemo(() => getProfileDetails(selected), [selected]);
  const handleBack = () => {
    navigate("/dashboard/students");
    if (setActivePage) setActivePage("view-student-profile");
  };
  const handleUpdate = () => {
    navigate(`/dashboard/students/${studentId}/edit`);
    if (setActivePage) setActivePage("update-student-profile");
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="placeholder-page">Loading student details...</div>
      </div>
    );
  }

  if (error || !selected) {
    return (
      <div className="page-content">
        <div className="placeholder-page">
          {error || "No student details found."}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="profile-container">
        {/* Header Actions */}
        <div className="profile-header-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleBack}
          >
            ← Back to Student List
          </button>
          <div className="tab-buttons">
            <button
              type="button"
              className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              Student Info
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              Student Insights
            </button>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={handleUpdate}
          >
            Edit Profile
          </button>
        </div>

        {activeTab === "info" ? (
          <div className="profile-details-card">
            <h2 className="student-name-heading">{selected.name}</h2>
            <div className="form-grid">
              <ReadOnlyInput label="Age" value={selected.age} />
              <ReadOnlyInput label="Gender" value={selected.gender} />
              <ReadOnlyInput label="Grade Level" value={selected.grade_level} />
              <ReadOnlyInput label="Guardian Name" value={selected.guardian_name} />
              <ReadOnlyInput label="Guardian Contact" value={selected.guardian_contact} />
            </div>

            <div className="form-section">
              <h3 className="section-title">Difficulties / Markers</h3>
              <div className="tags-container">
                {selected.difficulty_markers && selected.difficulty_markers.length > 0 ? (
                  selected.difficulty_markers.map((marker, idx) => (
                    <span key={idx} className="tag-badge">{marker}</span>
                  ))
                ) : (
                  <p className="empty-text">None specified.</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Learning & Behavioral Preferences</h3>
              <div className="form-grid">
                <ReadOnlyTextArea label="Preferred Learning Style" value={details.preferredLearningStyle} />
                <ReadOnlyTextArea label="Behavioral Challenges & Triggers" value={details.behavioralChallenges} />
                <ReadOnlyTextArea label="Strengths & Special Interests" value={details.strengths} />
                <ReadOnlyTextArea label="Support Strategies & Motivators" value={details.supportStrategies} />
              </div>
            </div>
          </div>
        ) : (
          <StudentInsightsTab studentId={studentId} studentName={selected.name} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `UpdateStudentProfile.jsx` with `useParams` and `useNavigate`**

Modify `neuropath-frontend/src/pages/StudentProfiling/UpdateStudentProfile.jsx`:
- Read `studentId` from `useParams()` (`const { id } = useParams(); const studentId = propStudentId || id;`).
- On back or cancel, call `navigate("/dashboard/students")` or `navigate(`/dashboard/students/${studentId}`)`.

- [ ] **Step 4: Update `ViewStudentProfile.jsx` with `useNavigate`**

Modify `neuropath-frontend/src/pages/StudentProfiling/ViewStudentProfile.jsx`:
- On row click or "View Profile": `navigate(`/dashboard/students/${student.id}`)`
- On "Create Student": `navigate("/dashboard/students/create")`
- On "Generate IEP": `navigate(`/dashboard/students/${student.id}/iep`)`
- Retain optional `setActivePage` / `setSelectedStudentId` prop callbacks for backwards compatibility.

- [ ] **Step 5: Update `CreateStudentProfile.jsx` and its tests**

Modify `neuropath-frontend/src/pages/CreateStudentProfile.jsx`:
- Use `useNavigate()` for back button (`navigate("/dashboard")` or `navigate("/dashboard/students")`), Next Step primary CTA (`navigate(`/dashboard/students/${createdStudent.id}/iep`)`), and secondary CTA (`navigate(`/dashboard/students/${createdStudent.id}`)`).
- Retain optional `setActivePage` / `setSelectedStudentId` prop callbacks.

Modify `neuropath-frontend/src/pages/CreateStudentProfile.test.jsx`:
- Wrap rendered components in `MemoryRouter` if not already wrapped.

- [ ] **Step 6: Run Student Profiling tests**

Run:
```bash
npx vitest run src/pages/StudentProfiling/ViewSelectedStudentProfile.test.jsx
npx vitest run src/pages/StudentProfiling/UpdateStudentProfile.test.jsx
npx vitest run src/pages/CreateStudentProfile.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/StudentProfiling/ src/pages/CreateStudentProfile.jsx src/pages/CreateStudentProfile.test.jsx
git commit -m "refactor(profiling): migrate student profiling views to useParams and useNavigate (#110)"
```

---

## Task 4: Migrate Overview and Remaining Dashboard Pages (`IepGenerationPage`, `ManageLessonPlans`, etc.)

**Files:**
- Modify: `neuropath-frontend/src/pages/Overview.jsx`
- Modify: `neuropath-frontend/src/pages/Overview.test.jsx`
- Modify: `neuropath-frontend/src/pages/IepGenerationPage.jsx`
- Modify: `neuropath-frontend/src/pages/ManageLessonPlans.jsx`
- Modify: `neuropath-frontend/src/pages/ManageVisualAids.jsx`
- Modify: `neuropath-frontend/src/pages/ManageTeachingStrategies.jsx`
- Modify: `neuropath-frontend/src/pages/ViewStudentRecords.jsx`
- Modify: `neuropath-frontend/src/pages/ViewProgressDashboard.jsx`

**Interfaces:**
- Consumes: `useNavigate()`, `useParams()`.
- Produces: Fully integrated URL routing across Overview, IEP generation, Classroom Tools, and Progress Dashboards.

- [ ] **Step 1: Update `Overview.jsx` to navigate to `/dashboard/...` routes**

Modify `neuropath-frontend/src/pages/Overview.jsx`:
- Replace page keys in `gettingStartedSteps` and `quickActions` with route paths:
  - Add student -> `/dashboard/students/create`
  - Generate IEP -> `/dashboard/iep/generate`
  - Use classroom tools -> `/dashboard/lessons`
  - View all students -> `/dashboard/students`
- In button handlers, execute `navigate(step.path)` (and call `setActivePage?.(step.path)` if provided).

- [ ] **Step 2: Update `Overview.test.jsx`**

Modify `neuropath-frontend/src/pages/Overview.test.jsx` to wrap `Overview` in `<MemoryRouter>` and verify navigation routes.

- [ ] **Step 3: Update `IepGenerationPage.jsx`**

Modify `neuropath-frontend/src/pages/IepGenerationPage.jsx`:
- Extract student ID from `useParams()` (`const { id } = useParams()`).
- Use `useNavigate()` to navigate to `/dashboard/students/create` or `/dashboard/lessons` on next steps.

- [ ] **Step 4: Update Classroom Tools and Outcome Monitoring pages**

Modify `ManageLessonPlans.jsx`, `ManageVisualAids.jsx`, `ManageTeachingStrategies.jsx`, `ViewStudentRecords.jsx`, `ViewProgressDashboard.jsx` to use `useNavigate()` for internal transitions.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All test suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ src/pages/Overview.test.jsx
git commit -m "refactor(views): migrate overview and dashboard views to useNavigate (#110)"
```

---

## Task 5: Full Verification & Build Check

**Files:**
- None (verification and build operations)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All unit and integration tests pass cleanly.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: Vite build succeeds with 0 errors.

- [ ] **Step 3: Self-review against Acceptance Criteria**
- All dashboard views accessible via distinct URLs (`/dashboard`, `/dashboard/students`, `/dashboard/students/:id`, etc.): Verified.
- Deep linking to `/dashboard/students/:id` directly loads student record: Verified.
- Browser Back/Forward navigation works seamlessly across views: Verified.
- Page refresh preserves the active route and route parameters: Verified.
- No backend code modified: Verified.
