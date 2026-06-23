# 🔍 Hidden Job Finder

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-black.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Nginx](https://img.shields.io/badge/Nginx-Latest-green.svg?logo=nginx&logoColor=white)](https://nginx.org)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Hidden Job Finder** is a web-based GUI utility designed to easily build complex boolean `site:` search queries targeting top Applicant Tracking Systems (ATS) like Ashby, Greenhouse, Lever, Workday, and more. 

### Why this is needed
A huge portion of job openings are never listed on standard job boards like LinkedIn, or they are posted there much later. By querying ATS hostnames directly with targeted boolean expressions, you can uncover hidden vacancies directly from the source.

> [!NOTE]  
> **Privacy and Compliance**: This application does **not** scrape Google, Bing, or DuckDuckGo. Instead, it generates optimized search query URLs that open directly in your web browser. This prevents search engine rate-limiting, CAPTCHAs, or Terms of Service violations while keeping search results fresh and direct.

---

## 💡 Inspiration

This project was inspired by a [LinkedIn post](https://www.linkedin.com/posts/jordanmazer_most-jobs-are-not-posted-on-linked-heres-share-7474841927998132225-UEp9/?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAAAM9glABMW0bSOaNQfDmhf1TwO5c_b7Q0U0) created by **[Jordan Mazer](https://www.linkedin.com/in/jordanmazer/)**, Head of Talent Acquisition. 

In his post, Jordan explained how most jobs are not posted on LinkedIn, and demonstrated how job seekers can leverage boolean search strings targeting ATS platforms (like Ashby, Greenhouse, and Lever) directly on search engines to discover opportunities that other applicants miss. This tool automates the construction of those complex boolean strings, saving you from manually typing out site lists and boolean operators.

---

## 🚀 How It Works

1. **Keywords & Boolean Logic**: Enter a seed keyword (e.g. `"chief of staff"`). Add additional clauses chained with `AND`, `OR`, or `NOT` operators.
2. **ATS Selection**: Select which ATS domains to search. You can select preconfigured targets or input custom domains.
3. **Search Engine**: Pick your preferred search engine (Google, Bing, or DuckDuckGo).
4. **Query Generation**: The tool automatically formats the boolean parameters, applying:
   - Implicit `AND` (spaces)
   - Proper grouping parentheses for `OR` clusters
   - Proper exclusions (converting `NOT term` to `-term`)
5. **Results**: Get a single combined search URL to scan all boards at once, or individual per-board search cards to review results systematically.

---

## 🛠️ Getting Started

You can run this project in production with full Docker + TLS orchestration, or locally for quick development.

### Option A: Running with Docker Compose (Production Setup with TLS)

This setup uses **Nginx** as a reverse proxy and **Certbot** to automatically provision and renew a Let's Encrypt wildcard certificate via Cloudflare DNS-01 challenges.

#### 1. Configure Cloudflare DNS-01 Credentials
1. Create a Cloudflare API token at [dash.cloudflare.com](https://dash.cloudflare.com/profile/api-tokens) with **Zone → DNS → Edit** permissions.
2. Copy the template credentials file:
   ```bash
   cp certbot/cloudflare.ini.example certbot/cloudflare.ini
   chmod 600 certbot/cloudflare.ini
   ```
3. Edit `certbot/cloudflare.ini` and paste your Cloudflare API token:
   ```ini
   dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
   ```

#### 2. Configure Your Domain
1. Edit `certbot/entrypoint.sh` (or `certbot/entrypoint_example.sh` if initializing) and set your base domain and email address:
   ```bash
   DOMAIN="yourdomain.com"
   --email your-email@yourdomain.com
   ```
2. Edit `frontend/nginx.conf` and replace `YOUR_DOMAIN` with your actual domain name:
   ```nginx
   server_name jobfinder.yourdomain.com;
   ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
   ```
3. Create a DNS **A record** in Cloudflare pointing your subdomain (e.g., `jobfinder.yourdomain.com`) to your server's public IP address.

#### 3. Build & Run
Spin up the service stack in detached mode:
```bash
docker compose up --build -d
```

Certbot will attempt to acquire the wildcard certificate on first boot. Monitor the logs using:
```bash
docker compose logs -f certbot
```

Once the certificate is successfully created and saved to the shared volume, restart Nginx to load the TLS certificates:
```bash
docker compose restart frontend
```

> [!TIP]
> **Nginx Certificate Reload**: Certbot will run a background loop checking for certificate renewal every 12 hours. Since Nginx doesn't automatically reload updated certificates, you can set up a simple host cron job to run:
> `docker compose exec frontend nginx -s reload`

---

### Option B: Local Development / Quick Start (No Docker / TLS)

If you just want to run the project locally on your machine without configuring Nginx, Docker, or TLS certificates, you can run the services manually.

#### 1. Run the Flask Backend
1. Navigate to the backend directory and set up a Python virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python app.py
   ```
   The backend will start on `http://localhost:5000`.

#### 2. Run the Frontend
Because the frontend communicates with the backend via relative path `/api`, you need to configure the local frontend to route requests to the Flask server:
1. Open [frontend/public/app.js](file:///Users/eazevedo/job-search-1/frontend/public/app.js) and change `API_BASE` (line 1) to point to your local backend:
   ```javascript
   const API_BASE = "http://localhost:5000/api";
   ```
2. Serve the static files from the `frontend/public` directory. You can use any lightweight static server:
   ```bash
   cd ../frontend/public
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to: `http://localhost:8000`

---

## 📁 Project Structure

```
job-search/
├── docker-compose.yml        # Multi-container orchestration (backend, frontend, certbot)
├── certbot/
│   ├── cloudflare.ini        # Cloudflare credentials (ignored by git)
│   ├── entrypoint.sh         # Custom certbot DNS-01 execution loop
│   └── entrypoint_example.sh # Certbot entrypoint template
├── backend/                  # Flask REST API (boolean query constructor)
│   ├── app.py                # Main backend service
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Backend image specification
└── frontend/                 # Static web client served by Nginx proxy
    ├── nginx.conf            # HTTP redirection and reverse proxy to Flask backend
    ├── Dockerfile            # Frontend image specification
    └── public/               # GUI source files
        ├── index.html        # App interface
        ├── style.css         # Styling system
        └── app.js            # Frontend logic
```

---

## ⚙️ Customization & Extensibility

- **Adding Default Job Boards**: If you want to expand the pre-selected list of ATS websites, edit the `ATS_SITES` dictionary in [backend/app.py](file:///Users/eazevedo/job-search-1/backend/app.py):
  ```python
  ATS_SITES = [
      {"id": "ashby", "name": "Ashby", "domain": "jobs.ashbyhq.com"},
      ...
  ]
  ```
- **Custom Domains**: Users can also add their own custom sites directly in the UI during search generation without modifying the codebase.
