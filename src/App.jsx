import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  Home,
  Layers,
  Menu,
  Moon,
  Network,
  Server,
  Settings,
  ShieldCheck,
  Sun,
  User,
  XCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import vcnowLogo from "./assets/vcnow_logo.png";

import Dashboard from "./pages/Dashboard";
import EC2 from "./pages/EC2";
import Lambda from "./pages/Lambda";
import RDS from "./pages/RDS";
import S3 from "./pages/S3";
import CloudWatch from "./pages/CloudWatch";
import Alarms from "./pages/Alarms";
import Logs from "./pages/Logs";
import SettingsPage from "./pages/Settings.jsx";

import "./App.css";

/* =========================================
   API
========================================= */

const API_BASE = "http://localhost:5000/api";

/* =========================================
   NAVIGATION
========================================= */

const navigation = [
  {
    name: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    name: "EC2 Instances",
    path: "/ec2",
    icon: Server,
  },
  {
    name: "Lambda",
    path: "/lambda",
    icon: Layers,
  },
  {
    name: "RDS",
    path: "/rds",
    icon: Database,
  },
  {
    name: "S3 Storage",
    path: "/s3",
    icon: HardDrive,
  },
  {
    name: "CloudWatch",
    path: "/cloudwatch",
    icon: Activity,
  },
  {
    name: "Alarms",
    path: "/alarms",
    icon: Bell,
  },
  {
    name: "Logs",
    path: "/logs",
    icon: BarChart3,
  },
];

/* =========================================
   DEFAULT NOTIFICATION
========================================= */

const defaultNotification = {
  id: "system-startup",
  type: "success",
  severity: "success",
  title: "AWS Monitor Started",
  message:
    "AWS monitoring is ready and waiting for live AWS events.",
  resource: "AWS Monitor",
  service: "AWS Monitor",
  time: "Just now",
  timestamp: new Date().toISOString(),
  path: "/",
  read: true,
};

/* =========================================
   NOTIFICATION HELPERS
========================================= */

function getStoredNotifications() {
  try {
    const saved = localStorage.getItem(
      "aws-monitor-notifications"
    );

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(
      "Unable to load notifications:",
      error
    );
  }

  return [defaultNotification];
}

/* =========================================
   FORMAT TIME
========================================= */

function formatNotificationTime(notification) {
  if (notification?.time) {
    return notification.time;
  }

  if (notification?.timestamp) {
    const date = new Date(notification.timestamp);

    if (!Number.isNaN(date.getTime())) {
      const difference =
        Date.now() - date.getTime();

      const seconds = Math.floor(
        difference / 1000
      );

      if (seconds < 10) {
        return "Just now";
      }

      if (seconds < 60) {
        return `${seconds}s ago`;
      }

      const minutes = Math.floor(
        seconds / 60
      );

      if (minutes < 60) {
        return `${minutes}m ago`;
      }

      const hours = Math.floor(
        minutes / 60
      );

      if (hours < 24) {
        return `${hours}h ago`;
      }

      const days = Math.floor(
        hours / 24
      );

      return `${days}d ago`;
    }
  }

  return "Just now";
}

/* =========================================
   NOTIFICATION ROUTE
========================================= */

function getNotificationPath(notification) {
  const service =
    String(
      notification?.service || ""
    ).toLowerCase();

  const title =
    String(
      notification?.title || ""
    ).toLowerCase();

  const resource =
    String(
      notification?.resource || ""
    ).toLowerCase();

  /* Logs */

  if (
    service.includes("log") ||
    title.includes("log") ||
    resource.includes("log")
  ) {
    return "/logs";
  }

  /* CloudWatch */

  if (
    service.includes("cloudwatch") ||
    title.includes("alarm") ||
    title.includes("cloudwatch")
  ) {
    return "/alarms";
  }

  /* EC2 */

  if (
    service.includes("ec2") ||
    resource.includes("ec2") ||
    resource.startsWith("i-") ||
    title.includes("ec2") ||
    title.includes("cpu") ||
    title.includes("instance") ||
    title.includes("status check")
  ) {
    return "/ec2";
  }

  /* Lambda */

  if (
    service.includes("lambda")
  ) {
    return "/lambda";
  }

  /* RDS */

  if (
    service.includes("rds")
  ) {
    return "/rds";
  }

  /* S3 */

  if (
    service.includes("s3")
  ) {
    return "/s3";
  }

  return "/";
}

/* =========================================
   NOTIFICATION PANEL
========================================= */

