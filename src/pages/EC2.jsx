import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  ExternalLink,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

function EC2() {
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [metricError, setMetricError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [lastUpdated, setLastUpdated] = useState(null);

  // =========================================================
  // FETCH EC2 INSTANCES
  // =========================================================

  const fetchInstances = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(`${API_BASE}/ec2/instances`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to load EC2 instances"
        );
      }

      setInstances(result.instances || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("EC2 fetch error:", err);

      setError(
        err.message || "Failed to load EC2 instances"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // =========================================================
  // FETCH INSTANCE METRICS
  // =========================================================

  const fetchMetrics = useCallback(async (instanceId) => {
    if (!instanceId) return;

    try {
      setMetricsLoading(true);
      setMetricError("");

      const response = await fetch(
        `${API_BASE}/ec2/${instanceId}/metrics`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to load CloudWatch metrics"
        );
      }

      setMetrics(result);
    } catch (err) {
      console.error("CloudWatch metrics error:", err);

      setMetricError(
        err.message ||
          "CloudWatch metrics unavailable"
      );

      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    fetchInstances();

    const interval = setInterval(() => {
      fetchInstances();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchInstances]);

  // =========================================================
  // KEEP SELECTED INSTANCE UPDATED
  // =========================================================

  useEffect(() => {
    if (!selectedInstance) return;

    const updated = instances.find(
      (instance) =>
        instance.id === selectedInstance.id
    );

    if (updated) {
      setSelectedInstance(updated);
    }
  }, [instances, selectedInstance]);

  // =========================================================
  // METRIC AUTO REFRESH
  // =========================================================

  useEffect(() => {
    if (!selectedInstance) return;

    const interval = setInterval(() => {
      fetchMetrics(selectedInstance.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedInstance, fetchMetrics]);

  // =========================================================
  // SELECT INSTANCE
  // =========================================================

  const handleSelectInstance = (instance) => {
    setSelectedInstance(instance);
    setMetrics(null);
    setMetricError("");

    fetchMetrics(instance.id);
  };

  const closeDetails = () => {
    setSelectedInstance(null);
    setMetrics(null);
    setMetricError("");
  };

  // =========================================================
  // FILTER INSTANCES
  // =========================================================

  const filteredInstances = useMemo(() => {
    const query = search.toLowerCase().trim();

    return instances.filter((instance) => {
      const matchesSearch =
        !query ||
        instance.name
          ?.toLowerCase()
          .includes(query) ||
        instance.id
          ?.toLowerCase()
          .includes(query) ||
        instance.privateIp
          ?.toLowerCase()
          .includes(query) ||
        instance.type
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        instance.state === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [instances, search, statusFilter]);

  // =========================================================
  // COUNTS
  // =========================================================

  const runningCount = instances.filter(
    (instance) => instance.state === "running"
  ).length;

  const stoppedCount = instances.filter(
    (instance) => instance.state === "stopped"
  ).length;

  // =========================================================
  // FORMATTERS
  // =========================================================

  const formatBytes = (bytes) => {
    const value = Number(bytes);

    if (!Number.isFinite(value)) {
      return "N/A";
    }

    if (value < 1024) {
      return `${value.toFixed(0)} B`;
    }

    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
      return `${(
        value /
        (1024 * 1024)
      ).toFixed(2)} MB`;
    }

    return `${(
      value /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;
  };

  const formatPercent = (value) => {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "N/A";
    }

    return `${Number(value).toFixed(1)}%`;
  };

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // =========================================================
  // METRIC EXTRACTION
  // =========================================================

  const current = metrics?.current || {};

  const cpu =
    current.cpu ??
    metrics?.cpu ??
    null;

  const memory =
    current.memory ??
    metrics?.memory ??
    null;

  const networkIn =
    current.networkIn ??
    metrics?.networkIn ??
    null;

  const networkOut =
    current.networkOut ??
    metrics?.networkOut ??
    null;

  const statusCheck =
    current.statusCheck ??
    metrics?.statusCheck ??
    null;

  // =========================================================
  // CPU HISTORY
  // =========================================================

  const cpuMetric =
    metrics?.cpuMetric ||
    metrics?.cpu ||
    {};

  const cpuValues = Array.isArray(cpuMetric.Values)
    ? cpuMetric.Values
        .map(Number)
        .filter(Number.isFinite)
    : [];

  const cpuTimestamps =
    Array.isArray(cpuMetric.Timestamps)
      ? cpuMetric.Timestamps
      : [];

  // =========================================================
  // NETWORK HISTORY
  // =========================================================

  const networkInMetric =
    metrics?.networkInMetric ||
    metrics?.networkInData ||
    metrics?.networkInMetricData ||
    {};

  const networkOutMetric =
    metrics?.networkOutMetric ||
    metrics?.networkOutData ||
    metrics?.networkOutMetricData ||
    {};

  // =========================================================
  // ALERTS
  // =========================================================

  const alerts = useMemo(() => {
    if (!selectedInstance) {
      return [];
    }

    const result = [];

    const cpuNumber =
      cpu === null || cpu === undefined
        ? null
        : Number(cpu);

    const memoryNumber =
      memory === null || memory === undefined
        ? null
        : Number(memory);

    const statusNumber =
      statusCheck === null ||
      statusCheck === undefined
        ? null
        : Number(statusCheck);

    // CPU critical
    if (
      cpuNumber !== null &&
      Number.isFinite(cpuNumber) &&
      cpuNumber >= 90
    ) {
      result.push({
        type: "critical",
        icon: XCircle,
        title: "High CPU utilization",
        message: `CPU utilization is ${cpuNumber.toFixed(
          1
        )}% — above the 90% critical threshold.`,
      });
    }
    // CPU warning
    else if (
      cpuNumber !== null &&
      Number.isFinite(cpuNumber) &&
      cpuNumber >= 70
    ) {
      result.push({
        type: "warning",
        icon: AlertTriangle,
        title: "Elevated CPU utilization",
        message: `CPU utilization is ${cpuNumber.toFixed(
          1
        )}% — above the 70% warning threshold.`,
      });
    }

    // Status check
    if (
      statusNumber !== null &&
      Number.isFinite(statusNumber) &&
      statusNumber > 0
    ) {
      result.push({
        type: "critical",
        icon: ShieldCheck,
        title: "EC2 status check failed",
        message:
          "AWS reports a failed instance or system status check.",
      });
    }

    // Stopped instance
    if (selectedInstance.state === "stopped") {
      result.push({
        type: "warning",
        icon: Server,
        title: "Instance is stopped",
        message:
          "This EC2 instance is currently stopped.",
      });
    }

    // Memory
    if (
      memoryNumber !== null &&
      Number.isFinite(memoryNumber) &&
      memoryNumber >= 90
    ) {
      result.push({
        type: "critical",
        icon: MemoryStick,
        title: "High memory utilization",
        message: `Memory utilization is ${memoryNumber.toFixed(
          1
        )}% — above the 90% critical threshold.`,
      });
    } else if (
      memoryNumber !== null &&
      Number.isFinite(memoryNumber) &&
      memoryNumber >= 75
    ) {
      result.push({
        type: "warning",
        icon: MemoryStick,
        title: "Elevated memory utilization",
        message: `Memory utilization is ${memoryNumber.toFixed(
          1
        )}% — above the 75% warning threshold.`,
      });
    }

    return result;
  }, [
    selectedInstance,
    cpu,
    memory,
    statusCheck,
  ]);

  // =========================================================
  // HEALTH STATUS
  // =========================================================

  const instanceHealth = useMemo(() => {
    if (!selectedInstance) {
      return {
        label: "Unknown",
        type: "neutral",
      };
    }

    if (alerts.some(
      (alert) => alert.type === "critical"
    )) {
      return {
        label: "Critical",
        type: "critical",
      };
    }

    if (alerts.length > 0) {
      return {
        label: "Warning",
        type: "warning",
      };
    }

    if (selectedInstance.state === "running") {
      return {
        label: "Healthy",
        type: "healthy",
      };
    }

    return {
      label: "Stopped",
      type: "warning",
    };
  }, [selectedInstance, alerts]);

  // =========================================================
  // METRIC CARD
  // =========================================================

  const MetricCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    type = "purple",
    unavailable = false,
  }) => {
    return (
      <div className={`metric-card ${type}`}>
        <div className="metric-card-header">
          <div className={`metric-icon ${type}`}>
            <Icon size={17} />
          </div>

          <div className="metric-card-title">
            <span>{title}</span>
            <small>{subtitle}</small>
          </div>
        </div>

        <div className="metric-value">
          {value}
        </div>

        {unavailable ? (
          <div className="metric-unavailable">
            CloudWatch Agent required
          </div>
        ) : (
          <div className="metric-mini-line">
            <span />
          </div>
        )}
      </div>
    );
  };

  // =========================================================
  // CPU CHART
  // =========================================================

  const CPUChart = () => {
    if (!cpuValues.length) {
      return (
        <div className="chart-empty">
          <Activity size={24} />
          <strong>No CPU history available</strong>
          <span>
            CloudWatch has not returned CPU datapoints
            for this instance.
          </span>
        </div>
      );
    }

    const width = 700;
    const height = 220;
    const paddingX = 12;
    const paddingY = 20;

    const maxValue = Math.max(
      100,
      ...cpuValues
    );

    const points = cpuValues.map(
      (value, index) => {
        const x =
          cpuValues.length === 1
            ? width / 2
            : paddingX +
              (index /
                (cpuValues.length - 1)) *
                (width - paddingX * 2);

        const y =
          height -
          paddingY -
          (value / maxValue) *
            (height - paddingY * 2);

        return {
          x,
          y,
          value,
        };
      }
    );

    const linePoints = points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

    const areaPoints = [
      `${paddingX},${height - paddingY}`,
      linePoints,
      `${width - paddingX},${
        height - paddingY
      }`,
    ].join(" ");

    const latest =
      cpuValues[cpuValues.length - 1];

    const highest =
      Math.max(...cpuValues);

    return (
      <div className="cpu-chart-wrapper">
        <div className="chart-summary">
          <div>
            <span>Current</span>
            <strong>
              {formatPercent(latest)}
            </strong>
          </div>

          <div>
            <span>Peak</span>
            <strong>
              {formatPercent(highest)}
            </strong>
          </div>

          <div>
            <span>Datapoints</span>
            <strong>
              {cpuValues.length}
            </strong>
          </div>

          <div className="chart-period">
            Last hour · 5 min
          </div>
        </div>

        <div className="cpu-chart">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="cpuAreaGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#8b5cf6"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="#8b5cf6"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[25, 50, 75].map(
              (level) => {
                const y =
                  height -
                  paddingY -
                  (level / maxValue) *
                    (height -
                      paddingY * 2);

                return (
                  <line
                    key={level}
                    x1="0"
                    x2={width}
                    y1={y}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                );
              }
            )}

            <polygon
              points={areaPoints}
              fill="url(#cpuAreaGradient)"
            />

            <polyline
              points={linePoints}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map(
              (point, index) => {
                if (
                  index !==
                  points.length - 1
                ) {
                  return null;
                }

                return (
                  <g key={index}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="7"
                      fill="#0b1320"
                      stroke="#a78bfa"
                      strokeWidth="3"
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill="#c4b5fd"
                    />
                  </g>
                );
              }
            )}
          </svg>

          <div className="chart-labels">
            <span>
              {cpuTimestamps.length
                ? formatTime(
                    cpuTimestamps[
                      0
                    ]
                  )
                : "1h ago"}
            </span>

            <span>30 min</span>

            <span>Now</span>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="ec2-page">
        <div className="ec2-loading">
          <div className="loading-icon">
            <Server size={30} />
          </div>

          <h2>
            Loading EC2 infrastructure
          </h2>

          <p>
            Connecting to AWS EC2 and
            CloudWatch...
          </p>

          <div className="loading-bar">
            <span />
          </div>
        </div>

        <EC2Styles />
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="ec2-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="ec2-header">
        <div>
          <div className="ec2-eyebrow">
            COMPUTE / AMAZON EC2
          </div>

          <div className="title-line">
            <h1>EC2 Instances</h1>

            <span className="live-pill">
              <span />
              LIVE
            </span>
          </div>

          <p>
            Live AWS infrastructure monitoring
          </p>
        </div>

        <button
          className="ec2-refresh"
          onClick={() =>
            fetchInstances(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* =====================================================
          CONNECTION
      ===================================================== */}

      <div className="ec2-connection">
        <span className="connection-dot" />

        <strong>
          AWS EC2 connected
        </strong>

        <span className="separator">
          •
        </span>

        <span>
          Mumbai · ap-south-1
        </span>

        {lastUpdated && (
          <>
            <span className="separator">
              •
            </span>

            <span>
              Updated{" "}
              {formatTime(
                lastUpdated
              )}
            </span>
          </>
        )}
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="ec2-error">
          <div className="error-icon">
            <AlertTriangle size={17} />
          </div>

          <div>
            <strong>
              Unable to load EC2
            </strong>

            <p>{error}</p>
          </div>

          <button
            onClick={() =>
              fetchInstances(true)
            }
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="ec2-stat-grid">
        <div className="ec2-stat">
          <div className="stat-icon">
            <Server size={18} />
          </div>

          <span>
            TOTAL INSTANCES
          </span>

          <strong>
            {instances.length}
          </strong>

          <small>
            EC2 resources
          </small>
        </div>

        <div className="ec2-stat green">
          <div className="stat-icon">
            <Activity size={18} />
          </div>

          <span>RUNNING</span>

          <strong>
            {runningCount}
          </strong>

          <small>
            Active instances
          </small>
        </div>

        <div className="ec2-stat orange">
          <div className="stat-icon">
            <HardDrive size={18} />
          </div>

          <span>STOPPED</span>

          <strong>
            {stoppedCount}
          </strong>

          <small>
            Inactive instances
          </small>
        </div>

        <div className="ec2-stat purple">
          <div className="stat-icon">
            <Network size={18} />
          </div>

          <span>REGION</span>

          <strong className="region-value">
            ap-south-1
          </strong>

          <small>Mumbai</small>
        </div>
      </div>

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <div className="ec2-toolbar">
        <div className="search-box">
          <Search size={15} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search by name, ID, IP or type..."
          />

          {search && (
            <button
              className="clear-search"
              onClick={() =>
                setSearch("")
              }
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="filter-group">
          {[
            ["all", "All"],
            ["running", "Running"],
            ["stopped", "Stopped"],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                className={
                  statusFilter ===
                  value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter(
                    value
                  )
                }
              >
                {label}

                {value === "all" && (
                  <span>
                    {instances.length}
                  </span>
                )}

                {value ===
                  "running" && (
                  <span>
                    {runningCount}
                  </span>
                )}

                {value ===
                  "stopped" && (
                  <span>
                    {stoppedCount}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          FLEET TABLE
      ===================================================== */}

      <div className="ec2-table-card">
        <div className="table-heading">
          <div>
            <span>
              LIVE RESOURCES
            </span>

            <h2>EC2 Fleet</h2>

            <p>
              Select an instance to inspect
              live performance and alerts
            </p>
          </div>

          <div className="fleet-meta">
            <span className="resource-count">
              {filteredInstances.length}
              {" "}shown
            </span>

            <span className="fleet-live">
              <i />
              Live
            </span>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>INSTANCE</th>
                <th>INSTANCE ID</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>PRIVATE IP</th>
                <th>AZ</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredInstances.map(
                (instance) => {
                  const running =
                    instance.state ===
                    "running";

                  const selected =
                    selectedInstance
                      ?.id ===
                    instance.id;

                  return (
                    <tr
                      key={instance.id}
                      className={
                        selected
                          ? "selected-row"
                          : ""
                      }
                      onClick={() =>
                        handleSelectInstance(
                          instance
                        )
                      }
                    >
                      <td>
                        <div className="instance-cell">
                          <div
                            className={`instance-avatar ${
                              running
                                ? "running"
                                : "stopped"
                            }`}
                          >
                            <Server
                              size={15}
                            />
                          </div>

                          <div>
                            <strong>
                              {instance.name ||
                                "Unnamed instance"}
                            </strong>

                            <small>
                              EC2 Instance
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <code>
                          {instance.id}
                        </code>
                      </td>

                      <td>
                        <span className="instance-type">
                          {instance.type ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            running
                              ? "running"
                              : "stopped"
                          }`}
                        >
                          <i />
                          {instance.state}
                        </span>
                      </td>

                      <td>
                        <span className="ip-value">
                          {instance.privateIp ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <span className="az-value">
                          {instance.availabilityZone ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="view-button"
                          onClick={(e) => {
                            e.stopPropagation();

                            handleSelectInstance(
                              instance
                            );
                          }}
                        >
                          Monitor
                          <ChevronRight
                            size={13}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        {filteredInstances.length ===
          0 && (
          <div className="empty-state">
            <Search size={25} />

            <strong>
              No instances found
            </strong>

            <span>
              Try another search or
              status filter.
            </span>
          </div>
        )}
      </div>

      {/* =====================================================
          DETAIL DRAWER
      ===================================================== */}

      {selectedInstance && (
        <div
          className="detail-overlay"
          onClick={closeDetails}
        >
          <aside
            className="instance-detail"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* DETAIL HEADER */}

            <div className="detail-header">
              <div>
                <div className="detail-eyebrow">
                  EC2 INSTANCE
                </div>

                <h2>
                  {selectedInstance.name ||
                    "Unnamed instance"}
                </h2>

                <div className="detail-id">
                  <code>
                    {selectedInstance.id}
                  </code>

                  <button
                    title="Copy instance ID"
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        selectedInstance.id
                      )
                    }
                  >
                    <ExternalLink
                      size={12}
                    />
                  </button>
                </div>
              </div>

              <button
                className="close-detail"
                onClick={closeDetails}
              >
                <X size={18} />
              </button>
            </div>

            {/* STATUS BANNER */}

            <div
              className={`detail-status ${instanceHealth.type}`}
            >
              <div className="health-indicator">
                {instanceHealth.type ===
                "critical" ? (
                  <XCircle size={19} />
                ) : instanceHealth.type ===
                  "warning" ? (
                  <AlertTriangle size={19} />
                ) : (
                  <CheckCircle2
                    size={19}
                  />
                )}
              </div>

              <div>
                <strong>
                  {instanceHealth.label}
                </strong>

                <span>
                  {selectedInstance.state ===
                  "running"
                    ? "EC2 instance is running"
                    : "EC2 instance is stopped"}
                </span>
              </div>

              <span className="region-tag">
                ap-south-1
              </span>
            </div>

            {/* LIVE METRICS */}

            <section className="detail-section">
              <div className="section-title">
                <div>
                  <span>
                    LIVE METRICS
                  </span>

                  <h3>
                    Instance Performance
                  </h3>
                </div>

                <button
                  className="metric-refresh"
                  onClick={() =>
                    fetchMetrics(
                      selectedInstance.id
                    )
                  }
                  disabled={
                    metricsLoading
                  }
                >
                  <RefreshCw
                    size={14}
                    className={
                      metricsLoading
                        ? "spin"
                        : ""
                    }
                  />
                </button>
              </div>

              {metricsLoading ? (
                <div className="metrics-loading">
                  <RefreshCw
                    size={19}
                    className="spin"
                  />

                  <span>
                    Loading CloudWatch
                    metrics...
                  </span>
                </div>
              ) : metricError ? (
                <div className="metrics-error">
                  <AlertTriangle
                    size={18}
                  />

                  <div>
                    <strong>
                      CloudWatch metrics
                      unavailable
                    </strong>

                    <span>
                      {metricError}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="metric-grid">
                  <MetricCard
                    icon={Cpu}
                    title="CPU Utilization"
                    subtitle="AWS/EC2"
                    value={formatPercent(
                      cpu
                    )}
                    type="purple"
                  />

                  <MetricCard
                    icon={MemoryStick}
                    title="Memory Used"
                    subtitle="CWAgent"
                    value={formatPercent(
                      memory
                    )}
                    type="blue"
                    unavailable={
                      memory === null ||
                      memory === undefined
                    }
                  />

                  <MetricCard
                    icon={Network}
                    title="Network In"
                    subtitle="Bytes"
                    value={formatBytes(
                      networkIn
                    )}
                    type="green"
                  />

                  <MetricCard
                    icon={Network}
                    title="Network Out"
                    subtitle="Bytes"
                    value={formatBytes(
                      networkOut
                    )}
                    type="cyan"
                  />
                </div>
              )}
            </section>

            {/* CPU HISTORY */}

            {!metricsLoading &&
              !metricError && (
                <section className="detail-section">
                  <div className="section-title">
                    <div>
                      <span>
                        CLOUDWATCH
                      </span>

                      <h3>
                        CPU Utilization
                      </h3>
                    </div>

                    <div className="chart-live">
                      <span />
                      Live
                    </div>
                  </div>

                  <div className="chart-card">
                    <CPUChart />
                  </div>
                </section>
              )}

            {/* NETWORK */}

            {!metricsLoading &&
              !metricError && (
                <section className="detail-section">
                  <div className="section-title">
                    <div>
                      <span>
                        NETWORK
                      </span>

                      <h3>
                        Traffic Overview
                      </h3>
                    </div>
                  </div>

                  <div className="network-grid">
                    <div className="network-card">
                      <div className="network-icon in">
                        <Network
                          size={17}
                        />
                      </div>

                      <div>
                        <span>
                          Network In
                        </span>

                        <strong>
                          {formatBytes(
                            networkIn
                          )}
                        </strong>
                      </div>

                      <small>
                        AWS/EC2
                      </small>
                    </div>

                    <div className="network-card">
                      <div className="network-icon out">
                        <Network
                          size={17}
                        />
                      </div>

                      <div>
                        <span>
                          Network Out
                        </span>

                        <strong>
                          {formatBytes(
                            networkOut
                          )}
                        </strong>
                      </div>

                      <small>
                        AWS/EC2
                      </small>
                    </div>
                  </div>
                </section>
              )}

            {/* STATUS CHECK */}

            <section className="detail-section">
              <div className="section-title">
                <div>
                  <span>
                    AWS HEALTH
                  </span>

                  <h3>
                    Status Checks
                  </h3>
                </div>
              </div>

              <div className="checks-grid">
                <div
                  className={`check-card ${
                    Number(statusCheck) > 0
                      ? "failed"
                      : "passed"
                  }`}
                >
                  <div>
                    {Number(
                      statusCheck
                    ) > 0 ? (
                      <XCircle size={17} />
                    ) : (
                      <CheckCircle2
                        size={17}
                      />
                    )}
                  </div>

                  <span>
                    Instance/System
                  </span>

                  <strong>
                    {statusCheck !== null &&
                    statusCheck !==
                      undefined
                      ? Number(
                          statusCheck
                        ) > 0
                        ? "FAILED"
                        : "PASSED"
                      : "N/A"}
                  </strong>
                </div>

                <div
                  className={`check-card ${
                    selectedInstance.state ===
                    "running"
                      ? "passed"
                      : "failed"
                  }`}
                >
                  <div>
                    {selectedInstance.state ===
                    "running" ? (
                      <CheckCircle2
                        size={17}
                      />
                    ) : (
                      <AlertTriangle
                        size={17}
                      />
                    )}
                  </div>

                  <span>
                    Instance State
                  </span>

                  <strong>
                    {selectedInstance.state}
                  </strong>
                </div>
              </div>
            </section>

            {/* ALERTS */}

            <section className="detail-section">
              <div className="section-title">
                <div>
                  <span>
                    MONITORING
                  </span>

                  <h3>Alerts</h3>
                </div>

                <span
                  className={`alert-count ${
                    alerts.length
                      ? "has-alerts"
                      : "healthy"
                  }`}
                >
                  {alerts.length
                    ? `${alerts.length} active`
                    : "Healthy"}
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="no-alerts">
                  <div className="no-alert-icon">
                    <CheckCircle2
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      No active alerts
                    </strong>

                    <span>
                      This instance is operating
                      within the configured
                      monitoring thresholds.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="alert-list">
                  {alerts.map(
                    (alert, index) => {
                      const Icon =
                        alert.icon ||
                        AlertTriangle;

                      return (
                        <div
                          key={`${alert.title}-${index}`}
                          className={`alert-item ${alert.type}`}
                        >
                          <div className="alert-icon">
                            <Icon
                              size={16}
                            />
                          </div>

                          <div>
                            <strong>
                              {alert.title}
                            </strong>

                            <span>
                              {alert.message}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* INSTANCE INFORMATION */}

            <section className="detail-section">
              <div className="section-title">
                <div>
                  <span>
                    CONFIGURATION
                  </span>

                  <h3>
                    Instance Information
                  </h3>
                </div>
              </div>

              <div className="info-grid">
                <div>
                  <span>
                    Instance Type
                  </span>

                  <strong>
                    {selectedInstance.type ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Availability Zone
                  </span>

                  <strong>
                    {selectedInstance.availabilityZone ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Private IP
                  </span>

                  <strong>
                    {selectedInstance.privateIp ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Public IP
                  </span>

                  <strong>
                    {selectedInstance.publicIp ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Architecture
                  </span>

                  <strong>
                    {selectedInstance.architecture ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Platform
                  </span>

                  <strong>
                    {selectedInstance.platform ||
                      "Linux"}
                  </strong>
                </div>

                <div className="wide-info">
                  <span>
                    Launch Time
                  </span>

                  <strong>
                    {formatDate(
                      selectedInstance.launchTime
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* RAM INFORMATION */}

            {memory === null ||
              memory === undefined ? (
              <div className="ram-notice">
                <div className="ram-notice-icon">
                  <MemoryStick
                    size={19}
                  />
                </div>

                <div>
                  <strong>
                    RAM monitoring not
                    configured
                  </strong>

                  <p>
                    Default EC2 CloudWatch
                    metrics do not include
                    memory utilization.
                    Install the CloudWatch
                    Agent to publish
                    <code>
                      {" "}
                      CWAgent /
                      mem_used_percent
                    </code>
                    .
                  </p>
                </div>
              </div>
            ) : null}

            {/* FOOTER */}

            <div className="detail-footer">
              <div className="footer-live">
                <span />
              </div>

              <div>
                <strong>
                  CloudWatch monitoring
                </strong>

                <span>
                  EC2 · CPU · Network ·
                  Status Checks
                </span>
              </div>

              <div className="footer-right">
                Auto refresh
                <strong>
                  30 sec
                </strong>
              </div>
            </div>
          </aside>
        </div>
      )}

      <EC2Styles />
    </div>
  );
}

// ===========================================================
// STYLES
// ===========================================================

function EC2Styles() {
  return (
    <style>{`

      /* =====================================================
         BASE
      ===================================================== */

      .ec2-page {
        width: 100%;
        min-height: 100%;
        padding: 32px 34px 48px;
        box-sizing: border-box;
        color: #f8fafc;
        background:
          radial-gradient(
            circle at 80% 0%,
            rgba(124,58,237,.07),
            transparent 30%
          );
      }

      /* =====================================================
         HEADER
      ===================================================== */

      .ec2-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
      }

      .ec2-eyebrow,
      .detail-eyebrow,
      .table-heading > div > span,
      .section-title > div > span {
        color: #8b5cf6;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.7px;
      }

      .title-line {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ec2-header h1 {
        margin: 8px 0 4px;
        font-size: clamp(31px, 3.4vw, 46px);
        line-height: 1;
        letter-spacing: -1.8px;
      }

      .ec2-header p {
        margin: 0;
        color: #64748b;
        font-size: 13px;
      }

      .live-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border: 1px solid rgba(34,197,94,.18);
        border-radius: 20px;
        color: #4ade80;
        background: rgba(34,197,94,.07);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .7px;
      }

      .live-pill span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 8px rgba(34,197,94,.8);
      }

      .ec2-refresh {
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 15px;
        border: 1px solid #29364a;
        border-radius: 9px;
        color: #c4b5fd;
        background: #0d1725;
        cursor: pointer;
        font-size: 11px;
        transition: .2s ease;
      }

      .ec2-refresh:hover {
        border-color: #7c3aed;
        background: rgba(124,58,237,.09);
      }

      .ec2-refresh:disabled {
        opacity: .6;
        cursor: not-allowed;
      }

      .spin {
        animation: ec2Spin 1s linear infinite;
      }

      @keyframes ec2Spin {
        from {
          transform: rotate(0deg);
        }

        to {
          transform: rotate(360deg);
        }
      }

      /* =====================================================
         CONNECTION
      ===================================================== */

      .ec2-connection {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 15px;
        color: #64748b;
        font-size: 10px;
      }

      .ec2-connection strong {
        color: #94a3b8;
      }

      .connection-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 10px rgba(34,197,94,.75);
      }

      .separator {
        color: #334155;
      }

      /* =====================================================
         ERROR
      ===================================================== */

      .ec2-error {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 18px;
        padding: 12px 14px;
        border: 1px solid rgba(239,68,68,.18);
        border-radius: 10px;
        background: rgba(239,68,68,.045);
      }

      .error-icon {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 8px;
        color: #ef4444;
        background: rgba(239,68,68,.1);
      }

      .ec2-error div:nth-child(2) {
        flex: 1;
      }

      .ec2-error strong {
        color: #fca5a5;
        font-size: 11px;
      }

      .ec2-error p {
        margin: 3px 0 0;
        color: #64748b;
        font-size: 9px;
      }

      .ec2-error button {
        padding: 7px 11px;
        border: 1px solid #29364a;
        border-radius: 7px;
        color: #cbd5e1;
        background: #101a29;
        cursor: pointer;
        font-size: 10px;
      }

      /* =====================================================
         STAT CARDS
      ===================================================== */

      .ec2-stat-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 13px;
        margin-top: 23px;
      }

      .ec2-stat {
        position: relative;
        min-height: 132px;
        padding: 18px;
        overflow: hidden;
        border: 1px solid #1e293b;
        border-radius: 13px;
        background:
          linear-gradient(
            145deg,
            #0f1726,
            #0a101b
          );
      }

      .ec2-stat::after {
        content: "";
        position: absolute;
        width: 80px;
        height: 80px;
        right: -30px;
        bottom: -35px;
        border-radius: 50%;
        background: rgba(139,92,246,.05);
      }

      .ec2-stat .stat-icon {
        position: absolute;
        top: 17px;
        right: 17px;
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        color: #a78bfa;
        background: rgba(124,58,237,.09);
      }

      .ec2-stat.green .stat-icon {
        color: #4ade80;
        background: rgba(34,197,94,.08);
      }

      .ec2-stat.orange .stat-icon {
        color: #fbbf24;
        background: rgba(245,158,11,.08);
      }

      .ec2-stat.purple .stat-icon {
        color: #c4b5fd;
        background: rgba(139,92,246,.1);
      }

      .ec2-stat > span {
        display: block;
        color: #64748b;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 1.1px;
      }

      .ec2-stat strong {
        display: block;
        margin-top: 11px;
        font-size: 29px;
        letter-spacing: -.7px;
      }

      .ec2-stat.green strong {
        color: #22c55e;
      }

      .ec2-stat.orange strong {
        color: #f59e0b;
      }

      .ec2-stat.purple strong {
        color: #a78bfa;
      }

      .ec2-stat small {
        display: block;
        margin-top: 7px;
        color: #475569;
        font-size: 9px;
      }

      .region-value {
        font-size: 18px !important;
        margin-top: 16px !important;
      }

      /* =====================================================
         TOOLBAR
      ===================================================== */

      .ec2-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 13px;
        margin-top: 23px;
      }

      .search-box {
        flex: 1;
        max-width: 500px;
        height: 42px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        box-sizing: border-box;
        border: 1px solid #1e293b;
        border-radius: 9px;
        background: #0b1320;
        color: #64748b;
      }

      .search-box input {
        width: 100%;
        border: 0;
        outline: 0;
        color: #e2e8f0;
        background: transparent;
        font-size: 11px;
      }

      .search-box input::placeholder {
        color: #475569;
      }

      .clear-search {
        width: 23px;
        height: 23px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 5px;
        color: #64748b;
        background: rgba(255,255,255,.04);
        cursor: pointer;
      }

      .filter-group {
        display: flex;
        gap: 3px;
        padding: 4px;
        border: 1px solid #1e293b;
        border-radius: 9px;
        background: #0b1320;
      }

      .filter-group button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 0;
        border-radius: 6px;
        padding: 7px 11px;
        color: #64748b;
        background: transparent;
        cursor: pointer;
        font-size: 9px;
      }

      .filter-group button span {
        padding: 2px 4px;
        border-radius: 4px;
        color: #475569;
        background: rgba(255,255,255,.03);
        font-size: 8px;
      }

      .filter-group button.active {
        color: #ddd6fe;
        background: rgba(124,58,237,.18);
      }

      .filter-group button.active span {
        color: #c4b5fd;
        background: rgba(139,92,246,.12);
      }

      /* =====================================================
         TABLE
      ===================================================== */

      .ec2-table-card {
        margin-top: 13px;
        overflow: hidden;
        border: 1px solid #1e293b;
        border-radius: 13px;
        background: #0b1320;
      }

      .table-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 19px 20px;
      }

      .table-heading h2 {
        margin: 5px 0 3px;
        font-size: 17px;
      }

      .table-heading p {
        margin: 0;
        color: #475569;
        font-size: 9px;
      }

      .fleet-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .resource-count {
        padding: 6px 9px;
        border: 1px solid #263349;
        border-radius: 7px;
        color: #94a3b8;
        background: #0f1827;
        font-size: 9px;
      }

      .fleet-live {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 8px;
        border-radius: 7px;
        color: #4ade80;
        background: rgba(34,197,94,.06);
        font-size: 9px;
      }

      .fleet-live i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #22c55e;
      }

      .table-scroll {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th {
        padding: 11px 17px;
        text-align: left;
        border-top: 1px solid #1e293b;
        border-bottom: 1px solid #1e293b;
        color: #475569;
        background: #0d1624;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 1px;
        white-space: nowrap;
      }

      td {
        padding: 13px 17px;
        border-bottom: 1px solid rgba(30,41,59,.65);
        color: #94a3b8;
        font-size: 10px;
        white-space: nowrap;
      }

      tbody tr {
        cursor: pointer;
        transition: background .18s ease;
      }

      tbody tr:hover {
        background: rgba(124,58,237,.045);
      }

      tbody tr.selected-row {
        background: rgba(124,58,237,.08);
        box-shadow: inset 2px 0 0 #8b5cf6;
      }

      .instance-cell {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .instance-avatar {
        width: 31px;
        height: 31px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 8px;
      }

      .instance-avatar.running {
        color: #38bdf8;
        background: rgba(56,189,248,.08);
      }

      .instance-avatar.stopped {
        color: #f59e0b;
        background: rgba(245,158,11,.08);
      }

      .instance-cell strong {
        display: block;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #e2e8f0;
        font-size: 11px;
      }

      .instance-cell small {
        display: block;
        margin-top: 3px;
        color: #475569;
        font-size: 8px;
      }

      td code {
        padding: 4px 6px;
        border-radius: 5px;
        color: #94a3b8;
        background: #08101b;
        font-family: Consolas, monospace;
        font-size: 8px;
      }

      .instance-type {
        color: #c4b5fd;
        font-size: 9px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border-radius: 20px;
        font-size: 9px;
        text-transform: capitalize;
      }

      .status-badge i {
        width: 5px;
        height: 5px;
        border-radius: 50%;
      }

      .status-badge.running {
        color: #4ade80;
        background: rgba(34,197,94,.07);
      }

      .status-badge.running i {
        background: #22c55e;
        box-shadow: 0 0 8px rgba(34,197,94,.6);
      }

      .status-badge.stopped {
        color: #fbbf24;
        background: rgba(245,158,11,.07);
      }

      .status-badge.stopped i {
        background: #f59e0b;
      }

      .ip-value {
        color: #94a3b8;
        font-family: Consolas, monospace;
        font-size: 9px;
      }

      .az-value {
        color: #64748b;
        font-size: 9px;
      }

      .view-button {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #29364a;
        border-radius: 7px;
        padding: 6px 9px;
        color: #a78bfa;
        background: transparent;
        cursor: pointer;
        font-size: 9px;
        transition: .18s ease;
      }

      .view-button:hover {
        border-color: #7c3aed;
        background: rgba(124,58,237,.09);
      }

      .empty-state {
        min-height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 7px;
        color: #475569;
      }

      .empty-state strong {
        color: #94a3b8;
        font-size: 12px;
      }

      .empty-state span {
        font-size: 10px;
      }

      /* =====================================================
         DETAIL OVERLAY
      ===================================================== */

      .detail-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        justify-content: flex-end;
        background: rgba(0,0,0,.68);
        backdrop-filter: blur(5px);
      }

      .instance-detail {
        width: min(650px, 100%);
        height: 100%;
        overflow-y: auto;
        padding: 27px;
        box-sizing: border-box;
        border-left: 1px solid #263349;
        background:
          linear-gradient(
            145deg,
            #0b1320,
            #080d16
          );
        box-shadow:
          -25px 0 70px rgba(0,0,0,.4);
        animation: slideDetail .25s ease;
      }

      @keyframes slideDetail {
        from {
          transform: translateX(100%);
          opacity: .5;
        }

        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        gap: 15px;
      }

      .detail-header h2 {
        margin: 7px 0 5px;
        color: #f8fafc;
        font-size: 24px;
        letter-spacing: -.7px;
      }

      .detail-id {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .detail-id code {
        color: #64748b;
        font-family: Consolas, monospace;
        font-size: 9px;
      }

      .detail-id button {
        width: 23px;
        height: 23px;
        display: grid;
        place-items: center;
        border: 1px solid #1e293b;
        border-radius: 6px;
        color: #64748b;
        background: #0e1725;
        cursor: pointer;
      }

      .close-detail {
        width: 35px;
        height: 35px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border: 1px solid #29364a;
        border-radius: 9px;
        color: #94a3b8;
        background: #101a29;
        cursor: pointer;
      }

      .close-detail:hover {
        color: #f8fafc;
        border-color: #475569;
      }

      /* =====================================================
         DETAIL STATUS
      ===================================================== */

      .detail-status {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 21px;
        padding: 14px;
        border: 1px solid #1e293b;
        border-radius: 11px;
        background: rgba(15,23,42,.55);
      }

      .detail-status.healthy {
        border-color: rgba(34,197,94,.15);
        background: rgba(34,197,94,.035);
      }

      .detail-status.warning {
        border-color: rgba(245,158,11,.15);
        background: rgba(245,158,11,.035);
      }

      .detail-status.critical {
        border-color: rgba(239,68,68,.17);
        background: rgba(239,68,68,.035);
      }

      .health-indicator {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 9px;
      }

      .detail-status.healthy .health-indicator {
        color: #4ade80;
        background: rgba(34,197,94,.09);
      }

      .detail-status.warning .health-indicator {
        color: #fbbf24;
        background: rgba(245,158,11,.09);
      }

      .detail-status.critical .health-indicator {
        color: #f87171;
        background: rgba(239,68,68,.09);
      }

      .detail-status > div:nth-child(2) {
        flex: 1;
      }

      .detail-status strong {
        display: block;
        color: #e2e8f0;
        font-size: 12px;
        text-transform: capitalize;
      }

      .detail-status span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
      }

      .region-tag {
        margin-left: auto;
        padding: 6px 8px;
        border-radius: 6px;
        color: #a78bfa !important;
        background: rgba(124,58,237,.09);
        font-size: 8px !important;
      }

      /* =====================================================
         DETAIL SECTIONS
      ===================================================== */

      .detail-section {
        margin-top: 24px;
      }

      .section-title {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 12px;
      }

      .section-title h3 {
        margin: 5px 0 0;
        color: #e2e8f0;
        font-size: 15px;
      }

      .metric-refresh {
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        border: 1px solid #29364a;
        border-radius: 8px;
        color: #a78bfa;
        background: #101a29;
        cursor: pointer;
      }

      .metric-refresh:disabled {
        opacity: .5;
      }

      /* =====================================================
         METRIC GRID
      ===================================================== */

      .metric-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }

      .metric-card {
        position: relative;
        min-height: 110px;
        padding: 14px;
        overflow: hidden;
        border: 1px solid #1e293b;
        border-radius: 11px;
        background: rgba(15,23,42,.6);
      }

      .metric-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .metric-icon {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 8px;
      }

      .metric-icon.purple {
        color: #a78bfa;
        background: rgba(124,58,237,.1);
      }

      .metric-icon.blue {
        color: #38bdf8;
        background: rgba(56,189,248,.08);
      }

      .metric-icon.green {
        color: #34d399;
        background: rgba(16,185,129,.08);
      }

      .metric-icon.cyan {
        color: #22d3ee;
        background: rgba(6,182,212,.08);
      }

      .metric-card-title span {
        display: block;
        color: #cbd5e1;
        font-size: 10px;
      }

      .metric-card-title small {
        display: block;
        margin-top: 3px;
        color: #475569;
        font-size: 8px;
      }

      .metric-value {
        margin-top: 14px;
        color: #f8fafc;
        font-size: 21px;
        font-weight: 700;
        letter-spacing: -.5px;
      }

      .metric-unavailable {
        margin-top: 9px;
        color: #64748b;
        font-size: 8px;
      }

      .metric-mini-line {
        height: 3px;
        margin-top: 10px;
        overflow: hidden;
        border-radius: 5px;
        background: #172033;
      }

      .metric-mini-line span {
        display: block;
        width: 38%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(
          90deg,
          #6d28d9,
          #a78bfa
        );
      }

      .metric-card.green .metric-mini-line span {
        background: linear-gradient(
          90deg,
          #059669,
          #34d399
        );
        width: 65%;
      }

      .metric-card.cyan .metric-mini-line span {
        background: linear-gradient(
          90deg,
          #0891b2,
          #22d3ee
        );
        width: 50%;
      }

      /* =====================================================
         LOADING / ERROR METRICS
      ===================================================== */

      .metrics-loading {
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border: 1px solid #1e293b;
        border-radius: 10px;
        color: #64748b;
        font-size: 10px;
      }

      .metrics-error {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px;
        border: 1px solid rgba(245,158,11,.15);
        border-radius: 10px;
        background: rgba(245,158,11,.035);
        color: #fbbf24;
      }

      .metrics-error div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .metrics-error strong {
        color: #fbbf24;
        font-size: 10px;
      }

      .metrics-error span {
        color: #64748b;
        font-size: 9px;
      }

      /* =====================================================
         CPU CHART
      ===================================================== */

      .chart-card {
        padding: 13px;
        border: 1px solid #1e293b;
        border-radius: 11px;
        background: rgba(15,23,42,.5);
      }

      .chart-summary {
        display: flex;
        align-items: center;
        gap: 25px;
        padding: 2px 3px 12px;
      }

      .chart-summary > div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .chart-summary span {
        color: #475569;
        font-size: 8px;
      }

      .chart-summary strong {
        color: #e2e8f0;
        font-size: 12px;
      }

      .chart-summary .chart-period {
        margin-left: auto;
        color: #64748b;
        font-size: 8px;
      }

      .cpu-chart {
        width: 100%;
      }

      .cpu-chart svg {
        width: 100%;
        height: 190px;
        display: block;
      }

      .chart-labels {
        display: flex;
        justify-content: space-between;
        padding-top: 5px;
        color: #475569;
        font-size: 8px;
      }

      .chart-live {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: #4ade80;
        font-size: 8px;
      }

      .chart-live span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 7px rgba(34,197,94,.7);
      }

      .chart-empty {
        min-height: 190px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 7px;
        color: #475569;
      }

      .chart-empty strong {
        color: #94a3b8;
        font-size: 11px;
      }

      .chart-empty span {
        color: #475569;
        font-size: 9px;
      }

      /* =====================================================
         NETWORK
      ===================================================== */

      .network-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }

      .network-card {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 9px;
        padding: 13px;
        border: 1px solid #1e293b;
        border-radius: 10px;
        background: rgba(15,23,42,.5);
      }

      .network-icon {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 8px;
      }

      .network-icon.in {
        color: #34d399;
        background: rgba(16,185,129,.08);
      }

      .network-icon.out {
        color: #22d3ee;
        background: rgba(6,182,212,.08);
      }

      .network-card span {
        display: block;
        color: #64748b;
        font-size: 8px;
      }

      .network-card strong {
        display: block;
        margin-top: 4px;
        color: #e2e8f0;
        font-size: 12px;
      }

      .network-card small {
        color: #475569;
        font-size: 8px;
      }

      /* =====================================================
         STATUS CHECKS
      ===================================================== */

      .checks-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
      }

      .check-card {
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 9px;
        padding: 12px;
        border: 1px solid #1e293b;
        border-radius: 10px;
        background: rgba(15,23,42,.5);
      }

      .check-card > div {
        grid-row: span 2;
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        border-radius: 8px;
      }

      .check-card.passed > div {
        color: #4ade80;
        background: rgba(34,197,94,.08);
      }

      .check-card.failed > div {
        color: #f87171;
        background: rgba(239,68,68,.08);
      }

      .check-card span {
        color: #64748b;
        font-size: 8px;
      }

      .check-card strong {
        margin-top: 4px;
        color: #cbd5e1;
        font-size: 10px;
        text-transform: capitalize;
      }

      /* =====================================================
         ALERTS
      ===================================================== */

      .alert-count {
        padding: 5px 8px;
        border-radius: 20px;
        font-size: 8px;
        font-weight: 700;
      }

      .alert-count.healthy {
        color: #4ade80;
        background: rgba(34,197,94,.08);
      }

      .alert-count.has-alerts {
        color: #fca5a5;
        background: rgba(239,68,68,.08);
      }

      .no-alerts {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 14px;
        border: 1px solid rgba(34,197,94,.14);
        border-radius: 10px;
        background: rgba(34,197,94,.035);
      }

      .no-alert-icon {
        width: 33px;
        height: 33px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 50%;
        color: #22c55e;
        background: rgba(34,197,94,.09);
      }

      .no-alerts strong {
        display: block;
        color: #cbd5e1;
        font-size: 10px;
      }

      .no-alerts span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 8px;
        line-height: 1.5;
      }

      .alert-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .alert-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px;
        border-radius: 9px;
      }

      .alert-item.warning {
        border: 1px solid rgba(245,158,11,.15);
        background: rgba(245,158,11,.04);
      }

      .alert-item.critical {
        border: 1px solid rgba(239,68,68,.17);
        background: rgba(239,68,68,.04);
      }

      .alert-icon {
        width: 29px;
        height: 29px;
        display: grid;
        place-items: center;
        flex: 0 0 29px;
        border-radius: 8px;
      }

      .warning .alert-icon {
        color: #fbbf24;
        background: rgba(245,158,11,.09);
      }

      .critical .alert-icon {
        color: #f87171;
        background: rgba(239,68,68,.09);
      }

      .alert-item strong {
        display: block;
        color: #e2e8f0;
        font-size: 10px;
      }

      .alert-item span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 8px;
        line-height: 1.45;
      }

      /* =====================================================
         INFO GRID
      ===================================================== */

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1px;
        overflow: hidden;
        border: 1px solid #1e293b;
        border-radius: 10px;
        background: #1e293b;
      }

      .info-grid > div {
        min-height: 62px;
        padding: 12px;
        background: #0d1624;
      }

      .info-grid .wide-info {
        grid-column: 1 / -1;
      }

      .info-grid span,
      .info-grid strong {
        display: block;
      }

      .info-grid span {
        color: #475569;
        font-size: 8px;
      }

      .info-grid strong {
        margin-top: 6px;
        color: #cbd5e1;
        font-size: 9px;
        word-break: break-word;
      }

      /* =====================================================
         RAM NOTICE
      ===================================================== */

      .ram-notice {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-top: 20px;
        padding: 13px;
        border: 1px solid rgba(139,92,246,.14);
        border-radius: 10px;
        background: rgba(139,92,246,.04);
      }

      .ram-notice-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 8px;
        color: #a78bfa;
        background: rgba(139,92,246,.1);
      }

      .ram-notice strong {
        display: block;
        color: #c4b5fd;
        font-size: 10px;
      }

      .ram-notice p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 8px;
        line-height: 1.55;
      }

      .ram-notice code {
        padding: 2px 4px;
        border-radius: 4px;
        color: #c4b5fd;
        background: rgba(139,92,246,.08);
        font-family: Consolas, monospace;
      }

      /* =====================================================
         FOOTER
      ===================================================== */

      .detail-footer {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 22px;
        padding: 13px;
        border: 1px solid rgba(34,197,94,.12);
        border-radius: 10px;
        background: rgba(34,197,94,.03);
      }

      .footer-live {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 9px rgba(34,197,94,.55);
      }

      .detail-footer > div:nth-child(2) {
        flex: 1;
      }

      .detail-footer strong,
      .detail-footer span {
        display: block;
      }

      .detail-footer strong {
        color: #4ade80;
        font-size: 9px;
      }

      .detail-footer span {
        margin-top: 3px;
        color: #64748b;
        font-size: 8px;
      }

      .footer-right {
        color: #475569;
        text-align: right;
        font-size: 8px;
      }

      .footer-right strong {
        margin-top: 3px;
        color: #94a3b8;
      }

      /* =====================================================
         LOADING
      ===================================================== */

      .ec2-loading {
        min-height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .loading-icon {
        width: 62px;
        height: 62px;
        display: grid;
        place-items: center;
        border-radius: 17px;
        color: #a78bfa;
        background: rgba(124,58,237,.1);
        animation: loadingFloat 1.5s ease-in-out infinite;
      }

      .ec2-loading h2 {
        margin: 17px 0 5px;
        font-size: 17px;
      }

      .ec2-loading p {
        margin: 0;
        color: #64748b;
        font-size: 10px;
      }

      .loading-bar {
        width: 170px;
        height: 3px;
        margin-top: 18px;
        overflow: hidden;
        border-radius: 10px;
        background: #172033;
      }

      .loading-bar span {
        display: block;
        width: 45%;
        height: 100%;
        border-radius: inherit;
        background: #8b5cf6;
        animation: loadingBar 1.2s infinite;
      }

      @keyframes loadingFloat {
        0%,100% {
          transform: translateY(0);
        }

        50% {
          transform: translateY(-6px);
        }
      }

      @keyframes loadingBar {
        0% {
          transform: translateX(-100%);
        }

        100% {
          transform: translateX(320%);
        }
      }

      /* =====================================================
         RESPONSIVE
      ===================================================== */

      @media (max-width: 1100px) {
        .ec2-page {
          padding: 27px 25px 40px;
        }

        .ec2-stat-grid {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }

        .ec2-table-card {
          overflow: hidden;
        }

        table {
          min-width: 900px;
        }
      }

      @media (max-width: 760px) {
        .ec2-page {
          padding: 22px 15px 35px;
        }

        .ec2-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .ec2-refresh {
          width: 100%;
        }

        .ec2-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .search-box {
          max-width: none;
        }

        .filter-group {
          justify-content: center;
        }

        .ec2-stat-grid {
          grid-template-columns: 1fr;
        }

        .table-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .metric-grid,
        .network-grid,
        .checks-grid {
          grid-template-columns: 1fr;
        }

        .instance-detail {
          width: 100%;
          padding: 20px;
        }

        .chart-summary {
          gap: 15px;
        }

        .chart-summary .chart-period {
          display: none;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .info-grid .wide-info {
          grid-column: auto;
        }
      }

    `}</style>
  );
}

export default EC2;