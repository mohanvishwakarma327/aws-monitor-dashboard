import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Network,
  RefreshCw,
  Server,
  Wifi,
  XCircle,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function formatBytes(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${value.toFixed(0)} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.00%";
  }

  return `${number.toFixed(2)}%`;
}

function getMetric(metrics, id) {
  return (
    metrics?.find((metric) => metric.Id === id) || {
      Values: [],
      Timestamps: [],
    }
  );
}

function average(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  if (valid.length === 0) {
    return 0;
  }

  return (
    valid.reduce((sum, value) => sum + value, 0) /
    valid.length
  );
}

function latestValue(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  return Number(values[0]) || 0;
}

function getMax(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  return valid.length ? Math.max(...valid) : 0;
}

function getMin(values) {
  if (!values || values.length === 0) {
    return 0;
  }

  const valid = values
    .map(Number)
    .filter(Number.isFinite);

  return valid.length ? Math.min(...valid) : 0;
}

function getCpuStatus(cpu) {
  if (cpu >= 90) {
    return {
      label: "Critical",
      color: "#ff4d67",
      background: "rgba(255,77,103,.10)",
    };
  }

  if (cpu >= 70) {
    return {
      label: "Warning",
      color: "#ffad33",
      background: "rgba(255,173,51,.10)",
    };
  }

  return {
    label: "Normal",
    color: "#00d084",
    background: "rgba(0,208,132,.10)",
  };
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "#8b5cf6",
}) {
  return (
    <div
      className="cw-metric-card"
      style={{
        "--metric-color": color,
      }}
    >
      <div className="cw-metric-top">
        <div>
          <div className="cw-metric-title">
            {title}
          </div>

          <div className="cw-metric-value">
            {value}
          </div>
        </div>

        <div
          className="cw-metric-icon"
          style={{
            color,
            background: `${color}18`,
            borderColor: `${color}35`,
          }}
        >
          <Icon size={21} />
        </div>
      </div>

      <div className="cw-metric-subtitle">
        {subtitle}
      </div>
    </div>
  );
}

