import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Activity,
  HardDrive,
  RefreshCw,
  Search,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Server,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

const fallbackInstances = [
  {
    id: "production-db",
    engine: "PostgreSQL",
    engineVersion: "15",
    status: "Available",
    instanceClass: "db.t3.medium",
    storage: 100,
    region: "ap-south-1",
  },
  {
    id: "analytics-db",
    engine: "MySQL",
    engineVersion: "8.0",
    status: "Available",
    instanceClass: "db.t3.small",
    storage: 84,
    region: "ap-south-1",
  },
];

function RDS() {
  const [instances, setInstances] =
    useState(fallbackInstances);

  const [search, setSearch] = useState("");

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
     LOAD RDS
  ===================================================== */

  const loadRDS = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/rds/instances`
      );

      const data = await response.json();

      if (
        data.success &&
        Array.isArray(data.data?.instances)
      ) {
        setInstances(
          data.data.instances
        );

        setSource(
          data.source || "fallback"
        );

        if (data.source === "aws") {
          setError("");
        } else {
          setError(
            "AWS RDS permission is not available. Showing fallback data."
          );
        }
      } else {
        throw new Error(
          "Invalid RDS response"
        );
      }
    } catch (err) {
      console.error(
        "RDS loading error:",
        err
      );

      setInstances(
        fallbackInstances
      );

      setSource("fallback");

      setError(
        "RDS is unavailable. Showing fallback dashboard data."
      );
    }

    setLastUpdated(new Date());
    setLoading(false);
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadRDS();
  }, []);

  /* =====================================================
     AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadRDS();
      }, 30000);

    return () =>
      clearInterval(interval);
  }, []);

  /* =====================================================
     MANUAL REFRESH
  ===================================================== */

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadRDS();

    setRefreshing(false);
  };

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredInstances =
    useMemo(() => {
      const query =
        search.toLowerCase().trim();

      if (!query) {
        return instances;
      }

      return instances.filter(
        (db) =>
          db.id
            ?.toLowerCase()
            .includes(query) ||
          db.engine
            ?.toLowerCase()
            .includes(query) ||
          db.instanceClass
            ?.toLowerCase()
            .includes(query) ||
          db.status
            ?.toLowerCase()
            .includes(query)
      );
    }, [instances, search]);

  /* =====================================================
     STATS
  ===================================================== */

  const availableCount =
    instances.filter(
      (db) =>
        db.status?.toLowerCase() ===
        "available"
    ).length;

  const totalStorage =
    instances.reduce(
      (total, db) =>
        total +
        Number(db.storage || 0),
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

            <h2>
              RDS Databases
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
            Monitor your Amazon RDS
            databases
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
          justifyContent:
            "space-between",
          alignItems: "center",
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
              ? "Live AWS RDS"
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
          ERROR / PERMISSION NOTICE
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
          STAT CARDS
      ================================================= */}

      <div className="stats-grid">

        {/* DATABASES */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Databases
              </p>

              <h2>
                {instances.length}
              </h2>

            </div>

            <div className="stat-icon purple">
              <Database size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            RDS instances
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

            {availableCount} available

          </div>

        </div>

        {/* CPU */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                CPU Usage
              </p>

              <h2>
                —
              </h2>

            </div>

            <div className="stat-icon blue">
              <Activity size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            CloudWatch metric
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#71717a",
            }}
          >
            Metrics endpoint not configured
          </div>

        </div>

        {/* CONNECTIONS */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Connections
              </p>

              <h2>
                —
              </h2>

            </div>

            <div className="stat-icon green">
              <Server size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Current database connections
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

        {/* STORAGE */}

        <div className="stat-card">

          <div className="stat-top">

            <div>

              <p className="stat-title">
                Storage
              </p>

              <h2>
                {totalStorage > 0
                  ? `${totalStorage} GB`
                  : "—"}
              </h2>

            </div>

            <div className="stat-icon orange">
              <HardDrive size={21} />
            </div>

          </div>

          <p className="stat-subtitle">
            Allocated storage
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#a1a1aa",
            }}
          >
            From RDS configuration
          </div>

        </div>

      </div>

      {/* =================================================
          DATABASE TABLE
      ================================================= */}

      <div className="panel">

        <div className="panel-header">

          <div>

            <h3>
              Database Instances
            </h3>

            <p>
              RDS resources in{" "}
              {instances[0]?.region ||
                "ap-south-1"}
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
                placeholder="Search databases..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <Database size={19} />

          </div>

        </div>

        {/* DATABASE LIST */}

        <div className="service-list">

          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#71717a",
              }}
            >
              Loading RDS databases...
            </div>
          ) : filteredInstances.length ===
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
                No databases found
              </div>

            </div>
          ) : (
            filteredInstances.map(
              (db) => {

                const isAvailable =
                  db.status
                    ?.toLowerCase() ===
                  "available";

                return (
                  <div
                    className="service-row"
                    key={
                      db.id
                    }
                  >

                    <div className="service-info">

                      <div className="service-icon">

                        {db.engine
                          ?.toLowerCase()
                          .includes(
                            "mysql"
                          ) ? (
                          <HardDrive
                            size={17}
                          />
                        ) : (
                          <Database
                            size={17}
                          />
                        )}

                      </div>

                      <div>

                        <strong>
                          {db.id}
                        </strong>

                        <span>
                          {db.engine ||
                            "Unknown engine"}

                          {" · "}

                          {db.instanceClass ||
                            "Unknown class"}

                          {db.engineVersion &&
                            ` · v${db.engineVersion}`}
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
                          isAvailable
                            ? "#22c55e"
                            : "#f59e0b",
                      }}
                    >

                      <span
                        className={`health-dot ${
                          isAvailable
                            ? "healthy"
                            : ""
                        }`}
                      />

                      {db.status ||
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
          DATABASE OVERVIEW
      ================================================= */}

      <div className="bottom-grid">

        {/* ENGINE OVERVIEW */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Database Overview
              </h3>

              <p>
                Current RDS configuration
              </p>

            </div>

            <Database size={19} />

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              marginTop: "10px",
            }}
          >

            {[
              "PostgreSQL",
              "MySQL",
              "MariaDB",
              "Aurora",
            ].map((engine) => {

              const count =
                instances.filter(
                  (db) =>
                    db.engine
                      ?.toLowerCase() ===
                    engine.toLowerCase()
                ).length;

              return (
                <div
                  key={engine}
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
                    {engine}
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

        {/* MONITORING STATUS */}

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                RDS Monitoring
              </h3>

              <p>
                CloudWatch integration
              </p>

            </div>

            <Activity size={19} />

          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "16px",
              borderRadius: "10px",
              background:
                source === "aws"
                  ? "rgba(34,197,94,0.05)"
                  : "rgba(245,158,11,0.05)",
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
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color:
                  source === "aws"
                    ? "#22c55e"
                    : "#f59e0b",
              }}
            >

              {source === "aws" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}

              {source === "aws"
                ? "RDS API connected"
                : "Using fallback data"}

            </div>

            <p
              style={{
                marginTop: "8px",
                fontSize: "12px",
                lineHeight: 1.5,
                color: "#71717a",
              }}
            >
              {source === "aws"
                ? "Database configuration is being loaded directly from AWS."
                : "Grant RDS read permission to display your real database instances."}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          METRICS NOTICE
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
            RDS performance metrics
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#71717a",
            }}
          >
            CPU utilization, database connections,
            read/write activity and additional RDS
            performance metrics require CloudWatch
            metric queries. The current backend
            endpoint provides the real RDS instance
            configuration first; we can add these
            metrics next without changing this page.
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

export default RDS;