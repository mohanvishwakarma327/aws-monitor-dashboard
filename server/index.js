import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  EC2Client,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";

import {
  CloudWatchClient,
  GetMetricDataCommand,
  DescribeAlarmsCommand,
} from "@aws-sdk/client-cloudwatch";

import {
  S3Client,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";

import {
  RDSClient,
  DescribeDBInstancesCommand,
} from "@aws-sdk/client-rds";

import {
  LambdaClient,
  ListFunctionsCommand,
} from "@aws-sdk/client-lambda";

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const region = process.env.AWS_REGION || "ap-south-1";

/* ======================================================
   AWS CLIENTS
====================================================== */

const ec2 = new EC2Client({ region });
const cloudwatch = new CloudWatchClient({ region });
const s3 = new S3Client({ region });
const rds = new RDSClient({ region });
const lambda = new LambdaClient({ region });
const logs = new CloudWatchLogsClient({ region });
const elb = new ElasticLoadBalancingV2Client({ region });

/* ======================================================
   HELPERS
====================================================== */

function errorMessage(error) {
  return error?.message || "AWS request failed";
}

function isPermissionError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();

  return (
    text.includes("accessdenied") ||
    text.includes("access denied") ||
    text.includes("not authorized") ||
    text.includes("unauthorized") ||
    text.includes("forbidden")
  );
}

function fallbackResponse(data, error = null) {
  return {
    success: true,
    available: false,
    source: "fallback",
    permissionRequired: isPermissionError(error),
    error: error ? errorMessage(error) : null,
    region,
    data,
  };
}

function awsResponse(data) {
  return {
    success: true,
    available: true,
    source: "aws",
    permissionRequired: false,
    error: null,
    region,
    data,
  };
}

/* ======================================================
   FALLBACK DATA
====================================================== */

const fallback = {
  s3: {
    buckets: [
      {
        name: "production-assets",
        region,
        storage: "184 GB",
        objects: "1.2M",
        requests: "82.4K",
        status: "Healthy",
      },
      {
        name: "application-backups",
        region,
        storage: "142 GB",
        objects: "820K",
        requests: "48.2K",
        status: "Healthy",
      },
      {
        name: "logs-archive",
        region,
        storage: "68 GB",
        objects: "540K",
        requests: "32.8K",
        status: "Healthy",
      },
      {
        name: "static-website",
        region,
        storage: "34 GB",
        objects: "240K",
        requests: "20.6K",
        status: "Healthy",
      },
    ],
  },

  rds: {
    instances: [
      {
        id: "production-db",
        engine: "MySQL",
        status: "Available",
        instanceClass: "db.t3.micro",
        region,
      },
      {
        id: "application-db",
        engine: "PostgreSQL",
        status: "Available",
        instanceClass: "db.t3.micro",
        region,
      },
    ],
  },

  lambda: {
    functions: [
      {
        name: "api-handler",
        runtime: "nodejs20.x",
        status: "Active",
        region,
      },
      {
        name: "image-processor",
        runtime: "python3.12",
        status: "Active",
        region,
      },
      {
        name: "notification-service",
        runtime: "nodejs20.x",
        status: "Active",
        region,
      },
    ],
  },

  logs: {
    groups: [
      {
        name: "/aws/ec2/application",
        storedBytes: 0,
        retentionDays: 30,
      },
      {
        name: "/aws/lambda/api-handler",
        storedBytes: 0,
        retentionDays: 30,
      },
      {
        name: "/aws/rds/production",
        storedBytes: 0,
        retentionDays: 30,
      },
    ],
  },

  elb: {
    loadBalancers: [
      {
        name: "production-alb",
        type: "application",
        state: "active",
        scheme: "internet-facing",
        region,
      },
      {
        name: "internal-alb",
        type: "application",
        state: "active",
        scheme: "internal",
        region,
      },
    ],
  },

  alarms: {
    alarms: [
      {
        name: "High-CPU-Production",
        state: "OK",
        severity: "Healthy",
      },
      {
        name: "EC2-StatusCheck",
        state: "OK",
        severity: "Healthy",
      },
      {
        name: "Application-Errors",
        state: "OK",
        severity: "Healthy",
      },
    ],
  },
};

/* ======================================================
   HEALTH
====================================================== */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AWS Monitor backend is running",
    region,
    services:
      "EC2 + CloudWatch + S3 + RDS + Lambda + Logs + ELB + Alarms",
  });
});

/* ======================================================
   SERVICE STATUS
====================================================== */

