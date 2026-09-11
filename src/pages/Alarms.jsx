import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  XCircle,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Server,
  Cpu,
  Wifi,
  ShieldCheck,
  Clock3,
  ChevronRight,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function formatTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getSeverity(cpu, statusFailed, state) {
  if (statusFailed > 0) {
    return "critical";
  }

  if (state === "stopped") {
    return "warning";
  }

  if (cpu >= 90) {
    return "critical";
  }

  if (cpu >= 70) {
    return "warning";
  }

  return "healthy";
}

function getStateFromSeverity(severity) {
  return severity === "healthy" ? "OK" : "ALARM";
}

function getSeverityLabel(severity) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "warning") return "WARNING";
  return "HEALTHY";
}

function getAlertTitle(cpu, statusFailed, state) {
  if (statusFailed > 0) {
    return "EC2 Status Check Failed";
  }

  if (state === "stopped") {
    return "EC2 Instance Stopped";
  }

  if (cpu >= 90) {
    return "High CPU Utilization";
  }

  if (cpu >= 70) {
    return "CPU Utilization Warning";
  }

  return "EC2 Instance Healthy";
}

function getAlertDescription(cpu, statusFailed, state) {
  if (statusFailed > 0) {
    return "One or more EC2 status checks are failing.";
  }

  if (state === "stopped") {
    return "The EC2 instance is currently stopped.";
  }

  if (cpu >= 90) {
    return `CPU utilization is ${cpu.toFixed(1)}%, above the critical threshold.`;
  }

  if (cpu >= 70) {
    return `CPU utilization is ${cpu.toFixed(1)}%, above the warning threshold.`;
  }

  return `CPU utilization is ${cpu.toFixed(1)}%. No active issue detected.`;
}

