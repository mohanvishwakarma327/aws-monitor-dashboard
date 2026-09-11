# AWS Monitor Dashboard 🚀

A modern AWS infrastructure monitoring dashboard built with **React, Vite, Node.js, Express, and AWS SDK**.

The dashboard provides a centralized interface to monitor AWS resources such as EC2, Lambda, RDS, S3, CloudWatch, Alarms, Logs, and Load Balancers.

---

## 📸 Overview

AWS Monitor Dashboard provides a real-time style monitoring interface with:

- AWS service health monitoring
- EC2 instance monitoring
- CloudWatch metrics
- CPU utilization tracking
- Network monitoring
- RAM monitoring through CloudWatch Agent
- Lambda function monitoring
- RDS database monitoring
- S3 storage monitoring
- CloudWatch Logs
- CloudWatch Alarms
- Notification center
- Dark / Light mode
- Automatic data refresh
- AWS permission-aware fallback handling
- Responsive dashboard UI

---

## ✨ Features

### 🖥️ Dashboard

Centralized overview of your AWS infrastructure.

- Total EC2 instances
- Running instances
- Stopped instances
- AWS service health
- EC2 health overview
- CloudWatch monitoring
- Recent alerts
- Animated monitoring cards
- Automatic refresh

---

### ☁️ EC2 Monitoring

Monitor your EC2 infrastructure from a single interface.

- Instance ID
- Instance name
- Instance type
- Instance state
- Private IP
- Public IP
- Availability Zone
- Architecture
- Platform
- Launch time
- CPU utilization
- Network traffic
- Status checks
- Memory utilization

---

### 📊 CloudWatch

Monitor EC2 CloudWatch metrics.

Currently supported metrics include:

- CPU Utilization
- Network In
- Network Out
- Status Check Failed
- Memory utilization through CloudWatch Agent

---

### ⚡ Lambda

Monitor AWS Lambda functions.

- Function name
- Runtime
- Memory configuration
- Timeout
- Architecture
- Last modified
- Function ARN

---

### 🗄️ RDS

Monitor Amazon RDS database instances.

- DB identifier
- Engine
- Engine version
- Instance class
- Database status
- Availability Zone
- Storage
- Endpoint
- Port
- Multi-AZ configuration
- Backup retention

---

### 🪣 S3

Monitor Amazon S3 resources.

- Bucket information
- Bucket count
- AWS region
- Storage monitoring foundation

---

### 📜 CloudWatch Logs

Browse CloudWatch log groups and events.

- Log group selection
- Log events
- Error detection
- Exception detection
- Fatal error detection
- Timeout detection
- Search
- Log level filtering
- Automatic refresh

---

### 🚨 Alarms & Notifications

Centralized AWS monitoring alerts.

The system can detect:

- High CPU
- High memory
- Failed EC2 status checks
- Stopped EC2 instances
- CloudWatch alarms
- Insufficient CloudWatch data
- Application errors
- Exceptions
- Fatal errors
- Failures
- Timeouts

Notifications support:

- Unread count
- Mark all as read
- Clear notifications
- Navigation to related monitoring pages

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Lucide React

### Backend

- Node.js
- Express.js
- AWS SDK for JavaScript

### AWS Services

- Amazon EC2
- Amazon CloudWatch
- Amazon CloudWatch Logs
- AWS Lambda
- Amazon RDS
- Amazon S3
- Elastic Load Balancing

---

## 🏗️ Architecture

```text
                 ┌──────────────────────┐
                 │      React UI        │
                 │      + Vite          │
                 └──────────┬───────────┘
                            │
                            │ REST API
                            ▼
                 ┌──────────────────────┐
                 │   Node.js / Express  │
                 │      Backend         │
                 └──────────┬───────────┘
                            │
                            │ AWS SDK
                            ▼
       ┌────────────────────────────────────────┐
       │               AWS Cloud                │
       │                                        │
       │  EC2       CloudWatch       Lambda     │
       │  RDS       S3               Logs       │
       │  ELB       CloudWatch Alarms           │
       └────────────────────────────────────────┘

       Project Structure 
       aws-monitor-dashboard/
│
├── public/
│
├── server/
│   └── index.js
│
├── src/
│   ├── assets/
│   │
│   ├── pages/
│   │   ├── Alarms.jsx
│   │   ├── CloudWatch.jsx
│   │   ├── Dashboard.jsx
│   │   ├── EC2.jsx
│   │   ├── Lambda.jsx
│   │   ├── Logs.jsx
│   │   ├── RDS.jsx
│   │   ├── S3.jsx
│   │   └── Settings.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js