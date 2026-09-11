import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Cloud,
  Shield,
  User,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  Zap,
  FileText,
  Network,
  Activity,
  Save,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const DEFAULT_SETTINGS = {
  autoRefresh: true,
  refreshInterval: 30,
  notifications: true,
};

const SERVICE_META = {
  ec2: {
    name: "EC2",
    description: "Elastic Compute Cloud",
    icon: Server,
  },

  cloudwatch: {
    name: "CloudWatch",
    description: "Metrics and monitoring",
    icon: Activity,
  },

  s3: {
    name: "S3",
    description: "Object storage",
    icon: Cloud,
  },

  rds: {
    name: "RDS",
    description: "Relational databases",
    icon: Database,
  },

  lambda: {
    name: "Lambda",
    description: "Serverless functions",
    icon: Zap,
  },

  logs: {
    name: "CloudWatch Logs",
    description: "Application and system logs",
    icon: FileText,
  },

  elb: {
    name: "Load Balancer",
    description: "Application load balancing",
    icon: Network,
  },

  alarms: {
    name: "CloudWatch Alarms",
    description: "Monitoring alarms",
    icon: Bell,
  },
};

function Settings() {
  const [settings, setSettings] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            "aws-monitor-settings"
          );

        return saved
          ? {
              ...DEFAULT_SETTINGS,
              ...JSON.parse(saved),
            }
          : DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    });

  const [services, setServices] =
    useState({});

  const [region, setRegion] =
    useState("ap-south-1");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =====================================================
     SAVE SETTINGS
  ===================================================== */

  const saveSettings = (
    newSettings
  ) => {
    setSettings(newSettings);

    localStorage.setItem(
      "aws-monitor-settings",
      JSON.stringify(newSettings)
    );

    setMessage(
      "Settings saved successfully."
    );

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  /* =====================================================
     LOAD AWS SERVICE STATUS
  ===================================================== */

  const loadServiceStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/services/status`
      );

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          "Unable to read service status"
        );
      }

      setServices(
        data.services || {}
      );

      setRegion(
        data.region ||
          "ap-south-1"
      );

      setError("");

      setLastUpdated(
        new Date()
      );
    } catch (err) {
      console.error(
        "Service status error:",
        err
      );

      setError(
        "Unable to connect to the AWS Monitor backend."
      );

      setServices({});
    }

    setLoading(false);
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadServiceStatus();
  }, []);

  /* =====================================================
     AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    if (!settings.autoRefresh) {
      return;
    }

    const interval =
      setInterval(() => {
        loadServiceStatus();
      }, settings.refreshInterval * 1000);

    return () =>
      clearInterval(interval);
  }, [
    settings.autoRefresh,
    settings.refreshInterval,
  ]);

  /* =====================================================
     MANUAL REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadServiceStatus();

    setRefreshing(false);
  };

  /* =====================================================
     SERVICE COUNTS
  ===================================================== */

  const serviceKeys =
    Object.keys(SERVICE_META);

  const liveServices =
    serviceKeys.filter(
      (key) =>
        services[key]?.available ===
        true
    ).length;

  const fallbackServices =
    serviceKeys.filter(
      (key) =>
        services[key]?.available ===
        false
    ).length;

  const monitoredServices =
    liveServices +
    fallbackServices;

  /* =====================================================
     OVERALL STATUS
  ===================================================== */

  const overallStatus =
    liveServices ===
    monitoredServices &&
    monitoredServices > 0
      ? "All services connected"
      : liveServices > 0
        ? "Partial AWS access"
        : "Fallback mode";

  const overallHealthy =
    liveServices ===
    monitoredServices &&
    monitoredServices > 0;

  return (
    <div className="page-content">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-heading">

        <div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <h2>
              Settings
            </h2>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,

                background:
                  overallHealthy
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(245,158,11,0.1)",

                color:
                  overallHealthy
                    ? "#22c55e"
                    : "#f59e0b",

                border:
                  overallHealthy
                    ? "1px solid rgba(34,197,94,0.2)"
                    : "1px solid rgba(245,158,11,0.2)",
              }}
            >

              {overallHealthy ? (
                <CheckCircle2
                  size={12}
                />
              ) : (
                <AlertTriangle
                  size={12}
                />
              )}

              {overallStatus}

            </span>

          </div>

          <p>
            Manage your AWS Monitor
            configuration
          </p>

        </div>

        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >

          <RefreshCw
            size={16}
            style={{
              animation: refreshing
                ? "spin 0.8s linear infinite"
                : "none",
            }}
          />

          {refreshing
            ? "Checking..."
            : "Test Connection"}

        </button>

      </div>

      {/* =================================================
          SAVE MESSAGE
      ================================================= */}

      {message && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 15px",
            marginBottom: "18px",
            borderRadius: "9px",
            background:
              "rgba(34,197,94,0.06)",
            border:
              "1px solid rgba(34,197,94,0.15)",
            color: "#22c55e",
            fontSize: "13px",
          }}
        >

          <CheckCircle2
            size={16}
          />

          {message}

        </div>
      )}

      {/* =================================================
          BACKEND ERROR
      ================================================= */}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            padding: "12px 15px",
            marginBottom: "18px",
            borderRadius: "9px",
            background:
              "rgba(245,158,11,0.06)",
            border:
              "1px solid rgba(245,158,11,0.15)",
            color: "#fbbf24",
            fontSize: "13px",
          }}
        >

          <AlertTriangle
            size={16}
          />

          {error}

        </div>
      )}

      {/* =================================================
          AWS CONFIGURATION
      ================================================= */}

      <div className="bottom-grid">

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                AWS Configuration
              </h3>

              <p>
                Monitoring environment
              </p>

            </div>

            <Cloud size={20} />

          </div>

          <div className="service-list">

            {/* REGION */}

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <Cloud size={17} />
                </div>

                <div>

                  <strong>
                    AWS Region
                  </strong>

                  <span>
                    Asia Pacific · Mumbai
                  </span>

                </div>

              </div>

              <strong
                style={{
                  color: "#a78bfa",
                }}
              >
                {region}
              </strong>

            </div>

            {/* ACCESS */}

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <Shield size={17} />
                </div>

                <div>

                  <strong>
                    Access Mode
                  </strong>

                  <span>
                    Read-only monitoring
                  </span>

                </div>

              </div>

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#22c55e",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >

                <CheckCircle2
                  size={14}
                />

                Enabled

              </span>

            </div>

            {/* BACKEND */}

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <Server size={17} />
                </div>

                <div>

                  <strong>
                    Monitor Backend
                  </strong>

                  <span>
                    Node.js · Port 5000
                  </span>

                </div>

              </div>

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#22c55e",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >

                <span className="health-dot healthy" />

                Connected

              </span>

            </div>

          </div>

        </div>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Notifications
              </h3>

              <p>
                Configure monitoring alerts
              </p>

            </div>

            <Bell size={20} />

          </div>

          <div className="service-list">

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <Bell size={17} />
                </div>

                <div>

                  <strong>
                    Alarm Notifications
                  </strong>

                  <span>
                    Receive CloudWatch
                    alert notifications
                  </span>

                </div>

              </div>

              <button
                onClick={() =>
                  saveSettings({
                    ...settings,
                    notifications:
                      !settings.notifications,
                  })
                }
                style={{
                  border: "none",
                  cursor: "pointer",
                  width: "44px",
                  height: "24px",
                  borderRadius: "999px",
                  padding: "3px",

                  background:
                    settings.notifications
                      ? "#7c3aed"
                      : "#27272a",

                  transition:
                    "0.2s",
                }}
              >

                <span
                  style={{
                    display: "block",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background:
                      "#ffffff",

                    transform:
                      settings.notifications
                        ? "translateX(20px)"
                        : "translateX(0)",

                    transition:
                      "0.2s",
                  }}
                />

              </button>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          SERVICE PERMISSIONS
      ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h3>
              AWS Service Permissions
            </h3>

            <p>
              Live permission and connectivity
              status
            </p>

          </div>

          <Shield size={20} />

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "12px",
            marginTop: "8px",
          }}
        >

          {serviceKeys.map(
            (key) => {

              const meta =
                SERVICE_META[key];

              const Icon =
                meta.icon;

              const service =
                services[key];

              const isLive =
                service?.available ===
                true;

              const isKnown =
                service !==
                undefined;

              return (
                <div
                  key={key}
                  style={{
                    padding: "15px",
                    borderRadius: "10px",

                    background:
                      isLive
                        ? "rgba(34,197,94,0.035)"
                        : "rgba(245,158,11,0.035)",

                    border:
                      isLive
                        ? "1px solid rgba(34,197,94,0.12)"
                        : "1px solid rgba(245,158,11,0.12)",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "10px",
                      }}
                    >

                      <div
                        className="service-icon"
                      >
                        <Icon
                          size={17}
                        />
                      </div>

                      <div>

                        <strong
                          style={{
                            display:
                              "block",
                            color:
                              "#e4e4e7",
                            fontSize:
                              "13px",
                          }}
                        >
                          {meta.name}
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "3px",
                            color:
                              "#71717a",
                            fontSize:
                              "11px",
                          }}
                        >
                          {
                            meta.description
                          }
                        </span>

                      </div>

                    </div>

                    {isKnown ? (
                      <span
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: "5px",

                          padding:
                            "4px 8px",

                          borderRadius:
                            "999px",

                          fontSize:
                            "10px",

                          fontWeight:
                            700,

                          color:
                            isLive
                              ? "#22c55e"
                              : "#f59e0b",

                          background:
                            isLive
                              ? "rgba(34,197,94,0.08)"
                              : "rgba(245,158,11,0.08)",
                        }}
                      >

                        <span
                          style={{
                            width:
                              "5px",
                            height:
                              "5px",
                            borderRadius:
                              "50%",
                            background:
                              isLive
                                ? "#22c55e"
                                : "#f59e0b",
                          }}
                        />

                        {isLive
                          ? "LIVE"
                          : "FALLBACK"}

                      </span>
                    ) : (
                      <span
                        style={{
                          color:
                            "#71717a",
                          fontSize:
                            "11px",
                        }}
                      >
                        Checking...
                      </span>
                    )}

                  </div>

                  {isKnown &&
                    !isLive && (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          paddingTop:
                            "9px",
                          borderTop:
                            "1px solid rgba(255,255,255,0.05)",
                          fontSize:
                            "10px",
                          color:
                            "#a1a1aa",
                        }}
                      >
                        AWS permission
                        required for
                        live data
                      </div>
                    )}

                </div>
              );
            }
          )}

        </div>

      </div>

      {/* =================================================
          REFRESH SETTINGS
      ================================================= */}

      <div className="bottom-grid">

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Dashboard Refresh
              </h3>

              <p>
                Control automatic data updates
              </p>

            </div>

            <RefreshCw size={20} />

          </div>

          <div className="service-list">

            {/* AUTO REFRESH */}

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <Activity size={17} />
                </div>

                <div>

                  <strong>
                    Auto Refresh
                  </strong>

                  <span>
                    Automatically update AWS
                    service data
                  </span>

                </div>

              </div>

              <button
                onClick={() =>
                  saveSettings({
                    ...settings,
                    autoRefresh:
                      !settings.autoRefresh,
                  })
                }
                style={{
                  border: "none",
                  cursor: "pointer",
                  width: "44px",
                  height: "24px",
                  borderRadius:
                    "999px",
                  padding: "3px",

                  background:
                    settings.autoRefresh
                      ? "#7c3aed"
                      : "#27272a",
                }}
              >

                <span
                  style={{
                    display: "block",
                    width: "18px",
                    height: "18px",
                    borderRadius:
                      "50%",
                    background:
                      "#ffffff",

                    transform:
                      settings.autoRefresh
                        ? "translateX(20px)"
                        : "translateX(0)",

                    transition:
                      "0.2s",
                  }}
                />

              </button>

            </div>

            {/* INTERVAL */}

            <div className="service-row">

              <div className="service-info">

                <div className="service-icon">
                  <RefreshCw size={17} />
                </div>

                <div>

                  <strong>
                    Refresh Interval
                  </strong>

                  <span>
                    How frequently the
                    dashboard checks AWS
                  </span>

                </div>

              </div>

              <select
                value={
                  settings.refreshInterval
                }
                onChange={(e) =>
                  saveSettings({
                    ...settings,
                    refreshInterval:
                      Number(
                        e.target.value
                      ),
                  })
                }
                style={{
                  height: "34px",
                  padding:
                    "0 10px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  background:
                    "#111118",
                  color:
                    "#d4d4d8",
                  outline: "none",
                  cursor:
                    "pointer",
                }}
              >

                <option value={15}>
                  15 seconds
                </option>

                <option value={30}>
                  30 seconds
                </option>

                <option value={60}>
                  60 seconds
                </option>

              </select>

            </div>

          </div>

        </div>

        {/* =================================================
            CURRENT STATUS
        ================================================= */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Monitoring Status
              </h3>

              <p>
                Current dashboard configuration
              </p>

            </div>

            <Shield size={20} />

          </div>

          <div
            style={{
              display: "grid",
              gap: "11px",
              marginTop: "10px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                padding: "12px",
                borderRadius: "8px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >

              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                }}
              >
                AWS Region
              </span>

              <strong
                style={{
                  color: "#a78bfa",
                  fontSize: "12px",
                }}
              >
                {region}
              </strong>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                padding: "12px",
                borderRadius: "8px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >

              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                }}
              >
                AWS Services
              </span>

              <strong
                style={{
                  color:
                    liveServices > 0
                      ? "#22c55e"
                      : "#f59e0b",
                  fontSize: "12px",
                }}
              >
                {liveServices}/
                {serviceKeys.length} live
              </strong>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                padding: "12px",
                borderRadius: "8px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >

              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                }}
              >
                Auto Refresh
              </span>

              <strong
                style={{
                  color:
                    settings.autoRefresh
                      ? "#22c55e"
                      : "#71717a",
                  fontSize: "12px",
                }}
              >
                {settings.autoRefresh
                  ? `${settings.refreshInterval}s`
                  : "Disabled"}
              </strong>

            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                padding: "12px",
                borderRadius: "8px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >

              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "12px",
                }}
              >
                Notifications
              </span>

              <strong
                style={{
                  color:
                    settings.notifications
                      ? "#22c55e"
                      : "#71717a",
                  fontSize: "12px",
                }}
              >
                {settings.notifications
                  ? "Enabled"
                  : "Disabled"}
              </strong>

            </div>

          </div>

          {lastUpdated && (
            <div
              style={{
                marginTop: "14px",
                fontSize: "11px",
                color: "#52525b",
              }}
            >
              Last connection check:{" "}
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}

        </div>

      </div>

      {/* =================================================
          PROFILE
      ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h3>
              User Profile
            </h3>

            <p>
              Dashboard account
            </p>

          </div>

          <User size={20} />

        </div>

        <div className="service-row">

          <div className="service-info">

            <div className="service-icon">
              <User size={17} />
            </div>

            <div>

              <strong>
                AWS Monitor Admin
              </strong>

              <span>
                Monitoring administrator
              </span>

            </div>

          </div>

          <span
            style={{
              color: "#71717a",
              fontSize: "11px",
            }}
          >
            Read-only dashboard
          </span>

        </div>

      </div>

      {/* =================================================
          SECURITY NOTE
      ================================================= */}

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          alignItems: "flex-start",
          gap: "11px",
          padding: "14px 16px",
          borderRadius: "10px",
          background:
            "rgba(139,92,246,0.05)",
          border:
            "1px solid rgba(139,92,246,0.13)",
        }}
      >

        <Shield
          size={18}
          style={{
            color: "#a78bfa",
            flexShrink: 0,
            marginTop: "2px",
          }}
        />

        <div>

          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#d4d4d8",
              marginBottom: "4px",
            }}
          >
            Read-only monitoring
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#71717a",
            }}
          >
            AWS credentials remain on the
            backend. The browser only receives
            monitoring data and service status.
            Missing AWS permissions automatically
            switch individual services to fallback
            mode without taking down the dashboard.
          </div>

        </div>

      </div>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

    </div>
  );
}

export default Settings;