function Alarms() {
  const [instances, setInstances] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAlarms = async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const instancesResponse = await fetch(
        `${API_URL}/api/ec2/instances`
      );

      if (!instancesResponse.ok) {
        throw new Error("Unable to load EC2 instances");
      }

      const instancesData = await instancesResponse.json();

      if (!instancesData.success) {
        throw new Error(
          instancesData.error || "Unable to load EC2 instances"
        );
      }

      const realInstances = instancesData.instances || [];

      setInstances(realInstances);

      const alarmResults = await Promise.all(
        realInstances.map(async (instance) => {
          try {
            const response = await fetch(
              `${API_URL}/api/ec2/${instance.id}/metrics`
            );

            if (!response.ok) {
              throw new Error("Metrics unavailable");
            }

            const data = await response.json();

            const metrics = data.metrics || {};

            const cpuValues = metrics.cpu?.Values || [];
            const statusValues = metrics.statusCheckFailed?.Values || [];

            const latestCpu =
              cpuValues.length > 0
                ? Number(cpuValues[cpuValues.length - 1])
                : 0;

            const latestStatus =
              statusValues.length > 0
                ? Number(statusValues[statusValues.length - 1])
                : 0;

            const severity = getSeverity(
              latestCpu,
              latestStatus,
              instance.state
            );

            return {
              id: `${instance.id}-health`,
              instanceId: instance.id,
              title: getAlertTitle(
                latestCpu,
                latestStatus,
                instance.state
              ),
              description: getAlertDescription(
                latestCpu,
                latestStatus,
                instance.state
              ),
              resource: instance.name || instance.id,
              metric:
                latestStatus > 0
                  ? "StatusCheckFailed"
                  : "CPUUtilization",
              value:
                latestStatus > 0
                  ? `${latestStatus}`
                  : `${latestCpu.toFixed(1)}%`,
              threshold:
                latestStatus > 0
                  ? "0"
                  : latestCpu >= 90
                  ? "90%"
                  : "70%",
              severity,
              state: getStateFromSeverity(severity),
              instanceState: instance.state,
              privateIp: instance.privateIp || "N/A",
              type: instance.type || "N/A",
              availabilityZone:
                instance.availabilityZone || "N/A",
              checkedAt: new Date(),
            };
          } catch (metricError) {
            return {
              id: `${instance.id}-health`,
              instanceId: instance.id,
              title: "Metrics Unavailable",
              description:
                "CloudWatch metrics could not be retrieved for this instance.",
              resource: instance.name || instance.id,
              metric: "CloudWatch",
              value: "N/A",
              threshold: "N/A",
              severity: "warning",
              state: "ALARM",
              instanceState: instance.state,
              privateIp: instance.privateIp || "N/A",
              type: instance.type || "N/A",
              availabilityZone:
                instance.availabilityZone || "N/A",
              checkedAt: new Date(),
            };
          }
        })
      );

      setAlarms(alarmResults);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Alarm loading error:", err);
      setError(err.message || "Unable to load alarm data");
      setAlarms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlarms();

    const interval = setInterval(() => {
      loadAlarms();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredAlarms = useMemo(() => {
    return alarms.filter((alarm) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        alarm.title.toLowerCase().includes(searchText) ||
        alarm.resource.toLowerCase().includes(searchText) ||
        alarm.metric.toLowerCase().includes(searchText) ||
        alarm.instanceId.toLowerCase().includes(searchText);

      const matchesSeverity =
        severityFilter === "all" ||
        alarm.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [alarms, search, severityFilter]);

  const criticalCount = alarms.filter(
    (alarm) => alarm.severity === "critical"
  ).length;

  const warningCount = alarms.filter(
    (alarm) => alarm.severity === "warning"
  ).length;

  const healthyCount = alarms.filter(
    (alarm) => alarm.severity === "healthy"
  ).length;

  return (
    <div className="page-content alarms-page">
      {/* HEADER */}
      <div className="page-heading">
        <div>
          <div className="alarm-title-row">
            <h2>CloudWatch Alarms</h2>

            <span className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </span>
          </div>

          <p>
            Real-time health monitoring for your EC2 infrastructure
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => loadAlarms(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="alarm-error">
          <AlertTriangle size={18} />
          <div>
            <strong>Unable to load alarm data</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card alarm-stat">
          <div className="stat-top">
            <div>
              <p className="stat-title">Total Monitored</p>
              <h2>{alarms.length}</h2>
            </div>

            <div className="stat-icon blue">
              <Bell size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Active EC2 monitoring checks
          </p>
        </div>

        <div className="stat-card alarm-stat">
          <div className="stat-top">
            <div>
              <p className="stat-title">Critical</p>
              <h2 className="critical-number">{criticalCount}</h2>
            </div>

            <div className="stat-icon red">
              <XCircle size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Immediate attention required
          </p>
        </div>

        <div className="stat-card alarm-stat">
          <div className="stat-top">
            <div>
              <p className="stat-title">Warning</p>
              <h2 className="warning-number">{warningCount}</h2>
            </div>

            <div className="stat-icon orange">
              <AlertTriangle size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            Needs investigation
          </p>
        </div>

        <div className="stat-card alarm-stat">
          <div className="stat-top">
            <div>
              <p className="stat-title">Healthy</p>
              <h2 className="healthy-number">{healthyCount}</h2>
            </div>

            <div className="stat-icon green">
              <CheckCircle2 size={21} />
            </div>
          </div>

          <p className="stat-subtitle">
            No current issues
          </p>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="panel alarm-main-panel">
        <div className="panel-header">
          <div>
            <h3>Alarm Activity</h3>
            <p>
              Real-time EC2 and CloudWatch health conditions
            </p>
          </div>

          <div className="monitoring-status">
            <span className="status-dot"></span>
            Monitoring {instances.length} instances
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="alarm-toolbar">
          <div className="search-box alarm-search">
            <Search size={15} />

            <input
              type="text"
              placeholder="Search instance, alarm or metric..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-wrapper">
            <Filter size={15} />

            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value)
              }
            >
              <option value="all">All States</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="healthy">Healthy</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="alarm-table">
          <div className="alarm-table-header">
            <span>ALARM</span>
            <span>RESOURCE</span>
            <span>METRIC</span>
            <span>VALUE</span>
            <span>STATE</span>
            <span>CHECKED</span>
          </div>

          {loading ? (
            <div className="alarm-empty">
              <RefreshCw size={25} className="spin" />
              <strong>Loading CloudWatch data...</strong>
              <span>Checking your EC2 instances</span>
            </div>
          ) : filteredAlarms.length === 0 ? (
            <div className="alarm-empty">
              <CheckCircle2 size={30} />
              <strong>No matching alarms</strong>
              <span>
                Try changing your search or filter.
              </span>
            </div>
          ) : (
            filteredAlarms.map((alarm) => (
              <div
                className="alarm-table-row"
                key={alarm.id}
              >
                {/* ALARM */}
                <div className="alarm-name">
                  <div
                    className={`alarm-status-icon ${alarm.severity}`}
                  >
                    {alarm.severity === "critical" && (
                      <XCircle size={16} />
                    )}

                    {alarm.severity === "warning" && (
                      <AlertTriangle size={16} />
                    )}

                    {alarm.severity === "healthy" && (
                      <CheckCircle2 size={16} />
                    )}
                  </div>

                  <div>
                    <strong>{alarm.title}</strong>

                    <small>{alarm.description}</small>
                  </div>
                </div>

                {/* RESOURCE */}
                <div className="resource-cell">
                  <div className="resource-icon">
                    <Server size={15} />
                  </div>

                  <div>
                    <strong className="table-primary">
                      {alarm.resource}
                    </strong>

                    <small>{alarm.instanceId}</small>
                  </div>
                </div>

                {/* METRIC */}
                <div>
                  <span className="metric-name">
                    {alarm.metric}
                  </span>
                </div>

                {/* VALUE */}
                <div>
                  <strong className="alarm-value">
                    {alarm.value}
                  </strong>

                  <small className="threshold-text">
                    Threshold: {alarm.threshold}
                  </small>
                </div>

                {/* STATE */}
                <div>
                  <span
                    className={`alarm-state ${alarm.state.toLowerCase()}`}
                  >
                    {getSeverityLabel(alarm.severity)}
                  </span>
                </div>

                {/* TIME */}
                <div>
                  <span className="alarm-time">
                    {formatTime(alarm.checkedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="bottom-grid">
        {/* MONITORING RULES */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Monitoring Rules</h3>
              <p>Current EC2 health thresholds</p>
            </div>

            <ShieldCheck size={19} />
          </div>

          <div className="service-list">
            <div className="service-row">
              <div className="service-info">
                <div className="service-icon">
                  <Cpu size={17} />
                </div>

                <div>
                  <strong>CPU Critical</strong>
                  <span>
                    Trigger when CPU utilization ≥ 90%
                  </span>
                </div>
              </div>

              <span className="rule-badge critical">
                CRITICAL
              </span>
            </div>

            <div className="service-row">
              <div className="service-info">
                <div className="service-icon">
                  <Activity size={17} />
                </div>

                <div>
                  <strong>CPU Warning</strong>
                  <span>
                    Trigger when CPU utilization ≥ 70%
                  </span>
                </div>
              </div>

              <span className="rule-badge warning">
                WARNING
              </span>
            </div>

            <div className="service-row">
              <div className="service-info">
                <div className="service-icon">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <strong>Status Check</strong>
                  <span>
                    Alert when EC2 status check fails
                  </span>
                </div>
              </div>

              <span className="rule-badge critical">
                CRITICAL
              </span>
            </div>

            <div className="service-row">
              <div className="service-info">
                <div className="service-icon">
                  <Server size={17} />
                </div>

                <div>
                  <strong>Stopped Instance</strong>
                  <span>
                    Detect stopped EC2 instances
                  </span>
                </div>
              </div>

              <span className="rule-badge warning">
                WARNING
              </span>
            </div>
          </div>
        </div>

        {/* MONITORING STATUS */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Monitoring Status</h3>
              <p>CloudWatch connection health</p>
            </div>

            <Activity size={19} />
          </div>

          <div className="monitoring-card">
            <div className="monitoring-icon">
              <Wifi size={22} />
            </div>

            <div>
              <strong>CloudWatch Connected</strong>

              <span>
                EC2 metrics are being collected from
                ap-south-1.
              </span>
            </div>

            <CheckCircle2
              size={20}
              className="monitoring-check"
            />
          </div>

          <div className="monitoring-details">
            <div>
              <Clock3 size={16} />
              <span>Auto refresh</span>
              <strong>30 sec</strong>
            </div>

            <div>
              <Server size={16} />
              <span>Instances</span>
              <strong>{instances.length}</strong>
            </div>

            <div>
              <Bell size={16} />
              <span>Active issues</span>
              <strong>{criticalCount + warningCount}</strong>
            </div>
          </div>

          {lastUpdated && (
            <div className="last-updated">
              Last checked: {formatTime(lastUpdated)}
            </div>
          )}
        </div>
      </div>

      {/* RAM NOTICE */}
      <div className="ram-notice">
        <div className="ram-notice-icon">
          <Activity size={20} />
        </div>

        <div>
          <strong>RAM monitoring</strong>

          <p>
            RAM utilization is not provided by the default
            EC2 CloudWatch metrics. Install the AWS
            CloudWatch Agent on your EC2 instances to
            publish <code>CWAgent / mem_used_percent</code>.
          </p>
        </div>

        <ChevronRight size={19} />
      </div>

      <style>{`
        .alarms-page {
          padding-bottom: 40px;
        }

        .alarm-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .6px;
          background: rgba(34, 197, 94, .1);
          border: 1px solid rgba(34, 197, 94, .2);
          color: #4ade80;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,.8);
        }

        .refresh-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 105px;
        }

        .refresh-button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .spin {
          animation: alarmSpin 1s linear infinite;
        }

        @keyframes alarmSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .alarm-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 18px;
          border: 1px solid rgba(239,68,68,.25);
          background: rgba(239,68,68,.08);
          border-radius: 12px;
          color: #fca5a5;
        }

        .alarm-error div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .alarm-error strong {
          color: #fecaca;
        }

        .alarm-error span {
          font-size: 12px;
        }

        .alarm-stat {
          min-height: 135px;
        }

        .critical-number {
          color: #f87171;
        }

        .warning-number {
          color: #fbbf24;
        }

        .healthy-number {
          color: #4ade80;
        }

        .stat-icon.red {
          color: #f87171;
          background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.18);
        }

        .alarm-main-panel {
          overflow: hidden;
        }

        .monitoring-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,.7);
        }

        .alarm-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,.05);
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .alarm-search {
          flex: 1;
          max-width: 500px;
        }

        .filter-wrapper {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 38px;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.025);
          border-radius: 8px;
          color: #94a3b8;
        }

        .filter-wrapper select {
          background: transparent;
          border: none;
          outline: none;
          color: #cbd5e1;
          font-size: 12px;
          cursor: pointer;
        }

        .filter-wrapper option {
          background: #111827;
          color: white;
        }

        .alarm-table {
          width: 100%;
        }

        .alarm-table-header,
        .alarm-table-row {
          display: grid;
          grid-template-columns:
            2.1fr
            1.45fr
            1.15fr
            1fr
            .85fr
            .85fr;
          gap: 14px;
          align-items: center;
        }

        .alarm-table-header {
          padding: 13px 20px;
          background: rgba(255,255,255,.018);
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .7px;
        }

        .alarm-table-row {
          padding: 17px 20px;
          border-top: 1px solid rgba(255,255,255,.045);
          transition: background .2s ease;
        }

        .alarm-table-row:hover {
          background: rgba(139,92,246,.035);
        }

        .alarm-name {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .alarm-name > div:last-child {
          min-width: 0;
        }

        .alarm-name strong {
          display: block;
          color: #e2e8f0;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .alarm-name small,
        .resource-cell small,
        .threshold-text {
          display: block;
          color: #64748b;
          font-size: 10px;
          line-height: 1.4;
        }

        .alarm-status-icon {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }

        .alarm-status-icon.critical {
          color: #f87171;
          background: rgba(239,68,68,.1);
        }

        .alarm-status-icon.warning {
          color: #fbbf24;
          background: rgba(245,158,11,.1);
        }

        .alarm-status-icon.healthy {
          color: #4ade80;
          background: rgba(34,197,94,.1);
        }

        .resource-cell {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .resource-icon {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: rgba(139,92,246,.09);
          color: #a78bfa;
        }

        .resource-cell > div:last-child {
          min-width: 0;
        }

        .table-primary {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #cbd5e1;
          font-size: 11px;
        }

        .metric-name {
          display: inline-block;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,.04);
          color: #a78bfa;
          font-family: monospace;
          font-size: 10px;
        }

        .alarm-value {
          display: block;
          color: #e2e8f0;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .alarm-state {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .5px;
        }

        .alarm-state.alarm {
          background: rgba(239,68,68,.1);
          color: #f87171;
          border: 1px solid rgba(239,68,68,.16);
        }

        .alarm-state.ok {
          background: rgba(34,197,94,.1);
          color: #4ade80;
          border: 1px solid rgba(34,197,94,.16);
        }

        .alarm-time {
          color: #94a3b8;
          font-size: 11px;
          white-space: nowrap;
        }

        .alarm-empty {
          min-height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #64748b;
        }

        .alarm-empty strong {
          color: #cbd5e1;
          font-size: 13px;
        }

        .alarm-empty span {
          font-size: 11px;
        }

        .bottom-grid {
          margin-top: 18px;
        }

        .rule-badge {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .5px;
          padding: 5px 7px;
          border-radius: 6px;
        }

        .rule-badge.critical {
          color: #f87171;
          background: rgba(239,68,68,.1);
        }

        .rule-badge.warning {
          color: #fbbf24;
          background: rgba(245,158,11,.1);
        }

        .monitoring-card {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0 16px;
          padding: 14px;
          border-radius: 10px;
          background: rgba(34,197,94,.055);
          border: 1px solid rgba(34,197,94,.12);
        }

        .monitoring-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(34,197,94,.1);
          color: #4ade80;
          flex-shrink: 0;
        }

        .monitoring-card > div:nth-child(2) {
          flex: 1;
        }

        .monitoring-card strong {
          display: block;
          color: #d1fae5;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .monitoring-card span {
          display: block;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
        }

        .monitoring-check {
          color: #4ade80;
        }

        .monitoring-details {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .monitoring-details div {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 11px;
        }

        .monitoring-details strong {
          color: #cbd5e1;
        }

        .last-updated {
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,.05);
          color: #475569;
          font-size: 10px;
        }

        .ram-notice {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 17px;
          border-radius: 11px;
          border: 1px solid rgba(139,92,246,.14);
          background: rgba(139,92,246,.045);
          color: #94a3b8;
        }

        .ram-notice-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(139,92,246,.1);
          color: #a78bfa;
        }

        .ram-notice > div:nth-child(2) {
          flex: 1;
        }

        .ram-notice strong {
          display: block;
          color: #c4b5fd;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .ram-notice p {
          margin: 0;
          font-size: 10px;
          line-height: 1.5;
        }

        .ram-notice code {
          color: #c4b5fd;
          font-family: monospace;
        }

        @media (max-width: 1000px) {
          .alarm-table {
            overflow-x: auto;
          }

          .alarm-table-header,
          .alarm-table-row {
            min-width: 950px;
          }

          .alarm-toolbar {
            flex-wrap: wrap;
          }

          .alarm-search {
            max-width: none;
          }
        }

        @media (max-width: 700px) {
          .alarm-title-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .monitoring-status {
            display: none;
          }

          .alarm-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .alarm-search {
            width: 100%;
          }

          .filter-wrapper {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}

export default Alarms;