function NotificationPanel({
  notifications,
  loading,
  error,
  onClose,
  onRefresh,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
}) {
  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  return (
    <div className="notification-panel">

      {/* HEADER */}

      <div className="notification-header">

        <div>

          <h3>
            Notifications
          </h3>

          <span>
            {loading
              ? "Checking AWS..."
              : error
                ? "AWS connection issue"
                : "Live AWS monitoring"}
          </span>

        </div>

        <button
          className="notification-close"
          onClick={onClose}
          aria-label="Close notifications"
        >
          ×
        </button>

      </div>

      {/* ACTION BAR */}

      {notifications.length > 0 && (
        <div className="notification-actions">

          <button
            onClick={onMarkAllRead}
          >
            <Check size={15} />
            Mark all as read
          </button>

          <button
            onClick={onClearAll}
          >
            <Trash2 size={15} />
            Clear all
          </button>

        </div>
      )}

      {/* CONTENT */}

      {notifications.length === 0 ? (

        <div className="notification-empty">

          <CheckCircle2 size={32} />

          <strong>
            No notifications
          </strong>

          <span>
            Everything looks good.
          </span>

        </div>

      ) : (

        <div className="notification-list">

          {notifications.map(
            (notification) => {

              const type =
                notification.type ||
                notification.severity ||
                "success";

              const NotificationIcon =
                type === "critical"
                  ? XCircle
                  : type === "warning"
                    ? AlertTriangle
                    : CheckCircle2;

              return (
                <button
                  key={
                    notification.id
                  }
                  className={`notification-item ${
                    !notification.read
                      ? "unread"
                      : "read"
                  }`}
                  onClick={() =>
                    onNotificationClick(
                      notification
                    )
                  }
                >

                  {/* ICON */}

                  <div
                    className={`notification-icon ${type}`}
                  >
                    <NotificationIcon
                      size={17}
                    />
                  </div>

                  {/* CONTENT */}

                  <div className="notification-content">

                    <div className="notification-title">

                      <strong>
                        {
                          notification.title
                        }
                      </strong>

                      {!notification.read && (
                        <span className="unread-dot" />
                      )}

                    </div>

                    <p>
                      {
                        notification.message
                      }
                    </p>

                    <small>

                      {notification.resource &&
                        `${notification.resource} · `}

                      {formatNotificationTime(
                        notification
                      )}

                    </small>

                  </div>

                  <ExternalLink
                    size={15}
                  />

                </button>
              );
            }
          )}

        </div>
      )}

      {/* FOOTER */}

      <div className="notification-footer">

        <span>
          {unreadCount > 0
            ? `${unreadCount} unread`
            : "All caught up"}
        </span>

        <button
          onClick={onRefresh}
          disabled={loading}
        >
          {loading
            ? "Checking..."
            : "Refresh"}
        </button>

      </div>

    </div>
  );
}

/* =========================================
   PROFILE MENU
========================================= */

function ProfileMenu({
  theme,
  onThemeToggle,
  onClose,
}) {
  const navigate = useNavigate();

  const goToSettings = () => {
    onClose();
    navigate("/settings");
  };

  return (
    <div className="profile-menu">

      {/* PROFILE */}

      <div className="profile-top">

        <div className="profile-large-avatar">
          MV
        </div>

        <div>

          <strong>
            Mohan Vishwakarma
          </strong>

          <span>
            AWS Monitor
          </span>

        </div>

      </div>

      <div className="profile-divider" />

      {/* INFORMATION */}

      <div className="profile-info">

        <div>
          <User size={16} />
          <span>
            Monitoring User
          </span>
        </div>

        <div>
          <Cloud size={16} />
          <span>
            Production · ap-south-1
          </span>
        </div>

      </div>

      {/* THEME */}

      <button
        className="profile-menu-item"
        onClick={onThemeToggle}
      >

        {theme === "dark" ? (
          <Sun size={17} />
        ) : (
          <Moon size={17} />
        )}

        <span>
          {theme === "dark"
            ? "Light Mode"
            : "Dark Mode"}
        </span>

      </button>

      {/* SETTINGS */}

      <button
        className="profile-settings-button"
        onClick={goToSettings}
      >

        <Settings size={17} />

        Settings

      </button>

      {/* CLOSE */}

      <button
        className="profile-close-button"
        onClick={onClose}
      >
        Close
      </button>

    </div>
  );
}

/* =========================================
   LAYOUT
========================================= */

