import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

/* ======================================================
   HELPERS
====================================================== */

function formatBytes(bytes) {
  if (
    bytes === null ||
    bytes === undefined ||
    Number.isNaN(Number(bytes))
  ) {
    return "0 B";
  }

  const value = Number(bytes);

  if (value < 1024) return `${value.toFixed(0)} B`;

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Number(value).toFixed(2)}%`;
}

function getStatusColor(state) {
  if (state === "running") return "#00d084";
  if (state === "stopped") return "#ff9f43";
  return "#8b5cf6";
}

function StatusDot({ state }) {
  const color = getStatusColor(state);

  return (
    <span
      className="status-dot-live"
      style={{
        width: 9,
        height: 9,
        borderRadius: "50%",
        display: "inline-block",
        background: color,
        boxShadow: `0 0 10px ${color}`,
        marginRight: 8,
      }}
    />
  );
}

/* ======================================================
   ANIMATED NUMBER
====================================================== */

function AnimatedNumber({ value, decimals = 0 }) {
  const numericValue =
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
      ? 0
      : Number(value);

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = numericValue;
    const duration = 650;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const progress = Math.min(
        (currentTime - startTime) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      const current =
        start + (end - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {};
  }, [numericValue]);

  return (
    <>
      {displayValue.toFixed(decimals)}
    </>
  );
}

/* ======================================================
   DASHBOARD
====================================================== */

export default function Dashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ======================================================
     LOAD DASHBOARD
  ====================================================== */

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/dashboard/summary`
      );

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message ||
            "Dashboard request failed"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(
        err.message ||
          "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ======================================================
     AUTO REFRESH
  ====================================================== */

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadDashboard]);

  /* ======================================================
     DATA
  ====================================================== */

  const instances =
    data?.instances || [];

  const running =
    data?.ec2?.running || 0;

  const stopped =
    data?.ec2?.stopped || 0;

  const total =
    data?.ec2?.total || 0;

  const cpu =
    data?.cloudWatch?.metrics?.cpuAverage;

  const networkIn =
    data?.cloudWatch?.metrics?.networkInBytes;

  const networkOut =
    data?.cloudWatch?.metrics?.networkOutBytes;

  const totalNetwork =
    data?.cloudWatch?.metrics?.totalNetworkBytes;

  const cloudWatchAvailable =
    data?.cloudWatch?.available === true;

  /* ======================================================
     NAVIGATION
  ====================================================== */

  const openEC2 = () => {
    navigate("/ec2");
  };

  return (
    <div className="aws-dashboard-page">

      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <div className="dashboard-header">

        <div>
          <div className="dashboard-kicker">
            AWS INFRASTRUCTURE
          </div>

          <h1>
            Infrastructure Overview
          </h1>

          <p>
            Real-time EC2 and CloudWatch
            monitoring
          </p>
        </div>

        <div className="dashboard-header-actions">

          <div className="auto-refresh-badge">
            <span className="refresh-pulse" />
            Auto refresh
            <b>30s</b>
          </div>

          <button
            className="dashboard-refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <span
              className={
                loading
                  ? "refresh-icon spinning"
                  : "refresh-icon"
              }
            >
              ↻
            </span>

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

      </div>

      {/* ==================================================
          CONNECTION STATUS
      ================================================== */}

      <div className="dashboard-connection">

        <span
          className={
            cloudWatchAvailable
              ? "connection-dot connected"
              : "connection-dot warning"
          }
        />

        <span>
          CloudWatch{" "}
          {cloudWatchAvailable
            ? "connected"
            : "unavailable"}
        </span>

        <span>•</span>

        <span>
          {data?.region ||
            "ap-south-1"}
        </span>

        <span className="connection-live">
          LIVE
        </span>

      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="dashboard-error">

          <b>
            Unable to refresh dashboard
          </b>

          <div>
            {error}
          </div>

        </div>
      )}

      {/* ==================================================
          TOP STAT CARDS
      ================================================== */}

      <div className="dashboard-stat-grid">

        {/* ================================================
            TOTAL EC2
        ================================================= */}

        <button
          type="button"
          className="dashboard-card clickable-card total-card"
          onClick={openEC2}
          title="Open EC2 Instances"
        >

          <div className="card-shimmer" />

          <div className="dashboard-card-top">

            <div className="dashboard-card-title">
              TOTAL INSTANCES
            </div>

            <div className="dashboard-card-icon purple-icon">
              <span className="server-icon">
                ▤
              </span>
            </div>

          </div>

          <div className="dashboard-card-value">
            <AnimatedNumber value={total} />
          </div>

          <div className="dashboard-card-footer">

            <span className="green-text">
              ● {running} running
            </span>

            <span className="orange-text">
              ● {stopped} stopped
            </span>

          </div>

          <div className="card-action">
            View EC2 →
          </div>

        </button>

        {/* ================================================
            RUNNING
        ================================================= */}

        <button
          type="button"
          className="dashboard-card clickable-card running-card"
          onClick={openEC2}
          title="Open running EC2 instances"
        >

          <div className="card-shimmer" />

          <div className="dashboard-card-top">

            <div className="dashboard-card-title">
              RUNNING
            </div>

            <div className="dashboard-card-icon green-icon">
              <span className="heartbeat-icon">
                〽
              </span>
            </div>

          </div>

          <div className="dashboard-card-value green-value">
            <AnimatedNumber value={running} />
          </div>

          <div className="dashboard-card-footer muted-text">
            Active instances
          </div>

          <div className="running-live-line">
            <span />
            LIVE
          </div>

        </button>

        {/* ================================================
            STOPPED
        ================================================= */}

        <button
          type="button"
          className="dashboard-card clickable-card stopped-card"
          onClick={openEC2}
          title="Open stopped EC2 instances"
        >

          <div className="card-shimmer" />

          <div className="dashboard-card-top">

            <div className="dashboard-card-title">
              STOPPED
            </div>

            <div className="dashboard-card-icon orange-icon">
              <span className="server-icon">
                ▱
              </span>
            </div>

          </div>

          <div className="dashboard-card-value orange-value">
            <AnimatedNumber value={stopped} />
          </div>

          <div className="dashboard-card-footer muted-text">
            Inactive instances
          </div>

          {stopped > 0 && (
            <div className="warning-live-line">
              <span />
              ATTENTION
            </div>
          )}

        </button>

        {/* ================================================
            CLOUDWATCH
        ================================================= */}

        <button
          type="button"
          className="dashboard-card clickable-card cloudwatch-card"
          onClick={() =>
            navigate("/cloudwatch")
          }
          title="Open CloudWatch"
        >

          <div className="card-shimmer" />

          <div className="dashboard-card-top">

            <div className="dashboard-card-title">
              CLOUDWATCH
            </div>

            <div className="dashboard-card-icon purple-icon">
              <span className="cloud-icon">
                ◌
              </span>
            </div>

          </div>

          <div
            className={
              cloudWatchAvailable
                ? "dashboard-card-status connected-status"
                : "dashboard-card-status warning-status"
            }
          >
            {cloudWatchAvailable
              ? "Connected"
              : "Unavailable"}
          </div>

          <div className="dashboard-card-footer muted-text">
            AWS CloudWatch metrics
          </div>

          <div className="cloudwatch-wave">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

        </button>

      </div>

      {/* ==================================================
          MAIN GRID
      ================================================== */}

      <div className="dashboard-main-grid">

        {/* ==================================================
            CPU PANEL
        ================================================== */}

        <div className="dashboard-panel performance-panel">

          <div className="panel-header">

            <div>

              <div className="panel-label">
                PERFORMANCE
              </div>

              <h2>
                CPU Utilization
              </h2>

              <p>
                Running EC2 fleet average
              </p>

            </div>

            <div className="cpu-summary">

              <div className="cpu-value">
                {formatPercent(cpu)}
              </div>

              <span className="normal-badge">
                <span />
                {cpu !== null &&
                cpu !== undefined
                  ? "Normal"
                  : "No data"}
              </span>

            </div>

          </div>

          {/* ==============================================
              ANIMATED CPU GRAPH
          ============================================== */}

          <div className="cpu-chart">

            <div className="chart-grid-line line-1" />
            <div className="chart-grid-line line-2" />
            <div className="chart-grid-line line-3" />
            <div className="chart-grid-line line-4" />

            <div className="cpu-bars">

              {[
                20,
                34,
                27,
                48,
                35,
                55,
                42,
                62,
                48,
                39,
                52,
                44,
                58,
                47,
                65,
                51,
              ].map(
                (height, index) => {

                  const realHeight =
                    cpu !== null &&
                    cpu !== undefined
                      ? Math.max(
                          8,
                          Math.min(
                            100,
                            Number(cpu) *
                              (2.4 +
                                (index % 3) *
                                  0.12)
                          )
                        )
                      : height;

                  return (
                    <div
                      key={index}
                      className="cpu-bar"
                      style={{
                        height:
                          `${realHeight}%`,
                        animationDelay:
                          `${index * 0.08}s`,
                      }}
                    />
                  );
                }
              )}

            </div>

            <div className="chart-scan-line" />

          </div>

          <div className="chart-footer">

            <span>
              ● CloudWatch
            </span>

            <span>
              Last 1 hour
            </span>

            <span>
              5 min intervals
            </span>

          </div>

        </div>

        {/* ==================================================
            EC2 HEALTH
        ================================================== */}

        <div
          className="dashboard-panel health-panel clickable-panel"
          onClick={openEC2}
        >

          <div className="panel-header">

            <div>

              <div className="panel-label">
                COMPUTE
              </div>

              <h2>
                EC2 Health
              </h2>

              <p>
                Current instance status
              </p>

            </div>

            <div className="health-check-icon">
              ✓
            </div>

          </div>

          <div className="health-list">

            {/* RUNNING */}

            <div className="health-box running">

              <div className="health-left">

                <span className="health-status-dot running-dot" />

                <span>
                  Running
                </span>

              </div>

              <b>
                <AnimatedNumber
                  value={running}
                />
              </b>

            </div>

            {/* STOPPED */}

            <div className="health-box stopped">

              <div className="health-left">

                <span className="health-status-dot stopped-dot" />

                <span>
                  Stopped
                </span>

              </div>

              <b>
                <AnimatedNumber
                  value={stopped}
                />
              </b>

            </div>

            {/* TOTAL */}

            <div className="health-box total">

              <div className="health-left">

                <span className="health-status-dot total-dot" />

                <span>
                  Total
                </span>

              </div>

              <b>
                <AnimatedNumber
                  value={total}
                />
              </b>

            </div>

          </div>

          <div className="panel-click-hint">
            Click to inspect EC2 →
          </div>

        </div>

      </div>

      {/* ==================================================
          NETWORK PANEL
      ================================================== */}

      <div className="dashboard-panel network-panel">

        <div className="network-content">

          <div>

            <div className="panel-label">
              NETWORK
            </div>

            <h2>
              Network Activity
            </h2>

            <p>
              Aggregate EC2 network traffic
            </p>

          </div>

          <div className="network-stats">

            <div className="network-stat">

              <span className="network-stat-label">
                TOTAL
              </span>

              <strong>
                {formatBytes(
                  totalNetwork
                )}
              </strong>

            </div>

            <div className="network-stat">

              <span className="network-stat-label">
                ↓ INBOUND
              </span>

              <strong>
                {formatBytes(
                  networkIn
                )}
              </strong>

            </div>

            <div className="network-stat">

              <span className="network-stat-label">
                ↑ OUTBOUND
              </span>

              <strong>
                {formatBytes(
                  networkOut
                )}
              </strong>

            </div>

          </div>

          <div className="network-animation">

            <div className="network-line">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

          </div>

        </div>

      </div>

      {/* ==================================================
          EC2 TABLE
      ================================================== */}

      <div
        className="dashboard-panel ec2-table-panel clickable-panel"
        onClick={openEC2}
      >

        <div className="table-panel-header">

          <div>

            <div className="panel-label">
              LIVE INFRASTRUCTURE
            </div>

            <h2>
              EC2 Instances
            </h2>

            <p>
              Real instances from AWS
            </p>

          </div>

          <div className="table-live-badge">

            <span />

            {total} instances

          </div>

        </div>

        <div
          className="table-scroll"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <table>

            <thead>

              <tr>

                {[
                  "INSTANCE",
                  "TYPE",
                  "STATUS",
                  "PRIVATE IP",
                  "ZONE",
                  "LAUNCH TIME",
                ].map(
                  (heading) => (
                    <th key={heading}>
                      {heading}
                    </th>
                  )
                )}

              </tr>

            </thead>

            <tbody>

              {instances.map(
                (instance, index) => (

                  <tr
                    key={
                      instance.id ||
                      index
                    }
                    className="animated-table-row"
                    style={{
                      animationDelay:
                        `${index * 0.06}s`,
                    }}
                  >

                    <td>

                      <div className="instance-name">

                        <span className="instance-server-icon">
                          ▤
                        </span>

                        <div>

                          <strong>
                            {instance.name}
                          </strong>

                          <small>
                            {instance.id}
                          </small>

                        </div>

                      </div>

                    </td>

                    <td>
                      {instance.type}
                    </td>

                    <td>

                      <div className="status-cell">

                        <StatusDot
                          state={
                            instance.state
                          }
                        />

                        <span
                          style={{
                            color:
                              getStatusColor(
                                instance.state
                              ),
                          }}
                        >
                          {instance.state}
                        </span>

                      </div>

                    </td>

                    <td>
                      {instance.privateIp ||
                        "—"}
                    </td>

                    <td>
                      {
                        instance.availabilityZone ||
                        "—"
                      }
                    </td>

                    <td>
                      {instance.launchTime
                        ? new Date(
                            instance.launchTime
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

          {instances.length === 0 &&
            !loading && (
              <div className="empty-state">
                No EC2 instances found.
              </div>
            )}

        </div>

        <div className="table-bottom-action">
          Open complete EC2 fleet →
        </div>

      </div>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div className="dashboard-footer">

        <span>
          AWS Monitor
        </span>

        <span>
          Last updated:{" "}
          {data?.updatedAt
            ? new Date(
                data.updatedAt
              ).toLocaleTimeString()
            : "—"}
        </span>

      </div>

      {/* ==================================================
          PAGE ANIMATIONS + STYLES
      ================================================== */}

      <style>{`

        /* ==================================================
           BASE
        ================================================== */

        .aws-dashboard-page {
          width: 100%;
          max-width: none !important;
          min-width: 0;
          min-height: 100%;
          margin: 0 !important;
          padding: 30px 28px 50px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at 80% 0%,
              rgba(124,58,237,.12),
              transparent 30%
            ),
            #070b14;
          color: #f8fafc;
          overflow: hidden;
        }

        /* ==================================================
           HEADER
        ================================================== */

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
          gap: 20px;
        }

        .dashboard-kicker {
          color: #9b6cff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .dashboard-header h1 {
          font-size: 42px;
          margin: 0;
          font-weight: 750;
          letter-spacing: -1.5px;
        }

        .dashboard-header p {
          color: #718096;
          margin-top: 8px;
          font-size: 15px;
        }

        .dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .auto-refresh-badge {
          padding: 11px 16px;
          border-radius: 12px;
          border: 1px solid #26334a;
          background: #0d1522;
          color: #8fa0b9;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .auto-refresh-badge b {
          color: #b99cff;
        }

        .refresh-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00d084;
          box-shadow:
            0 0 0 0 rgba(0,208,132,.45);
          animation: refreshPulse 2s infinite;
        }

        .dashboard-refresh-button {
          padding: 11px 18px;
          border-radius: 12px;
          border: 1px solid #7c3aed;
          background:
            linear-gradient(
              135deg,
              #6d28d9,
              #9333ea
            );
          color: white;
          cursor: pointer;
          font-weight: 600;
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .dashboard-refresh-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 25px rgba(124,58,237,.25);
        }

        .dashboard-refresh-button:disabled {
          opacity: .7;
          cursor: wait;
        }

        .refresh-icon {
          display: inline-block;
          margin-right: 5px;
        }

        .refresh-icon.spinning {
          animation: spin 1s linear infinite;
        }

        /* ==================================================
           CONNECTION
        ================================================== */

        .dashboard-connection {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          color: #94a3b8;
          font-size: 14px;
        }

        .connection-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .connection-dot.connected {
          background: #00d084;
          box-shadow:
            0 0 12px #00d084;
          animation: livePulse 1.8s infinite;
        }

        .connection-dot.warning {
          background: #ff9f43;
          box-shadow:
            0 0 12px #ff9f43;
          animation: warningPulse 1.8s infinite;
        }

        .connection-live {
          color: #00d084;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-left: 5px;
          animation: liveText 2s infinite;
        }

        /* ==================================================
           ERROR
        ================================================== */

        .dashboard-error {
          padding: 18px;
          border-radius: 14px;
          margin-bottom: 22px;
          background: rgba(127,29,29,.25);
          border:
            1px solid rgba(248,113,113,.35);
          color: #fca5a5;
        }

        .dashboard-error div {
          margin-top: 5px;
        }

        /* ==================================================
           STAT CARDS
        ================================================== */

        .dashboard-stat-grid {
          width: 100%;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
          box-sizing: border-box;
        }

        .dashboard-card {
          position: relative;
          overflow: hidden;
          text-align: left;
          padding: 22px;
          min-height: 155px;
          border-radius: 16px;
          border: 1px solid #202d42;
          background:
            linear-gradient(
              145deg,
              rgba(15,25,41,.98),
              rgba(9,15,26,.98)
            );
          box-shadow:
            0 15px 35px rgba(0,0,0,.18);
          color: #f8fafc;
          font-family: inherit;
          transition:
            transform .3s cubic-bezier(.2,.8,.2,1),
            border-color .3s ease,
            box-shadow .3s ease;
          animation:
            cardEntrance .65s ease both,
            cardFloat 5s ease-in-out infinite;
        }

        .clickable-card,
        .clickable-panel {
          cursor: pointer;
        }

        .dashboard-card:hover {
          transform:
            translateY(-7px)
            scale(1.012);
          border-color: #6d4bc5;
          box-shadow:
            0 20px 45px rgba(0,0,0,.3),
            0 0 25px rgba(124,58,237,.08);
        }

        .dashboard-card:active {
          transform:
            translateY(-2px)
            scale(.995);
        }

        .dashboard-card:nth-child(1) {
          animation-delay: .05s;
        }

        .dashboard-card:nth-child(2) {
          animation-delay: .12s;
        }

        .dashboard-card:nth-child(3) {
          animation-delay: .19s;
        }

        .dashboard-card:nth-child(4) {
          animation-delay: .26s;
        }

        .card-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 55%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(167,139,250,.8),
              transparent
            );
          animation:
            cardShimmer 4.5s ease-in-out infinite;
        }

        .dashboard-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-card-title {
          color: #718096;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
        }

        .dashboard-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 20px;
        }

        .purple-icon {
          color: #b99cff;
          background:
            rgba(124,58,237,.12);
          animation:
            iconFloat 3s ease-in-out infinite;
        }

        .green-icon {
          color: #00d084;
          background:
            rgba(0,208,132,.09);
          animation:
            iconHeartbeat 2s ease-in-out infinite;
        }

        .orange-icon {
          color: #ff9f43;
          background:
            rgba(255,159,67,.10);
          animation:
            iconWarning 2.5s ease-in-out infinite;
        }

        .dashboard-card-value {
          font-size: 34px;
          font-weight: 750;
          margin: 14px 0 10px;
          color: #f8fafc;
          letter-spacing: -.5px;
        }

        .green-value {
          color: #00d084;
          text-shadow:
            0 0 18px rgba(0,208,132,.16);
        }

        .orange-value {
          color: #ff9f43;
          text-shadow:
            0 0 18px rgba(255,159,67,.13);
        }

        .dashboard-card-footer {
          display: flex;
          gap: 16px;
          font-size: 13px;
        }

        .green-text {
          color: #00d084;
        }

        .orange-text {
          color: #ff9f43;
        }

        .muted-text {
          color: #8190a8;
        }

        .card-action {
          position: absolute;
          right: 20px;
          bottom: 17px;
          color: #9b6cff;
          font-size: 11px;
          font-weight: 700;
          opacity: 0;
          transform: translateX(8px);
          transition:
            opacity .25s ease,
            transform .25s ease;
        }

        .dashboard-card:hover .card-action {
          opacity: 1;
          transform: translateX(0);
        }

        .running-live-line,
        .warning-live-line {
          position: absolute;
          right: 20px;
          bottom: 18px;
          font-size: 9px;
          letter-spacing: 1.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .running-live-line {
          color: #00d084;
        }

        .warning-live-line {
          color: #ff9f43;
        }

        .running-live-line span,
        .warning-live-line span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .running-live-line span {
          background: #00d084;
          box-shadow: 0 0 8px #00d084;
          animation: livePulse 1.5s infinite;
        }

        .warning-live-line span {
          background: #ff9f43;
          box-shadow: 0 0 8px #ff9f43;
          animation: warningPulse 1.2s infinite;
        }

        .dashboard-card-status {
          font-size: 25px;
          font-weight: 700;
          margin: 12px 0;
        }

        .connected-status {
          color: #00d084;
        }

        .warning-status {
          color: #ff9f43;
        }

        .cloudwatch-wave {
          position: absolute;
          right: 22px;
          bottom: 18px;
          height: 14px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .cloudwatch-wave span {
          width: 3px;
          border-radius: 5px;
          background: #8b5cf6;
          animation:
            wave 1.2s ease-in-out infinite;
        }

        .cloudwatch-wave span:nth-child(1) {
          height: 5px;
        }

        .cloudwatch-wave span:nth-child(2) {
          height: 11px;
          animation-delay: .1s;
        }

        .cloudwatch-wave span:nth-child(3) {
          height: 7px;
          animation-delay: .2s;
        }

        .cloudwatch-wave span:nth-child(4) {
          height: 14px;
          animation-delay: .3s;
        }

        .cloudwatch-wave span:nth-child(5) {
          height: 8px;
          animation-delay: .4s;
        }

        /* ==================================================
           MAIN GRID
        ================================================== */

        .dashboard-main-grid {
          width: 100%;
          display: grid;
          grid-template-columns:
            minmax(0, 1.65fr)
            minmax(320px, .9fr);
          gap: 20px;
          box-sizing: border-box;
        }

        .dashboard-panel {
          width: 100%;
          box-sizing: border-box;
          border-radius: 18px;
          border: 1px solid #202d42;
          background:
            linear-gradient(
              145deg,
              rgba(13,22,37,.98),
              rgba(7,13,23,.98)
            );
          padding: 25px;
          box-shadow:
            0 18px 45px rgba(0,0,0,.2);
          animation:
            panelEntrance .7s ease both;
        }

        .clickable-panel {
          transition:
            transform .3s ease,
            border-color .3s ease,
            box-shadow .3s ease;
        }

        .clickable-panel:hover {
          transform: translateY(-4px);
          border-color: #4a3a79;
          box-shadow:
            0 20px 50px rgba(0,0,0,.25);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }

        .panel-label {
          color: #9b6cff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .dashboard-panel h2 {
          margin: 6px 0;
          font-size: 21px;
        }

        .dashboard-panel p {
          margin: 0;
          color: #687991;
          font-size: 13px;
        }

        /* ==================================================
           CPU
        ================================================== */

        .cpu-summary {
          text-align: right;
        }

        .cpu-value {
          font-size: 30px;
          font-weight: 750;
        }

        .normal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 5px;
          padding: 5px 10px;
          border-radius: 20px;
          background:
            rgba(0,208,132,.10);
          color: #00d084;
          font-size: 12px;
        }

        .normal-badge span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00d084;
          animation: livePulse 1.5s infinite;
        }

        .cpu-chart {
          position: relative;
          height: 230px;
          display: flex;
          align-items: flex-end;
          padding: 20px 10px;
          border-bottom:
            1px solid #26334a;
          background:
            linear-gradient(
              to top,
              rgba(124,58,237,.05),
              transparent
            );
          overflow: hidden;
        }

        .chart-grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top:
            1px dashed rgba(100,116,139,.12);
        }

        .line-1 {
          top: 20%;
        }

        .line-2 {
          top: 40%;
        }

        .line-3 {
          top: 60%;
        }

        .line-4 {
          top: 80%;
        }

        .cpu-bars {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          z-index: 2;
        }

        .cpu-bar {
          flex: 1;
          max-width: 65px;
          margin: 0 auto;
          border-radius:
            8px 8px 3px 3px;
          background:
            linear-gradient(
              to top,
              #6d28d9,
              #a78bfa
            );
          box-shadow:
            0 0 20px
            rgba(124,58,237,.18);
          transform-origin: bottom;
          animation:
            barMotion 2.4s ease-in-out infinite;
          transition:
            height .5s ease;
        }

        .chart-scan-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background:
            linear-gradient(
              to bottom,
              transparent,
              rgba(167,139,250,.5),
              transparent
            );
          animation:
            scanLine 5s linear infinite;
          z-index: 3;
        }

        .chart-footer {
          display: flex;
          justify-content: space-between;
          color: #65748c;
          font-size: 12px;
          margin-top: 14px;
        }

        /* ==================================================
           HEALTH
        ================================================== */

        .health-check-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #00d084;
          border:
            1px solid rgba(0,208,132,.35);
          background:
            rgba(0,208,132,.08);
          font-size: 20px;
          animation:
            healthPulse 2.5s ease-in-out infinite;
        }

        .health-list {
          display: grid;
          gap: 12px;
        }

        .health-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px;
          border-radius: 14px;
          border: 1px solid;
          font-size: 15px;
          transition:
            transform .25s ease;
        }

        .health-box:hover {
          transform:
            translateX(5px);
        }

        .health-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .health-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .running-dot {
          background: #00d084;
          box-shadow: 0 0 9px #00d084;
          animation: livePulse 1.5s infinite;
        }

        .stopped-dot {
          background: #ff9f43;
          box-shadow: 0 0 9px #ff9f43;
          animation: warningPulse 1.5s infinite;
        }

        .total-dot {
          background: #8b5cf6;
          box-shadow: 0 0 9px #8b5cf6;
          animation: purplePulse 2s infinite;
        }

        .health-box b {
          font-size: 20px;
        }

        .health-box.running {
          background:
            rgba(0,208,132,.06);
          border-color:
            rgba(0,208,132,.2);
          color: #d8fff0;
        }

        .health-box.running b {
          color: #00d084;
        }

        .health-box.stopped {
          background:
            rgba(255,159,67,.06);
          border-color:
            rgba(255,159,67,.2);
          color: #ffe8d0;
        }

        .health-box.stopped b {
          color: #ff9f43;
        }

        .health-box.total {
          background:
            rgba(124,58,237,.07);
          border-color:
            rgba(124,58,237,.2);
          color: #eee8ff;
        }

        .health-box.total b {
          color: #b99cff;
        }

        .panel-click-hint {
          margin-top: 18px;
          color: #8b5cf6;
          font-size: 11px;
          font-weight: 700;
          text-align: right;
        }

        /* ==================================================
           NETWORK
        ================================================== */

        .network-panel {
          margin-top: 20px;
        }

        .network-content {
          display: grid;
          grid-template-columns:
            1fr 1.5fr .8fr;
          align-items: center;
          gap: 30px;
        }

        .network-stats {
          display: flex;
          justify-content: center;
          gap: 45px;
        }

        .network-stat {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .network-stat-label {
          color: #64748b;
          font-size: 10px;
          letter-spacing: 1.4px;
          font-weight: 700;
        }

        .network-stat strong {
          font-size: 20px;
          color: #b99cff;
        }

        .network-animation {
          height: 45px;
          overflow: hidden;
          position: relative;
        }

        .network-line {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .network-line span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow:
            0 0 12px #8b5cf6;
          animation:
            networkTravel 2.2s ease-in-out infinite;
        }

        .network-line span:nth-child(2) {
          animation-delay: .25s;
        }

        .network-line span:nth-child(3) {
          animation-delay: .5s;
        }

        .network-line span:nth-child(4) {
          animation-delay: .75s;
        }

        .network-line span:nth-child(5) {
          animation-delay: 1s;
        }

        .network-line span:nth-child(6) {
          animation-delay: 1.25s;
        }

        /* ==================================================
           EC2 TABLE
        ================================================== */

        .ec2-table-panel {
          margin-top: 20px;
          padding-bottom: 0;
        }

        .table-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .table-live-badge {
          padding: 8px 13px;
          border-radius: 20px;
          background:
            rgba(124,58,237,.12);
          color: #b99cff;
          font-size: 12px;
          font-weight: 700;
        }

        .table-scroll {
          overflow-x: auto;
        }

        .table-scroll table {
          width: 100%;
          border-collapse: collapse;
          min-width: 750px;
        }

        .table-scroll th {
          text-align: left;
          padding: 13px 12px;
          color: #64748b;
          font-size: 11px;
          letter-spacing: 1px;
          border-bottom:
            1px solid #202b3d;
        }

        .table-scroll td {
          padding: 16px 12px;
          color: #aab7ca;
          border-bottom:
            1px solid #151e2c;
          font-size: 13px;
        }

        .animated-table-row {
          animation:
            rowEntrance .5s ease both;
          transition:
            background .2s ease,
            transform .2s ease;
        }

        .animated-table-row:hover {
          background:
            rgba(124,58,237,.045);
        }

        .instance-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .instance-name strong {
          display: block;
          color: #f1f5f9;
        }

        .instance-name small {
          display: block;
          color: #64748b;
          font-size: 10px;
          margin-top: 4px;
        }

        .instance-server-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #b99cff;
          background:
            rgba(124,58,237,.10);
          animation:
            iconFloat 3s ease-in-out infinite;
        }

        .status-cell {
          display: flex;
          align-items: center;
        }

        .status-dot-live {
          animation:
            livePulse 1.8s infinite;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #64748b;
        }

        .table-bottom-action {
          padding: 15px 5px;
          color: #9b6cff;
          text-align: right;
          font-size: 11px;
          font-weight: 700;
          border-top:
            1px solid #151e2c;
        }

        /* ==================================================
           FOOTER
        ================================================== */

        .dashboard-footer {
          margin-top: 18px;
          color: #526176;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
        }

        /* ==================================================
           ANIMATIONS
        ================================================== */

        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform:
              translateY(18px)
              scale(.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes panelEntrance {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rowEntrance {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes cardFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes cardShimmer {
          0% {
            left: -100%;
          }

          45%,
          100% {
            left: 150%;
          }
        }

        @keyframes iconFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes iconHeartbeat {
          0%,
          100% {
            transform: scale(1);
          }

          15% {
            transform: scale(1.08);
          }

          30% {
            transform: scale(1);
          }

          45% {
            transform: scale(1.06);
          }

          60% {
            transform: scale(1);
          }
        }

        @keyframes iconWarning {
          0%,
          100% {
            transform: rotate(0);
          }

          25% {
            transform: rotate(-3deg);
          }

          50% {
            transform: rotate(3deg);
          }

          75% {
            transform: rotate(-2deg);
          }
        }

        @keyframes livePulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: .55;
            transform: scale(1.3);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes warningPulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: .5;
            transform: scale(1.25);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes purplePulse {
          0%,
          100% {
            opacity: .8;
          }

          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes healthPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 rgba(0,208,132,0);
          }

          50% {
            box-shadow:
              0 0 22px
              rgba(0,208,132,.15);
          }
        }

        @keyframes barMotion {
          0%,
          100% {
            transform: scaleY(1);
          }

          50% {
            transform: scaleY(.9);
          }
        }

        @keyframes scanLine {
          0% {
            left: -5%;
            opacity: 0;
          }

          10% {
            opacity: .5;
          }

          90% {
            opacity: .5;
          }

          100% {
            left: 105%;
            opacity: 0;
          }
        }

        @keyframes wave {
          0%,
          100% {
            transform: scaleY(.7);
            opacity: .55;
          }

          50% {
            transform: scaleY(1.25);
            opacity: 1;
          }
        }

        @keyframes networkTravel {
          0% {
            transform:
              translateX(-5px)
              scale(.7);
            opacity: .35;
          }

          50% {
            transform:
              translateX(5px)
              scale(1.2);
            opacity: 1;
          }

          100% {
            transform:
              translateX(-5px)
              scale(.7);
            opacity: .35;
          }
        }

        @keyframes refreshPulse {
          0% {
            box-shadow:
              0 0 0 0
              rgba(0,208,132,.45);
          }

          70% {
            box-shadow:
              0 0 0 7px
              rgba(0,208,132,0);
          }

          100% {
            box-shadow:
              0 0 0 0
              rgba(0,208,132,0);
          }
        }

        @keyframes liveText {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: .45;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* ==================================================
           RESPONSIVE
        ================================================== */

        @media (max-width: 1100px) {

          .dashboard-stat-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }

          .network-content {
            grid-template-columns: 1fr;
          }

          .network-stats {
            justify-content: flex-start;
          }

        }

        @media (max-width: 700px) {

          .aws-dashboard-page {
            width: 100%;
            padding: 25px 18px 40px;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .dashboard-header h1 {
            font-size: 32px;
          }

          .dashboard-header-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-card {
            min-height: 145px;
          }

          .network-stats {
            flex-wrap: wrap;
            gap: 25px;
          }

          .dashboard-footer {
            flex-direction: column;
            gap: 8px;
          }

        }

        @media (prefers-reduced-motion: reduce) {

          .dashboard-card,
          .dashboard-panel,
          .cpu-bar,
          .card-shimmer,
          .cloudwatch-wave span,
          .network-line span,
          .refresh-pulse,
          .connection-dot,
          .connection-live,
          .health-check-icon,
          .status-dot-live,
          .running-live-line span,
          .warning-live-line span,
          .normal-badge span,
          .health-status-dot,
          .instance-server-icon {
            animation: none !important;
          }

        }

      `}</style>

    </div>
  );
}