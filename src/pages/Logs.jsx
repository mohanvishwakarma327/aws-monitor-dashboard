import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Search,
  Terminal,
  AlertTriangle,
  Info,
  XCircle,
  RefreshCw,
  Cloud,
  CheckCircle2,
  Database,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const fallbackLogs = [
  {
    time: "14:32:01",
    level: "INFO",
    message:
      "Application health check completed successfully",
  },
  {
    time: "14:31:48",
    level: "INFO",
    message:
      "Request processed successfully · status 200",
  },
  {
    time: "14:31:32",
    level: "WARN",
    message:
      "High memory utilization detected",
  },
  {
    time: "14:30:54",
    level: "INFO",
    message:
      "Database connection established",
  },
  {
    time: "14:30:21",
    level: "ERROR",
    message:
      "Request timeout from upstream service",
  },
  {
    time: "14:29:58",
    level: "INFO",
    message:
      "User authentication completed",
  },
  {
    time: "14:29:41",
    level: "INFO",
    message:
      "CloudWatch agent metrics submitted",
  },
];

function formatTime(timestamp) {
  if (!timestamp) return "--:--:--";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}

function Logs() {
  const [logGroups, setLogGroups] = useState([]);
  const [logs, setLogs] = useState(fallbackLogs);

  const [selectedGroup, setSelectedGroup] =
    useState("");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [available, setAvailable] =
    useState(false);

  const [source, setSource] =
    useState("fallback");

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  /* =====================================================
     LOAD LOG GROUPS
  ===================================================== */

  const loadLogGroups = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/logs/groups`
      );

      const data = await response.json();

      if (
        data.success &&
        Array.isArray(data.data?.groups)
      ) {
        setLogGroups(data.data.groups);

        setAvailable(
          data.available === true
        );

        setSource(
          data.source || "fallback"
        );

        setError(
          data.available === false
            ? "AWS CloudWatch Logs permission is not available. Showing fallback data."
            : ""
        );

        if (
          data.data.groups.length > 0
        ) {
          setSelectedGroup((current) => {
            if (
              current &&
              data.data.groups.some(
                (group) =>
                  group.name === current
              )
            ) {
              return current;
            }

            return data.data.groups[0].name;
          });
        }
      } else {
        throw new Error(
          "Invalid log group response"
        );
      }
    } catch (err) {
      console.error(
        "Log groups error:",
        err
      );

      setAvailable(false);
      setSource("fallback");

      setError(
        "CloudWatch Logs unavailable. Showing fallback data."
      );

      setLogGroups([
        {
          name: "/aws/ec2/production",
          storedBytes: 0,
          retentionDays: 30,
        },
        {
          name:
            "/aws/lambda/api-production",
          storedBytes: 0,
          retentionDays: 30,
        },
        {
          name: "/aws/rds/production",
          storedBytes: 0,
          retentionDays: 30,
        },
      ]);

      setSelectedGroup(
        "/aws/ec2/production"
      );
    }
  };

  /* =====================================================
     LOAD LOG EVENTS
  ===================================================== */

  const loadLogEvents = async (
    groupName
  ) => {
    if (!groupName) {
      setLogs(fallbackLogs);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/logs/events?logGroupName=${encodeURIComponent(
          groupName
        )}`
      );

      const data = await response.json();

      if (
        data.success &&
        data.available === true &&
        Array.isArray(data.data?.events)
      ) {
        const realLogs =
          data.data.events.map(
            (event) => ({
              time: formatTime(
                event.timestamp
              ),

              level:
                detectLogLevel(
                  event.message
                ),

              message:
                event.message ||
                "Log event received",

              timestamp:
                event.timestamp,
            })
          );

        setLogs(realLogs);

        setAvailable(true);
        setSource("aws");
        setError("");
      } else {
        setLogs(fallbackLogs);

        setAvailable(false);
        setSource("fallback");

        if (
          data.message ||
          data.error
        ) {
          setError(
            "AWS log events are unavailable. Showing fallback data."
          );
        }
      }
    } catch (err) {
      console.error(
        "Log events error:",
        err
      );

      setLogs(fallbackLogs);

      setAvailable(false);
      setSource("fallback");

      setError(
        "Unable to load CloudWatch log events. Showing fallback data."
      );
    }
  };

  /* =====================================================
     DETECT LOG LEVEL
  ===================================================== */

  const detectLogLevel = (
    message = ""
  ) => {
    const text =
      message.toLowerCase();

    if (
      text.includes("error") ||
      text.includes("exception") ||
      text.includes("failed") ||
      text.includes("failure")
    ) {
      return "ERROR";
    }

    if (
      text.includes("warn") ||
      text.includes("warning")
    ) {
      return "WARN";
    }

    return "INFO";
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  const loadData = async () => {
    setLoading(true);

    await loadLogGroups();

    setLastUpdated(new Date());

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     LOAD EVENTS WHEN GROUP CHANGES
  ===================================================== */

  useEffect(() => {
    if (selectedGroup) {
      loadLogEvents(selectedGroup);
    }
  }, [selectedGroup]);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadData();

    if (selectedGroup) {
      await loadLogEvents(
        selectedGroup
      );
    }

    setLastUpdated(new Date());

    setRefreshing(false);
  };

  /* =====================================================
     AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    const interval =
      setInterval(() => {
        if (selectedGroup) {
          loadLogEvents(
            selectedGroup
          );

          setLastUpdated(
            new Date()
          );
        }
      }, 30000);

    return () =>
      clearInterval(interval);
  }, [selectedGroup]);

  /* =====================================================
     FILTER LOGS
  ===================================================== */

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.message
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        log.level
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesLevel =
        levelFilter === "ALL" ||
        log.level === levelFilter;

      return (
        matchesSearch &&
        matchesLevel
      );
    });
  }, [
    logs,
    search,
    levelFilter,
  ]);

  /* =====================================================
     LOG COUNTS
  ===================================================== */

  const infoCount = logs.filter(
    (log) =>
      log.level === "INFO"
  ).length;

  const warningCount = logs.filter(
    (log) =>
      log.level === "WARN"
  ).length;

  const errorCount = logs.filter(
    (log) =>
      log.level === "ERROR"
  ).length;

  /* =====================================================
     LOG GROUP DISPLAY
  ===================================================== */

  const displayedGroups =
    logGroups.length > 0
      ? logGroups
      : [
          {
            name: "/aws/ec2/production",
            storedBytes: 0,
            retentionDays: 30,
          },
          {
            name:
              "/aws/lambda/api-production",
            storedBytes: 0,
            retentionDays: 30,
          },
          {
            name: "/aws/rds/production",
            storedBytes: 0,
            retentionDays: 30,
          },
        ];

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
            }}
          >
            <h2>CloudWatch Logs</h2>

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
                  source === "aws"
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(245,158,11,0.1)",
                color:
                  source === "aws"
                    ? "#22c55e"
                    : "#f59e0b",
                border:
                  source === "aws"
                    ? "1px solid rgba(34,197,94,0.2)"
                    : "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Cloud size={12} />

              {source === "aws"
                ? "LIVE AWS"
                : "FALLBACK"}
            </span>
          </div>

          <p>
            Search and monitor CloudWatch
            application logs
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
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* =================================================
          DATA SOURCE STATUS
      ================================================= */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          padding: "12px 15px",
          borderRadius: "10px",
          background:
            source === "aws"
              ? "rgba(34,197,94,0.04)"
              : "rgba(245,158,11,0.04)",
          border:
            source === "aws"
              ? "1px solid rgba(34,197,94,0.12)"
              : "1px solid rgba(245,158,11,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            fontSize: "13px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background:
                source === "aws"
                  ? "#22c55e"
                  : "#f59e0b",
              boxShadow:
                source === "aws"
                  ? "0 0 8px rgba(34,197,94,0.7)"
                  : "0 0 8px rgba(245,158,11,0.6)",
            }}
          />

          <span
            style={{
              color: "#a1a1aa",
            }}
          >
            Data source:
          </span>

          <strong
            style={{
              color:
                source === "aws"
                  ? "#22c55e"
                  : "#f59e0b",
            }}
          >
            {source === "aws"
              ? "Live AWS CloudWatch Logs"
              : "Fallback Dashboard Data"}
          </strong>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#71717a",
          }}
        >
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Loading..."}
        </div>
      </div>

      {/* =================================================
          PERMISSION NOTICE
      ================================================= */}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "13px 15px",
            marginBottom: "20px",
            borderRadius: "10px",
            background:
              "rgba(245,158,11,0.06)",
            border:
              "1px solid rgba(245,158,11,0.15)",
            color: "#fbbf24",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle
            size={17}
            style={{
              flexShrink: 0,
              marginTop: "1px",
            }}
          />

          <span>{error}</span>
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">
                Log Groups
              </p>

              <h2>
                {logGroups.length ||
                  displayedGroups.length}
              </h2>
            </div>

            <div className="stat-icon purple">
              <Terminal size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Available CloudWatch log groups
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">
                Events
              </p>

              <h2>
                {logs.length}
              </h2>
            </div>

            <div className="stat-icon blue">
              <Activity size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Loaded log events
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">
                Warnings
              </p>

              <h2>
                {warningCount}
              </h2>
            </div>

            <div className="stat-icon orange">
              <AlertTriangle size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Warning events
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">
                Errors
              </p>

              <h2>
                {errorCount}
              </h2>
            </div>

            <div className="stat-icon red">
              <XCircle size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Events requiring investigation
          </p>
        </div>

      </div>

      {/* =================================================
          LOG EXPLORER
      ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>
            <h3>
              Log Explorer
            </h3>

            <p>
              {selectedGroup ||
                "/aws/ec2/production"}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >

            {/* LOG GROUP SELECTOR */}

            <select
              value={selectedGroup}
              onChange={(e) =>
                setSelectedGroup(
                  e.target.value
                )
              }
              style={{
                height: "36px",
                maxWidth: "280px",
                padding: "0 11px",
                borderRadius: "8px",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                background: "#111118",
                color: "#d4d4d8",
                outline: "none",
                fontSize: "12px",
              }}
            >
              {displayedGroups.map(
                (group) => (
                  <option
                    key={group.name}
                    value={group.name}
                  >
                    {group.name}
                  </option>
                )
              )}
            </select>

            {/* SEARCH */}

            <div className="search-box">
              <Search size={15} />

              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>

          </div>
        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="log-toolbar">

          {[
            ["ALL", "All"],
            ["INFO", "INFO"],
            ["WARN", "WARN"],
            ["ERROR", "ERROR"],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                className={`log-filter ${
                  levelFilter === value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setLevelFilter(value)
                }
              >
                {label}

                {value !== "ALL" && (
                  <span
                    style={{
                      marginLeft: "6px",
                      opacity: 0.65,
                    }}
                  >
                    {value === "INFO"
                      ? infoCount
                      : value === "WARN"
                        ? warningCount
                        : errorCount}
                  </span>
                )}
              </button>
            )
          )}

        </div>

        {/* =================================================
            LOG CONSOLE
        ================================================= */}

        <div className="log-console">

          {loading ? (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
                color: "#71717a",
              }}
            >
              Loading CloudWatch logs...
            </div>
          ) : filteredLogs.length ===
            0 ? (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
                color: "#71717a",
              }}
            >
              <Search
                size={25}
                style={{
                  marginBottom: "10px",
                  opacity: 0.5,
                }}
              />

              <div
                style={{
                  color: "#a1a1aa",
                  fontSize: "14px",
                }}
              >
                No log events found
              </div>

              <div
                style={{
                  fontSize: "12px",
                  marginTop: "5px",
                }}
              >
                Try changing your search or
                filter.
              </div>
            </div>
          ) : (
            filteredLogs.map(
              (log, index) => {
                const Icon =
                  log.level === "ERROR"
                    ? XCircle
                    : log.level ===
                        "WARN"
                      ? AlertTriangle
                      : Info;

                return (
                  <div
                    className="log-line"
                    key={`${log.time}-${index}`}
                  >
                    <span className="log-time">
                      {log.time}
                    </span>

                    <span
                      className={`log-level ${log.level.toLowerCase()}`}
                    >
                      <Icon size={12} />
                      {log.level}
                    </span>

                    <span className="log-message">
                      {log.message}
                    </span>
                  </div>
                );
              }
            )
          )}

        </div>

      </div>

      {/* =================================================
          BOTTOM GRID
      ================================================= */}

      <div className="bottom-grid">

        {/* LOG GROUPS */}

        <div className="panel">

          <div className="panel-header">

            <div>
              <h3>
                Log Groups
              </h3>

              <p>
                Available CloudWatch log groups
              </p>
            </div>

            <Terminal size={19} />

          </div>

          <div className="service-list">

            {displayedGroups
              .slice(0, 6)
              .map((group) => (
                <div
                  className="service-row"
                  key={group.name}
                  onClick={() =>
                    setSelectedGroup(
                      group.name
                    )
                  }
                  style={{
                    cursor: "pointer",
                  }}
                >

                  <div className="service-info">

                    <div className="service-icon">
                      <Terminal size={17} />
                    </div>

                    <div>
                      <strong>
                        {group.name}
                      </strong>

                      <span>
                        {formatBytes(
                          group.storedBytes
                        )}

                        {" · "}

                        {group.retentionDays
                          ? `${group.retentionDays} days retention`
                          : "Retention not configured"}
                      </span>
                    </div>

                  </div>

                  <span
                    className={`health-dot ${
                      source === "aws"
                        ? "healthy"
                        : ""
                    }`}
                  />

                </div>
              ))}

          </div>

        </div>

        {/* LOG HEALTH */}

        <div className="panel">

          <div className="panel-header">

            <div>
              <h3>
                Log Health
              </h3>

              <p>
                Recent log activity
              </p>
            </div>

            <Activity size={19} />

          </div>

          <div className="large-metric">

            {logs.length > 0
              ? `${(
                  ((infoCount +
                    warningCount) /
                    logs.length) *
                  100
                ).toFixed(1)}%`
              : "0%"}

          </div>

          <p className="metric-description">
            Events without an error level
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              marginTop: "18px",
              fontSize: "12px",
              color:
                errorCount === 0
                  ? "#22c55e"
                  : "#f59e0b",
            }}
          >
            {errorCount === 0 ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}

            {errorCount === 0
              ? "No error events detected"
              : `${errorCount} error event${
                  errorCount > 1
                    ? "s"
                    : ""
                } detected`}
          </div>

        </div>

      </div>

      {/* =================================================
          STORAGE INFORMATION
      ================================================= */}

      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >

        <div
          style={{
            padding: "15px",
            borderRadius: "10px",
            background:
              "rgba(255,255,255,0.025)",
            border:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#a1a1aa",
              fontSize: "12px",
            }}
          >
            <Database size={15} />

            Selected Log Group
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#e4e4e7",
              fontSize: "13px",
              fontWeight: 600,
              wordBreak: "break-all",
            }}
          >
            {selectedGroup ||
              "No log group selected"}
          </div>
        </div>

        <div
          style={{
            padding: "15px",
            borderRadius: "10px",
            background:
              "rgba(255,255,255,0.025)",
            border:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#a1a1aa",
              fontSize: "12px",
            }}
          >
            <Activity size={15} />

            Auto Refresh
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#22c55e",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Every 30 seconds
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

          @media (max-width: 900px) {
            .log-console {
              overflow-x: auto;
            }

            .log-line {
              min-width: 720px;
            }
          }
        `}
      </style>

    </div>
  );
}

export default Logs;