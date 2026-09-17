# 🚀 ComplianceOS — 60-Second Quickstart & Onboarding Guide

Welcome to **ComplianceOS**, the open-source operating system for Governance, Risk, and Compliance (GRC).

---

## ⚡ Option 1: 1-Command Production Install (Docker)

### 🐧 Linux & macOS
```bash
curl -fsSL https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/install.sh | bash
```

### 🪟 Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/Sectutor/ComplianceOS/main/install.ps1 | iex
```

This automatically:
1. Detects your Docker environment.
2. Generates secure 256-bit encryption and authentication keys.
3. Pulls and launches PostgreSQL, Redis, and ComplianceOS.
4. Initializes the database schema.
5. Provides your instant admin credentials.

---

## 💻 Option 2: Clone & Run with Node (Bare Metal / Dev)

```bash
# 1. Clone the repository
git clone https://github.com/Sectutor/ComplianceOS.git
cd ComplianceOS

# 2. Install dependencies
npm install

# 3. Launch the quickstart
npm run quickstart
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧭 First-Run Onboarding Walkthrough (3 Simple Steps)

### Step 1: Sign In as Administrator
- **URL:** `http://localhost:3002` (Docker) or `http://localhost:5173` (Dev)
- **Email:** `admin@complianceos.local`
- **Password:** Displayed in your terminal during install (or the password configured in `.env`).

### Step 2: Create Your Organization
1. Upon logging in, you will be prompted to enter your **Organization / Client Name** and **Industry** (e.g. *Technology, FinTech, Healthcare, Defense*).
2. Click **Continue**.

### Step 3: Select Your Compliance Frameworks
1. Select your target frameworks:
   - **ISO 27001:2022** (Information Security Management)
   - **SOC 2 Type I & II** (Trust Services Criteria)
   - **HIPAA / GDPR / NIST 800-53** (Privacy & Security Baselines)
2. Choose **Auto-Assign Baseline Controls** and **Generate Policy Templates**.
3. Click **Complete Onboarding**.

🎉 **You're all set!** Your controls, policy library, evidence vault, and risk heatmap are instantly initialized and ready to manage your security audit.

---

## 🛠️ Handy Commands

| Action | Docker Command | Bare-Metal Command |
| :--- | :--- | :--- |
| **Start Service** | `docker compose -f docker-compose.selfhost.yml up -d` | `npm run dev:community` |
| **Stop Service** | `docker compose -f docker-compose.selfhost.yml down` | `Ctrl + C` |
| **View Live Logs** | `docker compose -f docker-compose.selfhost.yml logs -f` | Standard output |
| **Health Check** | `curl http://localhost:3002/api/health` | `curl http://localhost:3005/api/health` |