app.get("/api/services/status", async (req, res) => {
  const services = {};

  /* EC2 */
  try {
    await ec2.send(new DescribeInstancesCommand({}));

    services.ec2 = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.ec2 = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* CloudWatch */
  try {
    await cloudwatch.send(
      new DescribeAlarmsCommand({
        MaxRecords: 1,
      })
    );

    services.cloudwatch = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.cloudwatch = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* S3 */
  try {
    await s3.send(new ListBucketsCommand({}));

    services.s3 = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.s3 = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* RDS */
  try {
    await rds.send(
      new DescribeDBInstancesCommand({
        MaxRecords: 20,
      })
    );

    services.rds = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.rds = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* Lambda */
  try {
    await lambda.send(
      new ListFunctionsCommand({
        MaxItems: 1,
      })
    );

    services.lambda = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.lambda = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* CloudWatch Logs */
  try {
    await logs.send(
      new DescribeLogGroupsCommand({
        limit: 1,
      })
    );

    services.logs = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.logs = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  /* ELB */
  try {
    await elb.send(
      new DescribeLoadBalancersCommand({})
    );

    services.elb = {
      available: true,
      source: "aws",
      status: "Connected",
    };
  } catch (error) {
    services.elb = {
      available: false,
      source: "fallback",
      status: "Permission required",
      error: errorMessage(error),
    };
  }

  res.json({
    success: true,
    region,
    services,
  });
});

/* ======================================================
   EC2
====================================================== */

async function getEC2Instances() {
  const command =
    new DescribeInstancesCommand({});

  const data = await ec2.send(command);

  const instances = [];

  for (const reservation of data.Reservations || []) {
    for (const instance of reservation.Instances || []) {
      const nameTag =
        (instance.Tags || []).find(
          (tag) => tag.Key === "Name"
        );

      instances.push({
        id: instance.InstanceId,
        name:
          nameTag?.Value ||
          "Unnamed Instance",

        type:
          instance.InstanceType ||
          "unknown",

        state:
          instance.State?.Name ||
          "unknown",

        privateIp:
          instance.PrivateIpAddress || "",

        publicIp:
          instance.PublicIpAddress || "",

        availabilityZone:
          instance.Placement
            ?.AvailabilityZone || "",

        launchTime:
          instance.LaunchTime || null,

        architecture:
          instance.Architecture || "",

        platform:
          instance.Platform || "linux",
      });
    }
  }

  return instances;
}

app.get(
  "/api/ec2/instances",
  async (req, res) => {
    try {
      const instances =
        await getEC2Instances();

      const running =
        instances.filter(
          (instance) =>
            instance.state === "running"
        ).length;

      const stopped =
        instances.filter(
          (instance) =>
            instance.state === "stopped"
        ).length;

      res.json({
        success: true,
        available: true,
        source: "aws",
        count: instances.length,
        running,
        stopped,
        region,
        instances,
      });
    } catch (error) {
      console.error(
        "EC2 instances error:",
        error
      );

      res.json({
        success: true,
        available: false,
        source: "fallback",
        permissionRequired:
          isPermissionError(error),
        count: 0,
        running: 0,
        stopped: 0,
        region,
        instances: [],
        message: errorMessage(error),
      });
    }
  }
);

/* ======================================================
   EC2 + CLOUDWATCH METRICS
====================================================== */

app.get(
  "/api/ec2/:instanceId/metrics",
  async (req, res) => {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          message: "Instance ID is required",
        });
      }

      const endTime = new Date();

      const startTime = new Date(
        endTime.getTime() -
          60 * 60 * 1000
      );

      const command =
        new GetMetricDataCommand({
          StartTime: startTime,
          EndTime: endTime,

          ScanBy:
            "TimestampDescending",

          MetricDataQueries: [
            {
              Id: "cpu",

              Label:
                "CPU Utilization",

              MetricStat: {
                Metric: {
                  Namespace:
                    "AWS/EC2",

                  MetricName:
                    "CPUUtilization",

                  Dimensions: [
                    {
                      Name: "InstanceId",
                      Value: instanceId,
                    },
                  ],
                },

                Period: 300,
                Stat: "Average",
              },

              ReturnData: true,
            },

            {
              Id: "networkIn",

              Label: "Network In",

              MetricStat: {
                Metric: {
                  Namespace:
                    "AWS/EC2",

                  MetricName:
                    "NetworkIn",

                  Dimensions: [
                    {
                      Name: "InstanceId",
                      Value: instanceId,
                    },
                  ],
                },

                Period: 300,
                Stat: "Average",
              },

              ReturnData: true,
            },

            {
              Id: "networkOut",

              Label: "Network Out",

              MetricStat: {
                Metric: {
                  Namespace:
                    "AWS/EC2",

                  MetricName:
                    "NetworkOut",

                  Dimensions: [
                    {
                      Name: "InstanceId",
                      Value: instanceId,
                    },
                  ],
                },

                Period: 300,
                Stat: "Average",
              },

              ReturnData: true,
            },

            {
              Id: "statusCheck",

              Label:
                "Status Check Failed",

              MetricStat: {
                Metric: {
                  Namespace:
                    "AWS/EC2",

                  MetricName:
                    "StatusCheckFailed",

                  Dimensions: [
                    {
                      Name: "InstanceId",
                      Value: instanceId,
                    },
                  ],
                },

                Period: 300,
                Stat: "Maximum",
              },

              ReturnData: true,
            },

            {
              Id: "memory",

              Label: "Memory Used",

              MetricStat: {
                Metric: {
                  Namespace:
                    "CWAgent",

                  MetricName:
                    "mem_used_percent",

                  Dimensions: [
                    {
                      Name: "InstanceId",
                      Value: instanceId,
                    },
                  ],
                },

                Period: 300,
                Stat: "Average",
              },

              ReturnData: true,
            },
          ],
        });

      const data =
        await cloudwatch.send(command);

      const results =
        data.MetricDataResults || [];

      function getMetric(id) {
        return results.find(
          (metric) =>
            metric.Id === id
        );
      }

      function latestValue(metric) {
        if (
          !metric ||
          !metric.Values ||
          metric.Values.length === 0
        ) {
          return null;
        }

        return metric.Values[0];
      }

      const cpuMetric =
        getMetric("cpu");

      const networkInMetric =
        getMetric("networkIn");

      const networkOutMetric =
        getMetric("networkOut");

      const statusMetric =
        getMetric("statusCheck");

      const memoryMetric =
        getMetric("memory");

      res.json({
        success: true,
        available: true,
        source: "aws",
        instanceId,
        startTime,
        endTime,

        current: {
          cpu: latestValue(cpuMetric),
          memory: latestValue(memoryMetric),
          networkIn:
            latestValue(networkInMetric),
          networkOut:
            latestValue(networkOutMetric),
          statusCheck:
            latestValue(statusMetric),
        },

        metrics: results,
      });
    } catch (error) {
      console.error(
        `CloudWatch error for ${req.params.instanceId}:`,
        error
      );

      res.json({
        success: true,
        available: false,
        source: "fallback",
        permissionRequired:
          isPermissionError(error),

        instanceId:
          req.params.instanceId,

        current: {
          cpu: null,
          memory: null,
          networkIn: null,
          networkOut: null,
          statusCheck: null,
        },

        metrics: [],

        message: errorMessage(error),
      });
    }
  }
);

/* ======================================================
   S3
====================================================== */

app.get("/api/s3/buckets", async (req, res) => {
  try {
    const data =
      await s3.send(
        new ListBucketsCommand({})
      );

    const buckets =
      (data.Buckets || []).map(
        (bucket) => ({
          name: bucket.Name,
          creationDate:
            bucket.CreationDate || null,

          region,

          storage: null,
          objects: null,
          requests: null,

          status: "Healthy",
        })
      );

    res.json(
      awsResponse({
        buckets,
        count: buckets.length,
      })
    );
  } catch (error) {
    console.error(
      "S3 error:",
      error
    );

    res.json(
      fallbackResponse(
        {
          buckets:
            fallback.s3.buckets,

          count:
            fallback.s3.buckets.length,
        },
        error
      )
    );
  }
});

/* ======================================================
   RDS
====================================================== */

app.get(
  "/api/rds/instances",
  async (req, res) => {
    try {
      const data =
        await rds.send(
          new DescribeDBInstancesCommand({})
        );

      const instances =
        (data.DBInstances || []).map(
          (db) => ({
            id:
              db.DBInstanceIdentifier,

            engine:
              db.Engine,

            engineVersion:
              db.EngineVersion,

            status:
              db.DBInstanceStatus,

            instanceClass:
              db.DBInstanceClass,

            endpoint:
              db.Endpoint?.Address || "",

            port:
              db.Endpoint?.Port || null,

            availabilityZone:
              db.AvailabilityZone || "",

            storage:
              db.AllocatedStorage || 0,

            region,
          })
        );

      res.json(
        awsResponse({
          instances,
          count: instances.length,
        })
      );
    } catch (error) {
      console.error(
        "RDS error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            instances:
              fallback.rds.instances,

            count:
              fallback.rds.instances.length,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   LAMBDA
====================================================== */

app.get(
  "/api/lambda/functions",
  async (req, res) => {
    try {
      const data =
        await lambda.send(
          new ListFunctionsCommand({})
        );

      const functions =
        (data.Functions || []).map(
          (fn) => ({
            name:
              fn.FunctionName,

            runtime:
              fn.Runtime,

            handler:
              fn.Handler,

            memory:
              fn.MemorySize,

            timeout:
              fn.Timeout,

            codeSize:
              fn.CodeSize,

            lastModified:
              fn.LastModified,

            state:
              fn.State || "Active",

            region,
          })
        );

      res.json(
        awsResponse({
          functions,
          count: functions.length,
        })
      );
    } catch (error) {
      console.error(
        "Lambda error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            functions:
              fallback.lambda.functions,

            count:
              fallback.lambda.functions.length,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   CLOUDWATCH LOG GROUPS
====================================================== */

app.get(
  "/api/logs/groups",
  async (req, res) => {
    try {
      const data =
        await logs.send(
          new DescribeLogGroupsCommand({
            limit: 50,
          })
        );

      const groups =
        (data.logGroups || []).map(
          (group) => ({
            name:
              group.logGroupName,

            storedBytes:
              group.storedBytes || 0,

            retentionDays:
              group.retentionInDays ||
              null,

            creationTime:
              group.creationTime || null,

            metricFilterCount:
              group.metricFilterCount || 0,
          })
        );

      res.json(
        awsResponse({
          groups,
          count: groups.length,
        })
      );
    } catch (error) {
      console.error(
        "CloudWatch Logs error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            groups:
              fallback.logs.groups,

            count:
              fallback.logs.groups.length,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   CLOUDWATCH LOG EVENTS
====================================================== */

app.get(
  "/api/logs/events",
  async (req, res) => {
    const logGroupName =
      req.query.logGroupName;

    if (!logGroupName) {
      return res.status(400).json({
        success: false,
        message:
          "logGroupName is required",
      });
    }

    try {
      const data =
        await logs.send(
          new FilterLogEventsCommand({
            logGroupName,
            limit: 100,
          })
        );

      const events =
        (data.events || []).map(
          (event) => ({
            timestamp:
              event.timestamp,

            message:
              event.message,

            logStreamName:
              event.logStreamName,

            eventId:
              event.eventId,
          })
        );

      res.json(
        awsResponse({
          events,
          count: events.length,
        })
      );
    } catch (error) {
      console.error(
        "Log events error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            events: [],
            count: 0,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   ELB / LOAD BALANCERS
====================================================== */

app.get(
  "/api/elb/load-balancers",
  async (req, res) => {
    try {
      const data =
        await elb.send(
          new DescribeLoadBalancersCommand({})
        );

      const loadBalancers =
        (data.LoadBalancers || []).map(
          (lb) => ({
            name:
              lb.LoadBalancerName,

            arn:
              lb.LoadBalancerArn,

            type:
              lb.Type,

            state:
              lb.State?.Code,

            scheme:
              lb.Scheme,

            dnsName:
              lb.DNSName,

            availabilityZones:
              (
                lb.AvailabilityZones ||
                []
              ).length,

            region,
          })
        );

      res.json(
        awsResponse({
          loadBalancers,
          count:
            loadBalancers.length,
        })
      );
    } catch (error) {
      console.error(
        "ELB error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            loadBalancers:
              fallback.elb.loadBalancers,

            count:
              fallback.elb.loadBalancers
                .length,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   AWS NOTIFICATIONS
====================================================== */

app.get("/api/notifications", async (req, res) => {
  const notifications = [];
  const checkedServices = {};
  const now = new Date();

  /* ==================================================
     EC2 + CLOUDWATCH
  ================================================== */

  try {
    const instances = await getEC2Instances();

    checkedServices.ec2 = {
      available: true,
      source: "aws",
    };

    checkedServices.cloudwatch = {
      available: true,
      source: "aws",
    };

    /*
       Check every EC2 instance.
       We intentionally limit metric requests so the
       notification endpoint remains lightweight.
    */

    const instancesToCheck = instances.slice(0, 50);

    for (const instance of instancesToCheck) {

      const instanceName =
        instance.name || instance.id;

      /* ============================================
         STOPPED INSTANCE
      ============================================ */

      if (instance.state === "stopped") {

        notifications.push({
          id: `ec2-stopped-${instance.id}`,
          type: "warning",
          title: "EC2 Instance Stopped",
          message: `${instanceName} (${instance.id}) is stopped.`,
          resource: instance.id,
          service: "EC2",
          time: now.toISOString(),
          path: "/ec2",
        });

        continue;
      }

      /*
         Only query CloudWatch metrics for running
         instances.
      */

      if (instance.state !== "running") {
        continue;
      }

      try {

        const endTime = new Date();

        const startTime = new Date(
          endTime.getTime() -
            15 * 60 * 1000
        );

        const metricData =
          await cloudwatch.send(
            new GetMetricDataCommand({
              StartTime: startTime,
              EndTime: endTime,

              ScanBy:
                "TimestampDescending",

              MetricDataQueries: [
                {
                  Id: "cpu",

                  MetricStat: {
                    Metric: {
                      Namespace:
                        "AWS/EC2",

                      MetricName:
                        "CPUUtilization",

                      Dimensions: [
                        {
                          Name:
                            "InstanceId",

                          Value:
                            instance.id,
                        },
                      ],
                    },

                    Period: 300,
                    Stat: "Average",
                  },

                  ReturnData: true,
                },

                {
                  Id: "statuscheck",

                  MetricStat: {
                    Metric: {
                      Namespace:
                        "AWS/EC2",

                      MetricName:
                        "StatusCheckFailed",

                      Dimensions: [
                        {
                          Name:
                            "InstanceId",

                          Value:
                            instance.id,
                        },
                      ],
                    },

                    Period: 300,
                    Stat: "Maximum",
                  },

                  ReturnData: true,
                },
              ],
            })
          );

        const results =
          metricData.MetricDataResults || [];

        const cpuResult =
          results.find(
            (item) => item.Id === "cpu"
          );

        const statusResult =
          results.find(
            (item) =>
              item.Id === "statuscheck"
          );

        const cpu =
          cpuResult?.Values?.length
            ? Number(cpuResult.Values[0])
            : null;

        const statusCheck =
          statusResult?.Values?.length
            ? Number(
                statusResult.Values[0]
              )
            : 0;

        /* ==========================================
           STATUS CHECK FAILURE
        ========================================== */

        if (statusCheck > 0) {

          notifications.push({
            id: `ec2-status-${instance.id}`,
            type: "critical",
            title: "EC2 Status Check Failed",
            message: `${instanceName} (${instance.id}) has a failed EC2 status check.`,
            resource: instance.id,
            service: "EC2",
            time: now.toISOString(),
            path: "/ec2",
          });
        }

        /* ==========================================
           HIGH CPU
        ========================================== */

        if (
          cpu !== null &&
          cpu >= 90
        ) {

          notifications.push({
            id: `ec2-cpu-critical-${instance.id}`,
            type: "critical",
            title: "High CPU Utilization",
            message: `${instanceName} CPU utilization is ${cpu.toFixed(1)}%.`,
            resource: instance.id,
            service: "CloudWatch",
            time: now.toISOString(),
            path: "/cloudwatch",
            value: cpu,
          });

        } else if (
          cpu !== null &&
          cpu >= 70
        ) {

          notifications.push({
            id: `ec2-cpu-warning-${instance.id}`,
            type: "warning",
            title: "CPU Utilization Warning",
            message: `${instanceName} CPU utilization is ${cpu.toFixed(1)}%.`,
            resource: instance.id,
            service: "CloudWatch",
            time: now.toISOString(),
            path: "/cloudwatch",
            value: cpu,
          });
        }

      } catch (metricError) {

        /*
           Do not allow one instance's metric
           permission problem to break all
           notifications.
        */

        console.warn(
          `Notification metric error for ${instance.id}:`,
          errorMessage(metricError)
        );
      }
    }

  } catch (error) {

    checkedServices.ec2 = {
      available: false,
      source: "fallback",
      error: errorMessage(error),
    };

    checkedServices.cloudwatch = {
      available: false,
      source: "fallback",
      error: errorMessage(error),
    };
  }

  /* ==================================================
     CLOUDWATCH ALARMS
  ================================================== */

  try {

    const alarmData =
      await cloudwatch.send(
        new DescribeAlarmsCommand({})
      );

    checkedServices.alarms = {
      available: true,
      source: "aws",
    };

    for (
      const alarm of
      alarmData.MetricAlarms || []
    ) {

      if (
        alarm.StateValue ===
        "ALARM"
      ) {

        notifications.push({
          id: `alarm-critical-${alarm.AlarmArn || alarm.AlarmName}`,
          type: "critical",
          title: "CloudWatch Alarm Triggered",
          message:
            alarm.StateReason ||
            `${alarm.AlarmName} is in ALARM state.`,
          resource:
            alarm.AlarmName,
          service: "CloudWatch",
          time:
            alarm.StateUpdatedTimestamp
              ? new Date(
                  alarm.StateUpdatedTimestamp
                ).toISOString()
              : now.toISOString(),
          path: "/alarms",
        });

      } else if (
        alarm.StateValue ===
        "INSUFFICIENT_DATA"
      ) {

        notifications.push({
          id: `alarm-warning-${alarm.AlarmArn || alarm.AlarmName}`,
          type: "warning",
          title: "CloudWatch Alarm Has Insufficient Data",
          message:
            alarm.StateReason ||
            `${alarm.AlarmName} has insufficient monitoring data.`,
          resource:
            alarm.AlarmName,
          service: "CloudWatch",
          time:
            alarm.StateUpdatedTimestamp
              ? new Date(
                  alarm.StateUpdatedTimestamp
                ).toISOString()
              : now.toISOString(),
          path: "/alarms",
        });
      }
    }

  } catch (error) {

    checkedServices.alarms = {
      available: false,
      source: "fallback",
      error: errorMessage(error),
    };
  }

  /* ==================================================
     CLOUDWATCH LOGS
  ================================================== */

  try {

    const groupData =
      await logs.send(
        new DescribeLogGroupsCommand({
          limit: 20,
        })
      );

    checkedServices.logs = {
      available: true,
      source: "aws",
    };

    const logGroups =
      groupData.logGroups || [];

    /*
       Check recent events from the first
       10 log groups.

       This keeps the notification request
       reasonably lightweight.
    */

    const groupsToCheck =
      logGroups.slice(0, 10);

    const logStartTime =
      Date.now() -
      15 * 60 * 1000;

    const logChecks =
      await Promise.all(
        groupsToCheck.map(
          async (group) => {

            try {

              const result =
                await logs.send(
                  new FilterLogEventsCommand({
                    logGroupName:
                      group.logGroupName,

                    startTime:
                      logStartTime,

                    limit: 20,

                    filterPattern:
                      "?ERROR ?Error ?error ?Exception ?FATAL ?Fatal",
                  })
                );

              return {
                group:
                  group.logGroupName,

                events:
                  result.events || [],
              };

            } catch (error) {

              console.warn(
                `Log notification error for ${group.logGroupName}:`,
                errorMessage(error)
              );

              return {
                group:
                  group.logGroupName,

                events: [],
              };
            }
          }
        )
      );

    for (
      const result of logChecks
    ) {

      for (
        const event of result.events.slice(
          0,
          5
        )
      ) {

        const eventId =
          event.eventId ||
          `${result.group}-${event.timestamp}`;

        notifications.push({
          id: `log-error-${eventId}`,
          type: "critical",
          title: "CloudWatch Log Error",
          message:
            (event.message || "Error detected in CloudWatch Logs")
              .replace(/\s+/g, " ")
              .slice(0, 180),
          resource:
            result.group,
          service: "CloudWatch Logs",
          time: event.timestamp
            ? new Date(
                event.timestamp
              ).toISOString()
            : now.toISOString(),
          path: "/logs",
        });
      }
    }

  } catch (error) {

    checkedServices.logs = {
      available: false,
      source: "fallback",
      error: errorMessage(error),
    };
  }

  /* ==================================================
     SORT NOTIFICATIONS
  ================================================== */

  const severityOrder = {
    critical: 1,
    warning: 2,
    success: 3,
  };

  notifications.sort(
    (a, b) => {

      const severityDifference =
        (severityOrder[a.type] || 9) -
        (severityOrder[b.type] || 9);

      if (
        severityDifference !== 0
      ) {
        return severityDifference;
      }

      return (
        new Date(b.time) -
        new Date(a.time)
      );
    }
  );

  /* ==================================================
     HEALTHY STATE
  ================================================== */

  if (
    notifications.length === 0
  ) {

    notifications.push({
      id: "system-healthy",
      type: "success",
      title: "AWS Infrastructure Healthy",
      message:
        "No active EC2, CloudWatch, or CloudWatch Logs issues detected.",
      resource: "AWS Infrastructure",
      service: "AWS Monitor",
      time: now.toISOString(),
      path: "/",
    });
  }

  /* ==================================================
     RESPONSE
  ================================================== */

  res.json({
    success: true,
    source: "aws",
    region,
    checkedAt:
      now.toISOString(),

    count:
      notifications.length,

    unreadCount:
      notifications.filter(
        (item) =>
          item.type !== "success"
      ).length,

    services:
      checkedServices,

    notifications,
  });
});

/* ======================================================
   CLOUDWATCH ALARMS
====================================================== */

app.get(
  "/api/alarms",
  async (req, res) => {
    try {
      const data =
        await cloudwatch.send(
          new DescribeAlarmsCommand({})
        );

      const alarms =
        (data.MetricAlarms || []).map(
          (alarm) => {
            let severity = "Healthy";

            if (
              alarm.StateValue ===
              "ALARM"
            ) {
              severity = "Critical";
            } else if (
              alarm.StateValue ===
              "INSUFFICIENT_DATA"
            ) {
              severity = "Warning";
            }

            return {
              name:
                alarm.AlarmName,

              state:
                alarm.StateValue,

              reason:
                alarm.StateReason,

              metric:
                alarm.MetricName,

              namespace:
                alarm.Namespace,

              threshold:
                alarm.Threshold,

              comparison:
                alarm.ComparisonOperator,

              severity,
            };
          }
        );

      res.json(
        awsResponse({
          alarms,
          count: alarms.length,
        })
      );
    } catch (error) {
      console.error(
        "Alarms error:",
        error
      );

      res.json(
        fallbackResponse(
          {
            alarms:
              fallback.alarms.alarms,

            count:
              fallback.alarms.alarms.length,
          },
          error
        )
      );
    }
  }
);

/* ======================================================
   DASHBOARD SUMMARY
====================================================== */

app.get(
  "/api/dashboard/summary",
  async (req, res) => {
    const response = {
      success: true,

      updatedAt:
        new Date(),

      region,

      services: {},

      ec2: {
        available: false,
        source: "fallback",
        total: 0,
        running: 0,
        stopped: 0,
        error: null,
      },

      cloudWatch: {
        available: false,
        source: "fallback",
        error: null,

        period:
          "Last 1 hour",

        interval:
          "5 minutes",

        metrics: {
          cpuAverage: null,
          networkInBytes: null,
          networkOutBytes: null,
          totalNetworkBytes: null,
          totalNetworkGB: null,
        },
      },

      instances: [],

      s3: {
        available: false,
        source: "fallback",
      },

      rds: {
        available: false,
        source: "fallback",
      },

      lambda: {
        available: false,
        source: "fallback",
      },

      logs: {
        available: false,
        source: "fallback",
      },

      elb: {
        available: false,
        source: "fallback",
      },

      alarms: {
        available: false,
        source: "fallback",
      },
    };

    /* ==================================================
       EC2
    ================================================== */

    let instances = [];

    try {
      instances =
        await getEC2Instances();

      response.instances =
        instances;

      response.ec2.available =
        true;

      response.ec2.source =
        "aws";

      response.ec2.total =
        instances.length;

      response.ec2.running =
        instances.filter(
          (instance) =>
            instance.state === "running"
        ).length;

      response.ec2.stopped =
        instances.filter(
          (instance) =>
            instance.state === "stopped"
        ).length;

      response.services.ec2 =
        "aws";
    } catch (error) {
      response.ec2.error =
        errorMessage(error);

      response.services.ec2 =
        "fallback";
    }

    /* ==================================================
       CLOUDWATCH
    ================================================== */

    try {
      if (instances.length === 0) {
        throw new Error(
          "No EC2 instances available"
        );
      }

      const endTime =
        new Date();

      const startTime =
        new Date(
          endTime.getTime() -
            60 * 60 * 1000
        );

      const queries = [];

      for (const instance of instances) {
        const id =
          instance.id.replace(
            /-/g,
            ""
          );

        queries.push({
          Id: `cpu_${id}`,

          MetricStat: {
            Metric: {
              Namespace:
                "AWS/EC2",

              MetricName:
                "CPUUtilization",

              Dimensions: [
                {
                  Name: "InstanceId",
                  Value: instance.id,
                },
              ],
            },

            Period: 300,
            Stat: "Average",
          },

          ReturnData: true,
        });

        queries.push({
          Id: `netin_${id}`,

          MetricStat: {
            Metric: {
              Namespace:
                "AWS/EC2",

              MetricName:
                "NetworkIn",

              Dimensions: [
                {
                  Name: "InstanceId",
                  Value: instance.id,
                },
              ],
            },

            Period: 300,
            Stat: "Average",
          },

          ReturnData: true,
        });

        queries.push({
          Id: `netout_${id}`,

          MetricStat: {
            Metric: {
              Namespace:
                "AWS/EC2",

              MetricName:
                "NetworkOut",

              Dimensions: [
                {
                  Name: "InstanceId",
                  Value: instance.id,
                },
              ],
            },

            Period: 300,
            Stat: "Average",
          },

          ReturnData: true,
        });
      }

      const data =
        await cloudwatch.send(
          new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,

            ScanBy:
              "TimestampDescending",

            MetricDataQueries:
              queries,
          })
        );

      const results =
        data.MetricDataResults || [];

      const cpuValues = [];

      let networkInBytes = 0;
      let networkOutBytes = 0;

      for (const result of results) {
        if (
          result.Id.startsWith(
            "cpu_"
          )
        ) {
          for (
            const value of
              result.Values || []
          ) {
            cpuValues.push(
              Number(value)
            );
          }
        }

        if (
          result.Id.startsWith(
            "netin_"
          )
        ) {
          for (
            const value of
              result.Values || []
          ) {
            networkInBytes +=
              Number(value) || 0;
          }
        }

        if (
          result.Id.startsWith(
            "netout_"
          )
        ) {
          for (
            const value of
              result.Values || []
          ) {
            networkOutBytes +=
              Number(value) || 0;
          }
        }
      }

      let cpuAverage = null;

      if (
        cpuValues.length > 0
      ) {
        cpuAverage =
          cpuValues.reduce(
            (total, value) =>
              total + value,
            0
          ) /
          cpuValues.length;
      }

      const totalNetworkBytes =
        networkInBytes +
        networkOutBytes;

      const totalNetworkGB =
        totalNetworkBytes /
        (1024 *
          1024 *
          1024);

      response.cloudWatch = {
        available: true,
        source: "aws",
        error: null,

        period:
          "Last 1 hour",

        interval:
          "5 minutes",

        metrics: {
          cpuAverage,
          networkInBytes,
          networkOutBytes,
          totalNetworkBytes,
          totalNetworkGB,
        },
      };

      response.services.cloudwatch =
        "aws";
    } catch (error) {
      response.cloudWatch.available =
        false;

      response.cloudWatch.source =
        "fallback";

      response.cloudWatch.error =
        errorMessage(error);

      response.services.cloudwatch =
        "fallback";
    }

    /* ==================================================
       OTHER SERVICES
    ================================================== */

    const serviceCalls = [
      {
        name: "s3",

        fn: async () =>
          await s3.send(
            new ListBucketsCommand({})
          ),
      },

      {
        name: "rds",

        fn: async () =>
          await rds.send(
            new DescribeDBInstancesCommand(
              {}
            )
          ),
      },

      {
        name: "lambda",

        fn: async () =>
          await lambda.send(
            new ListFunctionsCommand({})
          ),
      },

      {
        name: "logs",

        fn: async () =>
          await logs.send(
            new DescribeLogGroupsCommand({
              limit: 1,
            })
          ),
      },

      {
        name: "elb",

        fn: async () =>
          await elb.send(
            new DescribeLoadBalancersCommand(
              {}
            )
          ),
      },

      {
        name: "alarms",

        fn: async () =>
          await cloudwatch.send(
            new DescribeAlarmsCommand({
              MaxRecords: 1,
            })
          ),
      },
    ];

    for (const service of serviceCalls) {
      try {
        await service.fn();

        response[service.name] = {
          available: true,
          source: "aws",
        };

        response.services[
          service.name
        ] = "aws";
      } catch (error) {
        response[service.name] = {
          available: false,
          source: "fallback",
          error:
            errorMessage(error),
        };

        response.services[
          service.name
        ] = "fallback";
      }
    }

    /* ==================================================
       ALWAYS RETURN DASHBOARD
    ================================================== */

    res.json(response);
  }
);

/* ======================================================
   UNKNOWN API ROUTE
====================================================== */

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found",
      route:
        req.originalUrl,
    });
  }
);

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        errorMessage(error),
    });
  }
);

/* ======================================================
   START SERVER
====================================================== */

app.listen(
  PORT,
  () => {
    console.log("");

    console.log(
      "======================================"
    );

    console.log(
      "          AWS MONITOR API"
    );

    console.log(
      "======================================"
    );

    console.log(
      `API: http://localhost:${PORT}`
    );

    console.log(
      `Region: ${region}`
    );

    console.log(
      "Services: EC2 + CloudWatch + S3 + RDS + Lambda + Logs + ELB + Alarms"
    );

    console.log(
      "Dashboard: /api/dashboard/summary"
    );

    console.log(
      "======================================"
    );

    console.log("");
  }
);