export default function CloudWatch() {
  const [instances, setInstances] = useState([]);

  const [selectedInstanceId, setSelectedInstanceId] =
    useState("");

  const [metricData, setMetricData] = useState(null);

  const [loadingInstances, setLoadingInstances] =
    useState(true);

  const [loadingMetrics, setLoadingMetrics] =
    useState(false);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  // =====================================================
  // LOAD EC2 INSTANCES
  // =====================================================

  const loadInstances = useCallback(async () => {
    try {
      setLoadingInstances(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/ec2/instances`
      );

      if (!response.ok) {
        throw new Error(
          `EC2 API returned ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message ||
            "Unable to retrieve EC2 instances"
        );
      }

      const list = result.instances || [];

      setInstances(list);

      // Keep current selection if it still exists
      const currentExists = list.some(
        (instance) =>
          instance.id === selectedInstanceId
      );

      if (!currentExists && list.length > 0) {
        const runningInstance = list.find(
          (instance) =>
            instance.state === "running"
        );

        setSelectedInstanceId(
          runningInstance?.id ||
            list[0].id
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error(
        "CloudWatch EC2 loading error:",
        err
      );

      setError(
        err.message ||
          "Failed to load EC2 instances"
      );
    } finally {
      setLoadingInstances(false);
    }
  }, [selectedInstanceId]);

  // =====================================================
  // LOAD CLOUDWATCH METRICS
  // =====================================================

  const loadMetrics = useCallback(
    async (instanceId) => {
      if (!instanceId) {
        return;
      }

      try {
        setLoadingMetrics(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/ec2/${instanceId}/metrics`
        );

        if (!response.ok) {
          throw new Error(
            `CloudWatch API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message ||
              "Unable to retrieve CloudWatch metrics"
          );
        }

        setMetricData(result);

        setLastUpdated(new Date());
      } catch (err) {
        console.error(
          "CloudWatch metrics error:",
          err
        );

        setError(
          err.message ||
            "Failed to load CloudWatch metrics"
        );

        setMetricData(null);
      } finally {
        setLoadingMetrics(false);
      }
    },
    []
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // =====================================================
  // LOAD METRICS WHEN INSTANCE CHANGES
  // =====================================================

  useEffect(() => {
    if (selectedInstanceId) {
      loadMetrics(selectedInstanceId);
    }
  }, [selectedInstanceId, loadMetrics]);

  // =====================================================
  // AUTO REFRESH
  // =====================================================

  useEffect(() => {
    const timer = setInterval(() => {
      loadInstances();

      if (selectedInstanceId) {
        loadMetrics(selectedInstanceId);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [
    loadInstances,
    loadMetrics,
    selectedInstanceId,
  ]);

  // =====================================================
  // SELECTED INSTANCE
  // =====================================================

  const selectedInstance = useMemo(() => {
    return (
      instances.find(
        (instance) =>
          instance.id === selectedInstanceId
      ) || null
    );
  }, [instances, selectedInstanceId]);

  // =====================================================
  // METRICS
  // =====================================================

  const cpuMetric = getMetric(
    metricData?.metrics,
    "cpu"
  );

  const networkInMetric = getMetric(
    metricData?.metrics,
    "networkIn"
  );

  const networkOutMetric = getMetric(
    metricData?.metrics,
    "networkOut"
  );

  const statusMetric = getMetric(
    metricData?.metrics,
    "statusCheck"
  );

  const cpuAverage = average(
    cpuMetric.Values
  );

  const cpuLatest = latestValue(
    cpuMetric.Values
  );

  const cpuMaximum = getMax(
    cpuMetric.Values
  );

  const cpuMinimum = getMin(
    cpuMetric.Values
  );

  const networkInLatest = latestValue(
    networkInMetric.Values
  );

  const networkOutLatest = latestValue(
    networkOutMetric.Values
  );

  const statusCheck = latestValue(
    statusMetric.Values
  );

  const cpuStatus = getCpuStatus(
    cpuLatest
  );

  const statusHealthy =
    statusCheck === 0;

  // =====================================================
  // COUNTS
  // =====================================================

  const runningCount = instances.filter(
    (instance) =>
      instance.state === "running"
  ).length;

  const stoppedCount = instances.filter(
    (instance) =>
      instance.state === "stopped"
  ).length;

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  async function refreshAll() {
    await loadInstances();

    if (selectedInstanceId) {
      await loadMetrics(
        selectedInstanceId
      );
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="page-content cloudwatch-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="cw-page-header">

        <div>
          <div className="cw-eyebrow">
            AWS CLOUDWATCH
          </div>

          <h2>
            CloudWatch Metrics
          </h2>

          <p>
            Real-time EC2 performance and
            infrastructure monitoring
          </p>
        </div>

        <div className="cw-header-actions">

          <div className="cw-live-badge">
            <span />
            LIVE
          </div>

          <button
            className="cw-refresh-button"
            onClick={refreshAll}
            disabled={
              loadingInstances ||
              loadingMetrics
            }
          >
            <RefreshCw
              size={16}
              className={
                loadingMetrics
                  ? "cw-spin"
                  : ""
              }
            />

            {loadingMetrics
              ? "Loading..."
              : "Refresh"}
          </button>

        </div>

      </div>

      {/* =================================================
          CONNECTION STATUS
      ================================================= */}

      <div className="cw-connection">

        <div
          className={
            metricData
              ? "cw-connection-dot connected"
              : "cw-connection-dot"
          }
        />

        <span>
          CloudWatch{" "}
          {metricData
            ? "Connected"
            : "Ready"}
        </span>

        <span className="cw-separator">
          •
        </span>

        <span>
          ap-south-1
        </span>

        {lastUpdated && (
          <>
            <span className="cw-separator">
              •
            </span>

            <span>
              Updated{" "}
              {lastUpdated.toLocaleTimeString()}
            </span>
          </>
        )}

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="cw-error">

          <AlertTriangle size={20} />

          <div>
            <strong>
              CloudWatch request failed
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            onClick={refreshAll}
          >
            Retry
          </button>

        </div>
      )}

      {/* =================================================
          INSTANCE SELECTOR
      ================================================= */}

      <div className="cw-selector-panel">

        <div className="cw-selector-left">

          <div className="cw-selector-icon">
            <Server size={21} />
          </div>

          <div>
            <span>
              Monitoring Instance
            </span>

            <strong>
              {selectedInstance?.name ||
                "Select an EC2 instance"}
            </strong>
          </div>

        </div>

        <select
          value={selectedInstanceId}
          onChange={(event) =>
            setSelectedInstanceId(
              event.target.value
            )
          }
          disabled={
            loadingInstances ||
            instances.length === 0
          }
          className="cw-instance-select"
        >
          {instances.length === 0 && (
            <option value="">
              No EC2 instances
            </option>
          )}

          {instances.map(
            (instance) => (
              <option
                key={instance.id}
                value={instance.id}
              >
                {instance.name} —{" "}
                {instance.id}
              </option>
            )
          )}
        </select>

      </div>

      {/* =================================================
          TOP METRICS
      ================================================= */}

      <div className="cw-metrics-grid">

        <MetricCard
          icon={Cpu}
          title="CPU UTILIZATION"
          value={formatPercent(
            cpuLatest
          )}
          subtitle={`Average ${formatPercent(
            cpuAverage
          )} · Max ${formatPercent(
            cpuMaximum
          )}`}
          color="#9b6cff"
        />

        <MetricCard
          icon={Network}
          title="NETWORK IN"
          value={formatBytes(
            networkInLatest
          )}
          subtitle="CloudWatch · Last datapoint"
          color="#00d084"
        />

        <MetricCard
          icon={Wifi}
          title="NETWORK OUT"
          value={formatBytes(
            networkOutLatest
          )}
          subtitle="CloudWatch · Last datapoint"
          color="#22c7ff"
        />

        <MetricCard
          icon={
            statusHealthy
              ? CheckCircle2
              : XCircle
          }
          title="STATUS CHECK"
          value={
            statusHealthy
              ? "Healthy"
              : "Failed"
          }
          subtitle={
            statusHealthy
              ? "Instance system checks normal"
              : "CloudWatch status check failed"
          }
          color={
            statusHealthy
              ? "#00d084"
              : "#ff4d67"
          }
        />

      </div>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="cw-main-grid">

        {/* =================================================
            CPU CHART
        ================================================= */}

        <div className="cw-panel">

          <div className="cw-panel-header">

            <div>
              <div className="cw-panel-label">
                PERFORMANCE
              </div>

              <h3>
                CPU Utilization
              </h3>

              <p>
                AWS/EC2 · Average · Last 1 hour
              </p>
            </div>

            <div className="cw-current">

              <strong>
                {formatPercent(
                  cpuLatest
                )}
              </strong>

              <span
                style={{
                  color:
                    cpuStatus.color,
                  background:
                    cpuStatus.background,
                }}
              >
                ● {cpuStatus.label}
              </span>

            </div>

          </div>

          {/* CPU GRAPH */}

          <div className="cw-chart-container">

            <div className="cw-y-labels">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            <div className="cw-chart">

              <div className="cw-grid">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="cw-bars">

                {cpuMetric.Values &&
                cpuMetric.Values.length > 0 ? (
                  cpuMetric.Values
                    .slice()
                    .reverse()
                    .map(
                      (
                        value,
                        index
                      ) => (
                        <div
                          className="cw-bar-wrapper"
                          key={index}
                        >
                          <div
                            className="cw-bar"
                            style={{
                              height: `${Math.max(
                                3,
                                Math.min(
                                  100,
                                  Number(
                                    value
                                  )
                                )
                              )}%`,
                            }}
                            title={`${Number(
                              value
                            ).toFixed(
                              2
                            )}%`}
                          />
                        </div>
                      )
                    )
                ) : (
                  <div className="cw-no-data">
                    <BarChart3
                      size={30}
                    />

                    <span>
                      No CPU datapoints
                    </span>
                  </div>
                )}

              </div>

            </div>

          </div>

          <div className="cw-chart-footer">

            <span>
              Minimum{" "}
              <strong>
                {formatPercent(
                  cpuMinimum
                )}
              </strong>
            </span>

            <span>
              Average{" "}
              <strong>
                {formatPercent(
                  cpuAverage
                )}
              </strong>
            </span>

            <span>
              Maximum{" "}
              <strong>
                {formatPercent(
                  cpuMaximum
                )}
              </strong>
            </span>

            <span>
              Period{" "}
              <strong>
                Last 1 hour
              </strong>
            </span>

          </div>

        </div>

        {/* =================================================
            INSTANCE HEALTH
        ================================================= */}

        <div className="cw-panel">

          <div className="cw-panel-header">

            <div>
              <div className="cw-panel-label">
                INSTANCE
              </div>

              <h3>
                Instance Health
              </h3>

              <p>
                Current EC2 status
              </p>
            </div>

            {selectedInstance?.state ===
              "running" ? (
              <CheckCircle2
                size={27}
                color="#00d084"
              />
            ) : (
              <AlertTriangle
                size={27}
                color="#ffad33"
              />
            )}

          </div>

          {selectedInstance ? (
            <div className="cw-instance-health">

              <div className="cw-health-name">
                <div className="cw-big-server">
                  <Server size={25} />
                </div>

                <div>
                  <strong>
                    {selectedInstance.name}
                  </strong>

                  <span>
                    {selectedInstance.id}
                  </span>
                </div>
              </div>

              <div className="cw-health-status">

                <span
                  className={
                    selectedInstance.state ===
                    "running"
                      ? "running"
                      : "stopped"
                  }
                />

                <strong
                  style={{
                    color:
                      selectedInstance.state ===
                      "running"
                        ? "#00d084"
                        : "#ffad33",
                  }}
                >
                  {selectedInstance.state}
                </strong>

              </div>

              <div className="cw-detail-row">
                <span>Instance Type</span>
                <strong>
                  {selectedInstance.type}
                </strong>
              </div>

              <div className="cw-detail-row">
                <span>Private IP</span>
                <strong>
                  {selectedInstance.privateIp ||
                    "—"}
                </strong>
              </div>

              <div className="cw-detail-row">
                <span>Availability Zone</span>
                <strong>
                  {
                    selectedInstance.availabilityZone
                  }
                </strong>
              </div>

              <div className="cw-detail-row">
                <span>Status Check</span>

                <strong
                  style={{
                    color:
                      statusHealthy
                        ? "#00d084"
                        : "#ff4d67",
                  }}
                >
                  {statusHealthy
                    ? "Passed"
                    : "Failed"}
                </strong>
              </div>

            </div>
          ) : (
            <div className="cw-empty">
              Select an EC2 instance
              to view health.
            </div>
          )}

        </div>

      </div>

      {/* =================================================
          NETWORK PANEL
      ================================================= */}

      <div className="cw-network-panel">

        <div className="cw-network-header">

          <div>
            <div className="cw-panel-label">
              NETWORK
            </div>

            <h3>
              Network Activity
            </h3>

            <p>
              CloudWatch EC2 NetworkIn
              and NetworkOut
            </p>
          </div>

          <Network
            size={24}
            color="#22c7ff"
          />

        </div>

        <div className="cw-network-grid">

          <div className="cw-network-card">

            <div className="network-icon in">
              ↓
            </div>

            <div>
              <span>
                Network In
              </span>

              <strong>
                {formatBytes(
                  networkInLatest
                )}
              </strong>
            </div>

          </div>

          <div className="cw-network-card">

            <div className="network-icon out">
              ↑
            </div>

            <div>
              <span>
                Network Out
              </span>

              <strong>
                {formatBytes(
                  networkOutLatest
                )}
              </strong>
            </div>

          </div>

          <div className="cw-network-card">

            <div className="network-icon total">
              ⇄
            </div>

            <div>
              <span>
                Latest Total
              </span>

              <strong>
                {formatBytes(
                  networkInLatest +
                    networkOutLatest
                )}
              </strong>
            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          MONITORING STATUS
      ================================================= */}

      <div className="cw-monitor-panel">

        <div className="cw-monitor-icon">
          <Activity size={25} />
        </div>

        <div className="cw-monitor-content">

          <strong>
            CloudWatch Monitoring Active
          </strong>

          <span>
            AWS/EC2 metrics are being
            retrieved from the Mumbai
            region using GetMetricData.
          </span>

        </div>

        <div className="cw-monitor-stats">

          <div>
            <span>
              EC2 Instances
            </span>

            <strong>
              {instances.length}
            </strong>
          </div>

          <div>
            <span>
              Running
            </span>

            <strong
              style={{
                color: "#00d084",
              }}
            >
              {runningCount}
            </strong>
          </div>

          <div>
            <span>
              Stopped
            </span>

            <strong
              style={{
                color: "#ffad33",
              }}
            >
              {stoppedCount}
            </strong>
          </div>

          <div>
            <span>
              Region
            </span>

            <strong>
              ap-south-1
            </strong>
          </div>

        </div>

      </div>

      {/* =================================================
          RAM INFORMATION
      ================================================= */}

      <div className="cw-info-panel">

        <Database
          size={20}
          color="#9b6cff"
        />

        <div>
          <strong>
            RAM Monitoring
          </strong>

          <span>
            Memory utilization is not
            available from standard EC2
            CloudWatch metrics. Once the
            CloudWatch Agent is configured,
            we can display RAM usage here
            using the CWAgent namespace.
          </span>
        </div>

        <span className="cw-coming">
          COMING NEXT
        </span>

      </div>

      {/* =================================================
          STYLES
      ================================================= */}

      <style>{`

        .cloudwatch-page {
          min-height: 100%;
          padding-bottom: 60px;
        }

        .cw-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 25px;
          margin-bottom: 18px;
        }

        .cw-eyebrow {
          color: #9b6cff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }

        .cw-page-header h2 {
          margin: 0;
          font-size: 34px;
          letter-spacing: -.8px;
        }

        .cw-page-header p {
          margin: 8px 0 0;
          color: #718096;
          font-size: 14px;
        }

        .cw-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cw-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(0,208,132,.25);
          background: rgba(0,208,132,.07);
          color: #00d084;
          font-size: 12px;
          font-weight: 700;
        }

        .cw-live-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00d084;
          box-shadow: 0 0 10px #00d084;
        }

        .cw-refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 10px;
          border: 1px solid #7041c9;
          background: linear-gradient(
            135deg,
            #5b21b6,
            #7c3aed
          );
          color: white;
          cursor: pointer;
          font-weight: 650;
        }

        .cw-refresh-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .cw-spin {
          animation: cw-spin 1s linear infinite;
        }

        @keyframes cw-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .cw-connection {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #8190a8;
          font-size: 13px;
          margin-bottom: 22px;
        }

        .cw-connection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffad33;
        }

        .cw-connection-dot.connected {
          background: #00d084;
          box-shadow: 0 0 10px #00d084;
        }

        .cw-separator {
          color: #334155;
        }

        .cw-error {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          margin-bottom: 20px;
          border-radius: 14px;
          border: 1px solid rgba(255,77,103,.25);
          background: rgba(127,29,29,.15);
          color: #ff9baa;
        }

        .cw-error > div {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cw-error strong {
          color: #ffd2d9;
        }

        .cw-error button {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #42506a;
          background: #111a2a;
          color: #e2e8f0;
          cursor: pointer;
        }

        .cw-selector-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 17px 20px;
          margin-bottom: 20px;
          border: 1px solid #202d42;
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              rgba(16,26,43,.98),
              rgba(9,15,27,.98)
            );
        }

        .cw-selector-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .cw-selector-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #9b6cff;
          background: rgba(124,58,237,.12);
          border: 1px solid rgba(124,58,237,.2);
        }

        .cw-selector-left > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cw-selector-left span {
          color: #687991;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .cw-selector-left strong {
          font-size: 15px;
        }

        .cw-instance-select {
          min-width: 330px;
          padding: 11px 13px;
          border-radius: 10px;
          border: 1px solid #2c3a51;
          background: #0b1422;
          color: #e2e8f0;
          outline: none;
          cursor: pointer;
        }

        .cw-metrics-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .cw-metric-card {
          position: relative;
          overflow: hidden;
          min-height: 140px;
          padding: 19px;
          border-radius: 16px;
          border: 1px solid #202d42;
          background:
            linear-gradient(
              145deg,
              rgba(14,24,40,.98),
              rgba(8,14,25,.98)
            );
          transition:
            transform .2s,
            border-color .2s;
        }

        .cw-metric-card:hover {
          transform: translateY(-3px);
          border-color: #35445e;
        }

        .cw-metric-card::after {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          right: -45px;
          top: -45px;
          border-radius: 50%;
          background: var(--metric-color);
          opacity: .05;
          filter: blur(15px);
        }

        .cw-metric-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .cw-metric-title {
          color: #718096;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .cw-metric-value {
          margin-top: 12px;
          font-size: 28px;
          font-weight: 750;
        }

        .cw-metric-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          border: 1px solid;
        }

        .cw-metric-subtitle {
          margin-top: 14px;
          color: #61708a;
          font-size: 11px;
        }

        .cw-main-grid {
          display: grid;
          grid-template-columns:
            minmax(0,1.55fr)
            minmax(300px,.85fr);
          gap: 18px;
        }

        .cw-panel {
          padding: 22px;
          border-radius: 17px;
          border: 1px solid #202d42;
          background:
            linear-gradient(
              145deg,
              rgba(13,22,37,.98),
              rgba(7,13,23,.98)
            );
          box-shadow:
            0 18px 40px rgba(0,0,0,.16);
        }

        .cw-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .cw-panel-label {
          color: #9b6cff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.7px;
          margin-bottom: 6px;
        }

        .cw-panel h3 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .cw-panel p {
          margin: 0;
          color: #687991;
          font-size: 12px;
        }

        .cw-current {
          text-align: right;
        }

        .cw-current strong {
          display: block;
          font-size: 27px;
          margin-bottom: 5px;
        }

        .cw-current span {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
        }

        .cw-chart-container {
          display: flex;
          height: 290px;
          gap: 12px;
        }

        .cw-y-labels {
          width: 42px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2px 0 20px;
          color: #4f5e74;
          font-size: 10px;
          text-align: right;
        }

        .cw-chart {
          position: relative;
          flex: 1;
          overflow: hidden;
          border-bottom: 1px solid #26334a;
        }

        .cw-grid {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .cw-grid span {
          width: 100%;
          border-top: 1px dashed
            rgba(90,108,137,.18);
        }

        .cw-bars {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          gap: 7px;
          padding: 5px 5px 0;
        }

        .cw-bar-wrapper {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: flex-end;
          min-width: 5px;
        }

        .cw-bar {
          width: 100%;
          border-radius:
            6px 6px 2px 2px;
          background:
            linear-gradient(
              to top,
              #6d28d9,
              #a78bfa
            );
          box-shadow:
            0 0 15px
            rgba(124,58,237,.15);
          transition: height .4s ease;
          min-height: 4px;
        }

        .cw-no-data {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #53627a;
        }

        .cw-chart-footer {
          display: grid;
          grid-template-columns:
            repeat(4,1fr);
          gap: 10px;
          margin-top: 15px;
          color: #64748b;
          font-size: 11px;
        }

        .cw-chart-footer span {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cw-chart-footer strong {
          color: #dbe4f0;
          font-size: 13px;
        }

        .cw-instance-health {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .cw-health-name {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border-radius: 12px;
          background: #0a1321;
          border: 1px solid #1e2a3d;
        }

        .cw-big-server {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          color: #9b6cff;
          background: rgba(124,58,237,.12);
          border-radius: 11px;
        }

        .cw-health-name div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .cw-health-name strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cw-health-name span {
          color: #53627a;
          font-size: 10px;
        }

        .cw-health-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 2px;
        }

        .cw-health-status span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .cw-health-status span.running {
          background: #00d084;
          box-shadow: 0 0 10px #00d084;
        }

        .cw-health-status span.stopped {
          background: #ffad33;
          box-shadow: 0 0 10px #ffad33;
        }

        .cw-detail-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 13px 0;
          border-top: 1px solid #1b2637;
          font-size: 12px;
        }

        .cw-detail-row span {
          color: #61708a;
        }

        .cw-detail-row strong {
          color: #dbe4f0;
        }

        .cw-empty {
          display: grid;
          place-items: center;
          min-height: 250px;
          color: #53627a;
        }

        .cw-network-panel {
          margin-top: 18px;
          padding: 22px;
          border-radius: 17px;
          border: 1px solid #202d42;
          background:
            linear-gradient(
              145deg,
              rgba(13,22,37,.98),
              rgba(7,13,23,.98)
            );
        }

        .cw-network-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .cw-network-header h3 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .cw-network-header p {
          margin: 0;
          color: #687991;
          font-size: 12px;
        }

        .cw-network-grid {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 13px;
        }

        .cw-network-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px;
          border-radius: 13px;
          background: #0a1321;
          border: 1px solid #1d2a3d;
        }

        .network-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-size: 22px;
          font-weight: 700;
        }

        .network-icon.in {
          color: #00d084;
          background: rgba(0,208,132,.09);
        }

        .network-icon.out {
          color: #22c7ff;
          background: rgba(34,199,255,.09);
        }

        .network-icon.total {
          color: #9b6cff;
          background: rgba(155,108,255,.09);
        }

        .cw-network-card div:last-child {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .cw-network-card span {
          color: #64748b;
          font-size: 11px;
        }

        .cw-network-card strong {
          font-size: 20px;
        }

        .cw-monitor-panel {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 18px;
          padding: 18px 20px;
          border-radius: 16px;
          border: 1px solid rgba(0,208,132,.15);
          background:
            linear-gradient(
              135deg,
              rgba(0,208,132,.045),
              rgba(8,16,27,.98)
            );
        }

        .cw-monitor-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #00d084;
          background: rgba(0,208,132,.09);
        }

        .cw-monitor-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .cw-monitor-content strong {
          font-size: 14px;
        }

        .cw-monitor-content span {
          color: #64748b;
          font-size: 12px;
        }

        .cw-monitor-stats {
          display: flex;
          gap: 25px;
        }

        .cw-monitor-stats div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cw-monitor-stats span {
          color: #53627a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .6px;
        }

        .cw-monitor-stats strong {
          font-size: 13px;
        }

        .cw-info-panel {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 18px;
          padding: 17px 20px;
          border-radius: 14px;
          border: 1px solid rgba(124,58,237,.18);
          background: rgba(124,58,237,.045);
        }

        .cw-info-panel > div {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .cw-info-panel span {
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .cw-coming {
          color: #b99cff !important;
          font-size: 9px !important;
          font-weight: 800;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {

          .cw-metrics-grid {
            grid-template-columns:
              repeat(2,1fr);
          }

          .cw-main-grid {
            grid-template-columns: 1fr;
          }

          .cw-network-grid {
            grid-template-columns: 1fr;
          }

          .cw-monitor-panel {
            align-items: flex-start;
            flex-wrap: wrap;
          }

        }

        @media (max-width: 700px) {

          .cw-page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .cw-selector-panel {
            flex-direction: column;
            align-items: stretch;
          }

          .cw-instance-select {
            min-width: 0;
            width: 100%;
          }

          .cw-metrics-grid {
            grid-template-columns: 1fr;
          }

          .cw-chart-footer {
            grid-template-columns:
              repeat(2,1fr);
          }

          .cw-monitor-stats {
            width: 100%;
            display: grid;
            grid-template-columns:
              repeat(2,1fr);
          }

        }

      `}</style>

    </div>
  );
}