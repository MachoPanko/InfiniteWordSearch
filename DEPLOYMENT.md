# Deployment Guide for Digital Ocean

## Prerequisites
- Digital Ocean account
- OpenAI API key (optional - app has fallback word lists)
- Node.js 18+ for local development

## Option 1: Digital Ocean App Platform (Recommended)

### Steps:
1. Push your code to GitHub (already done!)
2. Log in to [Digital Ocean](https://cloud.digitalocean.com)
3. Go to Apps → Create App
4. Select "GitHub" as source
5. Choose the `MachoPanko/AutoWordSearchGenerator` repository
6. Select the branch you want to deploy
7. App Platform will auto-detect Next.js settings
8. Configure environment variables:
   - Add `OPENAI_API_KEY` with your OpenAI API key (optional)
9. Review and create app
10. Digital Ocean will build and deploy automatically

### Costs:
- Basic plan: $5-12/month depending on resources

## Option 2: Droplet Deployment

### Steps:

1. **Create a Droplet**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1GB RAM ($6/month)

2. **SSH into your droplet**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone repository**
   ```bash
   cd /var/www
   git clone https://github.com/MachoPanko/AutoWordSearchGenerator.git
   cd AutoWordSearchGenerator
   ```

6. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

7. **Set up environment variables**
   ```bash
   nano .env
   # Add: OPENAI_API_KEY=your_key_here
   ```

8. **Start with PM2**
   ```bash
   pm2 start npm --name "wordsearch" -- start
   pm2 save
   pm2 startup
   ```

9. **Set up Nginx (optional, for domain/SSL)**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/wordsearch
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/wordsearch /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Set up SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your_domain.com
    ```

## Testing Your Deployment

1. Visit your deployed URL
2. Enter a theme (e.g., "ocean", "space", "animals")
3. Click "Generate Puzzle"
4. Verify the puzzle appears with words listed
5. Click "Show Solution" to see highlighted words

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Optional | Your OpenAI API key. If not provided, app uses fallback word lists |

## Troubleshooting

### Build Fails
- Ensure Node.js 18+ is installed
- Check that all dependencies are installed: `npm install`
- Try clearing cache: `rm -rf .next && npm run build`

### API Errors
- If using OpenAI, verify API key is correct and has credits
- Check that `.env` file exists and is properly formatted
- Fallback words work without any API key

### App Not Accessible
- Verify the app is running: `pm2 status`
- Check firewall allows port 3000: `sudo ufw allow 3000`
- For Nginx, verify it's running: `sudo systemctl status nginx`

## Updating Your Deployment

### App Platform:
- Push changes to GitHub
- App Platform auto-deploys on push

### Droplet:
```bash
cd /var/www/AutoWordSearchGenerator
git pull
npm install
npm run build
pm2 restart wordsearch
```

## Support

For issues or questions, please open an issue on the GitHub repository:
https://github.com/MachoPanko/AutoWordSearchGenerator/issues