function Layout() {

  const location = useLocation();

  const navigate = useNavigate();

  /* =======================================
     THEME
  ======================================== */

  const [theme, setTheme] =
    useState(() => {
      return (
        localStorage.getItem(
          "aws-monitor-theme"
        ) || "dark"
      );
    });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "aws-monitor-theme",
      theme
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  };

  /* =======================================
     NOTIFICATIONS
  ======================================== */

  const [notifications, setNotifications] =
    useState(
      getStoredNotifications
    );

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  const [
    notificationError,
    setNotificationError,
  ] = useState(false);

  const notificationRef =
    useRef(null);

  const profileRef =
    useRef(null);

  /* =======================================
     SAVE NOTIFICATIONS
  ======================================== */

  useEffect(() => {

    try {
      localStorage.setItem(
        "aws-monitor-notifications",
        JSON.stringify(
          notifications
        )
      );
    } catch (error) {
      console.error(
        "Unable to save notifications:",
        error
      );
    }

  }, [notifications]);

  /* =======================================
     FETCH AWS NOTIFICATIONS
  ======================================== */

  const fetchAWSNotifications =
    async () => {

      try {

        setNotificationLoading(true);

        setNotificationError(false);

        const response =
          await fetch(
            `${API_BASE}/notifications`
          );

        if (!response.ok) {
          throw new Error(
            `Notification API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          !data ||
          !data.success ||
          !Array.isArray(
            data.notifications
          )
        ) {
          throw new Error(
            "Invalid notification response"
          );
        }

        /*
         * Preserve read state from the
         * current browser session.
         */

        setNotifications(
          (current) => {

            const readMap =
              new Map(
                current.map(
                  (item) => [
                    item.id,
                    item.read,
                  ]
                )
              );

            return data.notifications.map(
              (item) => {

                const severity =
                  item.severity ||
                  item.type ||
                  "success";

                return {
                  ...item,

                  type: severity,

                  severity,

                  /*
                   * Healthy messages should
                   * not create an unread badge.
                   */

                  read:
                    severity ===
                    "success"
                      ? true
                      : readMap.get(
                          item.id
                        ) ?? false,

                  time:
                    item.time ||
                    formatNotificationTime(
                      item
                    ),

                  path:
                    item.path ||
                    getNotificationPath(
                      item
                    ),
                };
              }
            );
          }
        );

      } catch (error) {

        console.warn(
          "AWS notifications unavailable:",
          error.message
        );

        setNotificationError(true);

      } finally {

        setNotificationLoading(false);

      }
    };

  /* =======================================
     INITIAL LOAD + AUTO REFRESH
  ======================================== */

  useEffect(() => {

    fetchAWSNotifications();

    const interval =
      setInterval(() => {
        fetchAWSNotifications();
      }, 30000);

    return () => {
      clearInterval(interval);
    };

  }, []);

  /* =======================================
     UNREAD COUNT
  ======================================== */

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  /* =======================================
     MARK ALL READ
  ======================================== */

  const markAllAsRead = () => {

    setNotifications(
      (current) =>
        current.map(
          (notification) => ({
            ...notification,
            read: true,
          })
        )
    );

  };

  /* =======================================
     CLEAR ALL
  ======================================== */

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  /* =======================================
     CLICK NOTIFICATION
  ======================================== */

  const handleNotificationClick =
    (notification) => {

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    read: true,
                  }
                : item
          )
      );

      setNotificationOpen(false);

      const path =
        notification.path ||
        getNotificationPath(
          notification
        );

      navigate(path);
    };

  /* =======================================
     TOGGLE NOTIFICATIONS
  ======================================== */

  const toggleNotifications = () => {

    setNotificationOpen(
      (current) => !current
    );

    setProfileOpen(false);

  };

  /* =======================================
     TOGGLE PROFILE
  ======================================== */

  const toggleProfile = () => {

    setProfileOpen(
      (current) => !current
    );

    setNotificationOpen(false);

  };

  /* =======================================
     OUTSIDE CLICK
  ======================================== */

  useEffect(() => {

    const handleOutsideClick =
      (event) => {

        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            event.target
          )
        ) {
          setNotificationOpen(
            false
          );
        }

        if (
          profileRef.current &&
          !profileRef.current.contains(
            event.target
          )
        ) {
          setProfileOpen(false);
        }

      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);

  /* =======================================
     RETURN
  ======================================== */

  return (
    <div className="app">

      {/* ===================================
          SIDEBAR
      ==================================== */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="logo">

          <img
            src={vcnowLogo}
            alt="VC Now"
            className="company-logo"
          />

        </div>

        {/* WORKSPACE */}

        <div className="workspace">

          <span>
            WORKSPACE
          </span>

          <div className="workspace-box">

            <div className="aws-dot" />

            <div>

              <strong>
                Production
              </strong>

              <small>
                ap-south-1
              </small>

            </div>

            <span className="online-dot" />

          </div>

        </div>

        {/* NAVIGATION */}

        <nav>

          {navigation.map(
            (item) => {

              const Icon =
                item.icon;

              const isActive =
                location.pathname ===
                item.path;

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                >

                  <Icon size={18} />

                  <span>
                    {item.name}
                  </span>

                  {item.name ===
                    "Alarms" &&
                    unreadCount > 0 && (
                      <span className="alarm-count">
                        {unreadCount >
                        99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}

                </NavLink>
              );
            }
          )}

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <div className="system-status">

            <ShieldCheck size={18} />

            <div>

              <strong>
                AWS Monitoring
              </strong>

              <span>
                {notificationError
                  ? "Connection issue"
                  : "Live monitoring active"}
              </span>

            </div>

          </div>

          <NavLink
            to="/settings"
            className={`nav-item ${
              location.pathname ===
              "/settings"
                ? "active"
                : ""
            }`}
          >

            <Settings size={18} />

            <span>
              Settings
            </span>

          </NavLink>

        </div>

      </aside>

      {/* ===================================
          MAIN
      ==================================== */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div className="mobile-menu">
            <Menu size={22} />
          </div>

          <div>

            <h1>
              AWS Monitor
            </h1>

            <p>
              AWS infrastructure monitoring
            </p>

          </div>

          <div className="header-actions">

            {/* LIVE */}

            <div className="live-status">

              <span />

              LIVE

            </div>

            {/* REGION */}

            <select
              value="ap-south-1"
              onChange={() => {}}
              aria-label="AWS Region"
            >

              <option value="ap-south-1">
                Mumbai · ap-south-1
              </option>

              <option value="us-east-1">
                N. Virginia · us-east-1
              </option>

              <option value="us-west-2">
                Oregon · us-west-2
              </option>

            </select>

            {/* THEME */}

            <button
              className="icon-button"
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label="Toggle theme"
            >

              {theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}

            </button>

            {/* =================================
                NOTIFICATIONS
            ================================== */}

            <div
              className="notification-wrapper"
              ref={notificationRef}
            >

              <button
                className={`icon-button ${
                  notificationOpen
                    ? "active"
                    : ""
                }`}
                onClick={
                  toggleNotifications
                }
                aria-label="Open notifications"
                title="Notifications"
              >

                <Bell size={19} />

                {unreadCount > 0 && (
                  <span className="notification-badge">

                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}

                  </span>
                )}

              </button>

              {notificationOpen && (

                <NotificationPanel
                  notifications={
                    notifications
                  }
                  loading={
                    notificationLoading
                  }
                  error={
                    notificationError
                  }
                  onClose={() =>
                    setNotificationOpen(
                      false
                    )
                  }
                  onRefresh={
                    fetchAWSNotifications
                  }
                  onMarkAllRead={
                    markAllAsRead
                  }
                  onClearAll={
                    clearAllNotifications
                  }
                  onNotificationClick={
                    handleNotificationClick
                  }
                />

              )}

            </div>

            {/* =================================
                MV PROFILE
            ================================== */}

            <div
              className="profile-wrapper"
              ref={profileRef}
            >

              <button
                className={`avatar ${
                  profileOpen
                    ? "active"
                    : ""
                }`}
                onClick={
                  toggleProfile
                }
                aria-label="Open profile"
                title="Profile"
              >
                MV
              </button>

              {profileOpen && (

                <ProfileMenu
                  theme={theme}
                  onThemeToggle={
                    toggleTheme
                  }
                  onClose={() =>
                    setProfileOpen(
                      false
                    )
                  }
                />

              )}

            </div>

          </div>

        </header>

        {/* ===================================
            ROUTES
        ==================================== */}

        <Routes>

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/ec2"
            element={<EC2 />}
          />

          <Route
            path="/lambda"
            element={<Lambda />}
          />

          <Route
            path="/rds"
            element={<RDS />}
          />

          <Route
            path="/s3"
            element={<S3 />}
          />

          <Route
            path="/cloudwatch"
            element={<CloudWatch />}
          />

          <Route
            path="/alarms"
            element={<Alarms />}
          />

          <Route
            path="/logs"
            element={<Logs />}
          />

          <Route
            path="/settings"
            element={<SettingsPage />}
          />

        </Routes>

      </main>

    </div>
  );
}

/* =========================================
   APP
========================================= */

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;