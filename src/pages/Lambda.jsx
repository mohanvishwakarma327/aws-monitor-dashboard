import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Layers,
  Zap,
  RefreshCw,
  Search,
  Cloud,
  CheckCircle2,
  Clock3,
  Cpu,
  HardDrive,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const fallbackFunctions = [
  {
    name: "api-production",
    runtime: "nodejs20.x",
    status: "Active",
    memory: 512,
    timeout: 30,
    codeSize: 0,
    lastModified: null,
  },
  {
    name: "user-authentication",
    runtime: "nodejs20.x",
    status: "Active",
    memory: 256,
    timeout: 15,
    codeSize: 0,
    lastModified: null,
  },
  {
    name: "image-processor",
    runtime: "python3.12",
    status: "Active",
    memory: 1024,
    timeout: 60,
    codeSize: 0,
    lastModified: null,
  },
  {
    name: "notification-service",
    runtime: "nodejs20.x",
    status: "Active",
    memory: 256,
    timeout: 30,
    codeSize: 0,
    lastModified: null,
  },
];

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) {
    return "—";
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

function Lambda() {
  const [functions, setFunctions] =
    useState(fallbackFunctions);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [source, setSource] =
    useState("fallback");

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  /* =====================================================
     LOAD LAMBDA FUNCTIONS
  ===================================================== */

  const loadFunctions = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/lambda/functions`
      );

      const data = await response.json();

      if (
        data.success &&
        Array.isArray(
          data.data?.functions
        )
      ) {
        setFunctions(
          data.data.functions
        );

        setSource(
          data.source || "fallback"
        );

        if (data.source === "aws") {
          setError("");
        } else {
          setError(
            "AWS Lambda permission is not available. Showing fallback data."
          );
        }
      } else {
        throw new Error(
          "Invalid Lambda response"
        );
      }
    } catch (err) {
      console.error(
        "Lambda loading error:",
        err
      );

      setFunctions(
        fallbackFunctions
      );

      setSource("fallback");

      setError(
        "Lambda is unavailable. Showing fallback dashboard data."
      );
    }

    setLastUpdated(new Date());
    setLoading(false);
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadFunctions();
  }, []);

  /* =====================================================
     AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadFunctions();
      }, 30000);

    return () =>
      clearInterval(interval);
  }, []);

  /* =====================================================
     MANUAL REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadFunctions();

    setRefreshing(false);
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredFunctions =
    useMemo(() => {
      const query =
        search.toLowerCase().trim();

      if (!query) {
        return functions;
      }

      return functions.filter(
        (fn) =>
          fn.name
            ?.toLowerCase()
            .includes(query) ||
          fn.runtime
            ?.toLowerCase()
            .includes(query) ||
          fn.state
            ?.toLowerCase()
            .includes(query) ||
          fn.status
            ?.toLowerCase()
            .includes(query)
      );
    }, [functions, search]);

  /* =====================================================
     STATS
  ===================================================== */

  const activeFunctions =
    functions.filter(
      (fn) =>
        (
          fn.state ||
          fn.status ||
          ""
        ).toLowerCase() ===
        "active"
    ).length;

  const totalMemory =
    functions.reduce(
      (total, fn) =>
        total +
        Number(fn.memory || 0),
      0
    );

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

            <h2>Lambda</h2>

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
            Monitor your serverless
            functions
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
          DATA SOURCE
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
              ? "Live AWS Lambda"
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

          <span>
            {error}
          </span>

        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <div className="stats-grid">

        {/* FUNCTIONS */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Functions
              </p>

              <h2>
                {functions.length}
              </h2>

            </div>

            <div className="stat-icon purple">
              <Zap size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Lambda functions
          </p>

          <div
            style={{
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#22c55e",
            }}
          >

            <CheckCircle2 size={13} />

            {activeFunctions} active

          </div>

        </div>

        {/* INVOCATIONS */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Invocations
              </p>

              <h2>—</h2>

            </div>

            <div className="stat-icon blue">
              <Activity size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Last 24 hours
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#71717a",
            }}
          >
            CloudWatch metric required
          </div>

        </div>

        {/* ERRORS */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Errors
              </p>

              <h2>—</h2>

            </div>

            <div className="stat-icon orange">
              <AlertTriangle size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Lambda execution errors
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#71717a",
            }}
          >
            CloudWatch metric required
          </div>

        </div>

        {/* DURATION */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Avg Duration
              </p>

              <h2>—</h2>

            </div>

            <div className="stat-icon green">
              <Clock3 size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Last 1 hour
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#71717a",
            }}
          >
            CloudWatch metric required
          </div>

        </div>

      </div>

      {/* =================================================
          LAMBDA FUNCTIONS
      ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h3>
              Lambda Functions
            </h3>

            <p>
              Function configuration
              overview
            </p>

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <div className="search-box">

              <Search size={15} />

              <input
                type="text"
                placeholder="Search functions..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <Zap size={19} />

          </div>

        </div>

        {/* FUNCTION LIST */}

        <div className="service-list">

          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#71717a",
              }}
            >
              Loading Lambda functions...
            </div>
          ) : filteredFunctions.length ===
            0 ? (
            <div
              style={{
                padding: "40px 20px",
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
                No Lambda functions found
              </div>

            </div>
          ) : (
            filteredFunctions.map(
              (fn) => {

                const state =
                  (
                    fn.state ||
                    fn.status ||
                    "Unknown"
                  ).toLowerCase();

                const isHealthy =
                  state === "active";

                return (
                  <div
                    className="service-row"
                    key={fn.name}
                  >

                    <div className="service-info">

                      <div className="service-icon">

                        <Layers
                          size={17}
                        />

                      </div>

                      <div>

                        <strong>
                          {fn.name}
                        </strong>

                        <span>
                          {fn.runtime ||
                            "Unknown runtime"}

                          {" · "}

                          {fn.memory
                            ? `${fn.memory} MB`
                            : "Memory —"}

                          {" · "}

                          {fn.timeout
                            ? `${fn.timeout}s timeout`
                            : "Timeout —"}

                        </span>

                      </div>

                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        color:
                          isHealthy
                            ? "#22c55e"
                            : "#f59e0b",
                      }}
                    >

                      <span
                        className={`health-dot ${
                          isHealthy
                            ? "healthy"
                            : "warning"
                        }`}
                      />

                      {fn.state ||
                        fn.status ||
                        "Unknown"}

                    </div>

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

        {/* RUNTIME OVERVIEW */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Runtime Overview
              </h3>

              <p>
                Lambda runtime distribution
              </p>

            </div>

            <Cpu size={19} />

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginTop: "10px",
            }}
          >

            {[
              "nodejs20.x",
              "nodejs22.x",
              "python3.12",
              "python3.13",
            ].map((runtime) => {

              const count =
                functions.filter(
                  (fn) =>
                    fn.runtime ===
                    runtime
                ).length;

              return (
                <div
                  key={runtime}
                  style={{
                    padding: "14px",
                    borderRadius: "9px",
                    background:
                      "rgba(255,255,255,0.025)",
                    border:
                      "1px solid rgba(255,255,255,0.06)",
                  }}
                >

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#71717a",
                    }}
                  >
                    {runtime}
                  </div>

                  <div
                    style={{
                      marginTop: "7px",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#e4e4e7",
                    }}
                  >
                    {count}
                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* RESOURCE OVERVIEW */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Resource Overview
              </h3>

              <p>
                Lambda configuration
              </p>

            </div>

            <HardDrive size={19} />

          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "10px",
            }}
          >

            <div
              style={{
                padding: "13px",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >

              <div
                style={{
                  fontSize: "11px",
                  color: "#71717a",
                }}
              >
                Configured Memory
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#e4e4e7",
                }}
              >
                {totalMemory > 0
                  ? `${totalMemory} MB`
                  : "—"}
              </div>

            </div>

            <div
              style={{
                padding: "13px",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >

              <div
                style={{
                  fontSize: "11px",
                  color: "#71717a",
                }}
              >
                Monitoring
              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color:
                    source === "aws"
                      ? "#22c55e"
                      : "#f59e0b",
                }}
              >
                {source === "aws"
                  ? "AWS API Connected"
                  : "Fallback Mode"}

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          CLOUDWATCH METRICS NOTICE
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

        <Activity
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
            Lambda performance metrics
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#71717a",
            }}
          >
            Invocations, errors, duration,
            throttles and concurrency are
            CloudWatch metrics. The current
            endpoint loads the actual Lambda
            function configuration first.
            We can connect these performance
            metrics next.
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

export default Lambda;