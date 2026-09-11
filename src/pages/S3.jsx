import { useMemo, useState } from "react";
import {
  HardDrive,
  Database,
  FileBox,
  Activity,
  Search,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Cloud,
} from "lucide-react";

const buckets = [
  {
    name: "production-assets",
    region: "ap-south-1",
    storage: "184 GB",
    objects: "1.2M",
    requests: "82.4K",
    status: "Healthy",
  },
  {
    name: "application-backups",
    region: "ap-south-1",
    storage: "142 GB",
    objects: "820K",
    requests: "48.2K",
    status: "Healthy",
  },
  {
    name: "logs-archive",
    region: "ap-south-1",
    storage: "68 GB",
    objects: "540K",
    requests: "32.8K",
    status: "Healthy",
  },
  {
    name: "static-website",
    region: "ap-south-1",
    storage: "34 GB",
    objects: "240K",
    requests: "20.6K",
    status: "Healthy",
  },
];

function S3() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const filteredBuckets = useMemo(() => {
    return buckets.filter((bucket) => {
      const matchesSearch =
        bucket.name.toLowerCase().includes(search.toLowerCase()) ||
        bucket.region.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || bucket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(new Date());
    }, 700);
  };

  return (
    <div className="page-content">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <h2>S3 Storage</h2>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                background: "rgba(139, 92, 246, 0.12)",
                color: "#a78bfa",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              <Cloud size={12} />
              Storage
            </span>
          </div>

          <p>
            Monitor your Amazon S3 buckets and storage
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

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* STATUS BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          padding: "12px 15px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "#a1a1aa",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.7)",
            }}
          />

          S3 monitoring status:{" "}
          <strong style={{ color: "#e4e4e7" }}>
            Healthy
          </strong>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#71717a",
          }}
        >
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">Buckets</p>
              <h2>18</h2>
            </div>

            <div className="stat-icon blue">
              <HardDrive size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Active S3 buckets
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <ArrowUpRight size={13} />
            All regions
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">Total Storage</p>
              <h2>428 GB</h2>
            </div>

            <div className="stat-icon purple">
              <Database size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Current storage usage
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#a78bfa",
            }}
          >
            Across monitored buckets
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">Objects</p>
              <h2>2.8M</h2>
            </div>

            <div className="stat-icon green">
              <FileBox size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Objects across buckets
          </p>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#22c55e",
            }}
          >
            Storage objects
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div>
              <p className="stat-title">Requests</p>
              <h2>184K</h2>
            </div>

            <div className="stat-icon orange">
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
              color: "#fb923c",
            }}
          >
            API request activity
          </div>
        </div>
      </div>

      {/* BUCKET TABLE */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>S3 Buckets</h3>
            <p>
              Storage and request overview
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
            {/* SEARCH */}
            <div className="search-box">
              <Search size={15} />

              <input
                type="text"
                placeholder="Search buckets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* FILTER */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#111118",
                color: "#d4d4d8",
                outline: "none",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Status</option>
              <option value="Healthy">Healthy</option>
            </select>
          </div>
        </div>

        <div className="s3-table">
          {/* TABLE HEADER */}
          <div className="s3-table-header">
            <span>BUCKET</span>
            <span>REGION</span>
            <span>STORAGE</span>
            <span>OBJECTS</span>
            <span>REQUESTS</span>
            <span>STATUS</span>
          </div>

          {/* TABLE ROWS */}
          {filteredBuckets.length > 0 ? (
            filteredBuckets.map((bucket) => (
              <div
                className="s3-table-row"
                key={bucket.name}
              >
                <div className="s3-name">
                  <div className="service-icon">
                    <HardDrive size={17} />
                  </div>

                  <div>
                    <strong>{bucket.name}</strong>

                    <small>S3 Bucket</small>
                  </div>
                </div>

                <span>{bucket.region}</span>

                <strong>{bucket.storage}</strong>

                <span>{bucket.objects}</span>

                <span>{bucket.requests}</span>

                <span className="s3-status">
                  <span className="health-dot healthy" />

                  {bucket.status}
                </span>
              </div>
            ))
          ) : (
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
                  fontSize: "14px",
                  color: "#a1a1aa",
                }}
              >
                No buckets found
              </div>

              <div
                style={{
                  fontSize: "12px",
                  marginTop: "5px",
                }}
              >
                Try a different search term
              </div>
            </div>
          )}
        </div>

        {/* TABLE FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "14px",
            marginTop: "4px",
            borderTop:
              "1px solid rgba(255,255,255,0.06)",
            fontSize: "12px",
            color: "#71717a",
          }}
        >
          <span>
            Showing {filteredBuckets.length} of{" "}
            {buckets.length} monitored buckets
          </span>

          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <CheckCircle2
              size={13}
              color="#22c55e"
            />
            All monitored buckets healthy
          </span>
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="bottom-grid">
        {/* STORAGE */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Storage Usage</h3>

              <p>
                Total S3 storage consumption
              </p>
            </div>

            <HardDrive size={19} />
          </div>

          <div className="large-metric">
            428 GB
          </div>

          <p className="metric-description">
            Across all monitored buckets
          </p>

          <div
            style={{
              marginTop: "20px",
              height: "7px",
              borderRadius: "10px",
              background:
                "rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "68%",
                height: "100%",
                borderRadius: "10px",
                background:
                  "linear-gradient(90deg, #7c3aed, #a78bfa)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
              fontSize: "11px",
              color: "#71717a",
            }}
          >
            <span>Current usage</span>
            <span>68%</span>
          </div>
        </div>

        {/* REQUEST ACTIVITY */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Request Activity</h3>

              <p>
                S3 API request volume
              </p>
            </div>

            <Activity size={19} />
          </div>

          <div className="large-metric">
            184K
          </div>

          <p className="metric-description">
            Requests processed in the last 24 hours
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "18px",
              fontSize: "12px",
              color: "#22c55e",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />

            Request processing healthy
          </div>
        </div>
      </div>

      {/* DEMO DATA NOTICE */}
      <div
        style={{
          marginTop: "20px",
          padding: "14px 16px",
          borderRadius: "10px",
          background: "rgba(139,92,246,0.06)",
          border:
            "1px solid rgba(139,92,246,0.15)",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <Cloud
          size={18}
          style={{
            color: "#a78bfa",
            marginTop: "2px",
            flexShrink: 0,
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
            S3 integration
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#71717a",
            }}
          >
            This page is currently using dashboard
            sample data. Your backend is intentionally
            limited to EC2 and CloudWatch for now.
            We can connect real S3 bucket data later
            without affecting the existing monitoring
            services.
          </div>
        </div>
      </div>

      {/* SPIN ANIMATION */}
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
            .s3-table {
              overflow-x: auto;
            }

            .s3-table-header,
            .s3-table-row {
              min-width: 900px;
            }
          }
        `}
      </style>
    </div>
  );
}

export default S3;