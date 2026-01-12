# Cloudflare Tunnel + Zero Trust Setup

This guide sets up secure access to RecordPlus without exposing ports.

## Architecture

```
Users → Cloudflare Zero Trust (auth) → Cloudflare Tunnel → Your VPS (port 3000)
```

Benefits:

- No open ports on your server (more secure)
- Authentication handled by Cloudflare
- Free SSL certificates
- DDoS protection

---

## Step 1: Install Cloudflare Tunnel (cloudflared)

SSH into your server and run:

```bash
# Download and install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Verify installation
cloudflared --version
```

---

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser. Log in to your Cloudflare account and authorize the tunnel.

---

## Step 3: Create a Tunnel

```bash
# Create tunnel (choose a name)
cloudflared tunnel create recordplus

# This creates a credentials file at:
# ~/.cloudflared/<TUNNEL_ID>.json
# Note the TUNNEL_ID (a UUID like abc123-def456-...)
```

---

## Step 4: Configure the Tunnel

Create the config file:

```bash
nano ~/.cloudflared/config.yml
```

Add this content (replace YOUR_TUNNEL_ID and YOUR_DOMAIN):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # API backend
  - hostname: api.recordplus.yourdomain.com
    service: http://localhost:3000

  # Catch-all (required)
  - service: http_status:404
```

**Example with real values:**

```yaml
tunnel: abc12345-6789-def0-1234-567890abcdef
credentials-file: /root/.cloudflared/abc12345-6789-def0-1234-567890abcdef.json

ingress:
  - hostname: api.recordplus.example.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## Step 5: Route DNS

```bash
# This creates a CNAME record in Cloudflare DNS
cloudflared tunnel route dns recordplus api.recordplus.yourdomain.com
```

---

## Step 6: Run as a Service

```bash
# Install as system service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

---

## Step 7: Configure Zero Trust (Authentication)

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)

2. **Access → Applications → Add Application**

   - Type: Self-hosted
   - Name: "RecordPlus API"
   - Session duration: 24 hours
   - Application domain: `api.recordplus.yourdomain.com`

3. **Add Policy**

   - Policy name: "Law Firm Staff"
   - Action: Allow
   - Include rule:
     - Selector: "Emails"
     - Value: `user1@example.com, user2@example.com`

   OR for a domain:

   - Selector: "Emails ending in"
   - Value: `@yourfirm.com`

4. **Authentication**
   - Choose: "One-time PIN" (sends code to email)
   - Or: "Google" (if you use Google Workspace)

---

## Step 8: Test Access

1. Open `https://api.recordplus.yourdomain.com/api/health`
2. You should see Cloudflare login page
3. After authentication, you should see: `{"status":"ok"}`

---

## Frontend Deployment (Cloudflare Pages)

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages)

2. **Create Project → Connect to Git**

   - Select your GitHub repo: `josfko/recordplus`
   - Build settings:
     - Build command: (leave empty)
     - Build output directory: `src/client`

3. **Environment Variables**

   - Add: `API_URL` = `https://api.recordplus.yourdomain.com`

4. **Custom Domain**

   - Add: `recordplus.yourdomain.com`

5. **Add Zero Trust** to frontend too (same process as API)

---

## Update API URL in Frontend

Edit `src/client/js/api.js` to use your production API:

```javascript
class ApiClient {
  constructor(baseUrl = "/api") {
    // Use environment-based URL
    this.baseUrl =
      window.location.hostname === "localhost"
        ? "/api"
        : "https://api.recordplus.yourdomain.com/api";
  }
  // ...
}
```

---

## Troubleshooting

**Tunnel not connecting:**

```bash
# Check tunnel status
cloudflared tunnel info recordplus

# Check service logs
sudo journalctl -u cloudflared -f
```

**App not responding:**

```bash
# Check if app is running
sudo -u appuser pm2 status

# Check app logs
sudo -u appuser pm2 logs recordplus
```

**DNS not resolving:**

- Wait 5 minutes for DNS propagation
- Check Cloudflare DNS dashboard for the CNAME record

---

## Security Checklist

- [x] No ports exposed (tunnel only)
- [x] Zero Trust authentication required
- [x] HTTPS enforced by Cloudflare
- [x] App runs as non-root user
- [x] Daily automated backups
- [x] Data stored in Spain (RGPD compliance)
