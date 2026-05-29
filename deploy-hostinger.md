# Duka Profit: Hostinger Deployment Guide

This guide describes how to deploy the **Duka Profit** application on Hostinger. 

---

## 🌟 Choose Your Deployment Route

Hostinger offers two main types of hosting that can run Node.js applications:

1. **Option A: Managed Node.js Hosting (via hPanel)**
   - *Best for:* Beginners or users who prefer a graphical dashboard over SSH.
   - *Database:* Must use **MongoDB Atlas** (Cloud Database), as Hostinger Shared/Cloud plans do not host MongoDB locally.
   - *Configuration:* Fully managed by hPanel (no Nginx configuration or manual SSL certificates needed).

2. **Option B: Virtual Private Server (VPS) Hosting**
   - *Best for:* Advanced users requiring full root SSH access.
   - *Database:* Can host MongoDB directly on the VPS (Free/Self-hosted) or connect to MongoDB Atlas.
   - *Configuration:* Manual configuration using **Nginx**, **PM2**, and **Let's Encrypt** (SSL).

---

## 📁 Prerequisites & Prep

### Step 1: Create a Cloud MongoDB Atlas Database (Required for Option A, Recommended for Option B)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and sign up for a free account.
2. Create a new Cluster (Choose the **M0 Shared Free Tier**).
3. Under **Database Access**, create a user (e.g., `duka_user`) and password. (Remember the password!).
4. Under **Network Access**, whitelist your IP. For initial setup, you can temporarily add `0.0.0.0/0` (allow all connections) so Hostinger servers can connect to it.
5. Go to **Clusters** -> **Connect** -> **Connect your application (Drivers)**.
6. Copy the connection string. It will look like this:
   `mongodb+srv://duka_user:<password>@cluster0.abcde.mongodb.net/duka-profit?retryWrites=true&w=majority`
7. Replace `<password>` with your database user's password.

---

## 🚀 Option A: Deploying on Managed Node.js (hPanel)

If you are using Hostinger **Business Web Hosting** or **Cloud Hosting**:

### 1. Set Up the Node.js Application in hPanel
1. Log into your **Hostinger hPanel**.
2. Go to **Websites** -> **Create or migrate a website** -> Select **Node.js Web App**.
3. Choose your domain name (e.g., `dukaprofit.com`).
4. Select the **Node.js Version** (v18 or v20 are recommended).
5. Specify the **Document Root** and **Startup File** path:
   - **Startup File**: `backend/server.js` (The main entry point of the backend).

### 2. Prepare and Upload Your Code
Hostinger hPanel supports automatic deployment from GitHub, which is highly recommended:
1. Push your repository to **GitHub** (keep it private if you have secret config, though `.env` files are not committed anyway).
2. Connect your GitHub repository to Hostinger in the hPanel Node.js dashboard.
3. If you do not want to use Git, you can compress the project folder (excluding `node_modules`, `dist-electron`, and `frontend/dist` if they exist) into a `.zip` file and upload it using hPanel **File Manager**, then extract it.

### 3. Build the Frontend
Since Hostinger hPanel runs the build scripts on deployment, we need to build the React frontend:
1. In hPanel, open the **Terminal** tab or run custom commands in the dashboard.
2. Go into the `frontend` folder and build the assets:
   ```bash
   cd frontend
   npm install
   VITE_API_URL=/api npm run build
   ```
   *Note: Building static files compiles them into `frontend/dist`. The Node.js Express server is configured to serve this directory automatically when `NODE_ENV=production`.*

### 4. Configure Environment Variables
In your Hostinger hPanel Node.js configuration tab, add the following Environment Variables:
- `NODE_ENV` = `production`
- `PORT` = `5000` (or the default port Hostinger allocates)
- `MONGODB_URI` = `mongodb+srv://duka_user:<password>@cluster0.abcde.mongodb.net/duka-profit?retryWrites=true&w=majority` (Your MongoDB Atlas URL)
- `JWT_SECRET` = `your_secure_random_key_here`
- `ALLOW_PORT_RETRY` = `true`

### 5. Install Dependencies and Run
1. Go back to the Node.js dashboard in hPanel and click **Run npm install** to install backend dependencies.
2. Click **Start** to run the app.
3. Access your domain (e.g., `http://yourdomain.com`). Hostinger's built-in proxy routes port 80/443 traffic directly to your backend Node.js server.

---

## 💻 Option B: Deploying on a Hostinger VPS

If you purchased a Hostinger **VPS plan** (running Ubuntu 22.04 or 24.04):

### 1. Connect to your VPS and Update
Connect via SSH using your VPS IP and password:
```bash
ssh root@YOUR_VPS_IP
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js, Git, and Nginx
Install Node.js (v18 LTS) and Nginx:
```bash
# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git and Nginx
sudo apt install -y git nginx
```

### 3. (Optional) Install Local MongoDB Database
*Skip this if you are using MongoDB Atlas.*
If you want to host the database directly on your VPS:
```bash
sudo apt install -y mongodb-server
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 4. Clone Code and Setup Environment
1. Clone your project repository into `/var/www/duka-profit`:
   ```bash
   cd /var/www
   git clone <your-git-repo-url> duka-profit
   cd duka-profit
   ```
2. Create your Production environment file in the backend folder:
   ```bash
   nano backend/.env
   ```
   Add the following values:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/duka-profit   # Or your MongoDB Atlas connection string
   JWT_SECRET=your_secure_random_key_here
   ALLOW_PORT_RETRY=false
   ```

### 5. Automate Building and Startup using PM2
1. Install PM2 globally to manage the Node.js background process:
   ```bash
   sudo npm install -g pm2
   ```
2. Make our deployment script executable and run it:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
   This script:
   - Installs frontend dependencies and compiles static files to `frontend/dist`.
   - Installs backend production dependencies.
   - Registers and starts the process under PM2.

3. Set up PM2 to auto-start on server boot:
   ```bash
   pm2 startup systemd
   # Copy-paste the command printed by PM2 on your screen
   ```

### 6. Configure Nginx Reverse Proxy
We will forward incoming internet traffic on port 80 to the Node.js server running on port 5000.
1. Open the Nginx config file:
   ```bash
   sudo nano /etc/nginx/sites-available/duka-profit
   ```
2. Copy the contents of the local [nginx.conf](file:///C:/Users/ujama/Downloads/duka-profit/duka-profit/nginx.conf) template, paste them inside, and replace `yourdomain.com` with your actual domain.
3. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/duka-profit /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default # Remove default config if present
   sudo nginx -t # Test configuration for syntax errors
   sudo systemctl restart nginx
   ```

### 7. Secure Server with SSL (Let's Encrypt Certbot)
Configure HTTPS for your domain:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the interactive prompts. Certbot will automatically inject SSL keys and update your `/etc/nginx/sites-available/duka-profit` to enforce HTTPS.

---

## 🌱 Seeding Demo Data

Once the application is up and running:
1. Navigate to the backend directory on your server:
   ```bash
   cd /var/www/duka-profit/backend
   node utils/seed.js
   ```
2. This will seed the MongoDB database with:
   - Demo admin: `demo@duka.rw` with password `password123`.
   - Default Trial License Key: `DUKA-DEMO-2024-FREE`.
   - Sample products & 30-day transaction logs.

---

## 🔌 Socket.IO Scanner Integration
If you are planning to connect a physical mobile device as a remote barcode scanner:
- The backend configuration utilizes Socket.IO.
- When running over HTTPS, your remote scanner app must connect via secure WebSocket (`wss://yourdomain.com`).
- Nginx config has standard WebSocket proxy headers enabled to allow smooth remote scanner connections without drops.
