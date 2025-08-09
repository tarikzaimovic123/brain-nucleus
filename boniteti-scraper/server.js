import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Store active scraping sessions
const scrapingSessions = new Map();

// Scraping status
let scrapingStatus = {
  isRunning: false,
  startTime: null,
  totalCompanies: 0,
  processedCompanies: 0,
  successCount: 0,
  failedCount: 0,
  skippedCount: 0,
  currentCompany: null,
  errors: [],
  logs: [],
  progress: 0,
  estimatedTimeRemaining: null,
  companiesPerMinute: 0
};

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current status to newly connected client
  socket.emit('status-update', scrapingStatus);
  
  // Handle scraping control commands
  socket.on('start-scraping', async (options) => {
    if (scrapingStatus.isRunning) {
      socket.emit('error', { message: 'Scraping already in progress' });
      return;
    }
    
    startScraping(options);
  });
  
  socket.on('stop-scraping', () => {
    stopScraping();
  });
  
  socket.on('get-logs', async () => {
    const logs = await getRecentLogs();
    socket.emit('logs-update', logs);
  });
  
  socket.on('get-errors', async () => {
    const errors = await getRecentErrors();
    socket.emit('errors-update', errors);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start scraping process
function startScraping(options = {}) {
  const {
    companies = 100,
    concurrent = 10,
    testMode = false
  } = options;
  
  // Reset status
  scrapingStatus = {
    isRunning: true,
    startTime: new Date(),
    totalCompanies: companies,
    processedCompanies: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    currentCompany: null,
    errors: [],
    logs: [],
    progress: 0,
    estimatedTimeRemaining: null,
    companiesPerMinute: 0
  };
  
  // Broadcast initial status
  io.emit('status-update', scrapingStatus);
  
  // Spawn scraper process
  const args = [
    'scraper-with-events.js',
    '--companies', companies.toString(),
    '--concurrent', concurrent.toString()
  ];
  
  if (testMode) {
    args.push('--test');
  }
  
  const scraperProcess = spawn('node', args, {
    cwd: __dirname,
    env: { ...process.env }
  });
  
  scrapingSessions.set('current', scraperProcess);
  
  // Handle scraper output
  scraperProcess.stdout.on('data', (data) => {
    const message = data.toString();
    
    // Parse JSON events from scraper
    const lines = message.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        if (line.startsWith('EVENT:')) {
          const event = JSON.parse(line.substring(6));
          handleScraperEvent(event);
        } else {
          // Regular log message
          addLog('info', line);
        }
      } catch (err) {
        // Not JSON, just a regular log
        addLog('info', line);
      }
    }
  });
  
  scraperProcess.stderr.on('data', (data) => {
    const error = data.toString();
    addLog('error', error);
    scrapingStatus.errors.push({
      time: new Date(),
      message: error
    });
    io.emit('error-occurred', { message: error });
  });
  
  scraperProcess.on('close', (code) => {
    scrapingStatus.isRunning = false;
    scrapingStatus.endTime = new Date();
    
    if (code === 0) {
      addLog('success', 'Scraping completed successfully');
      io.emit('scraping-complete', {
        success: true,
        stats: {
          total: scrapingStatus.totalCompanies,
          success: scrapingStatus.successCount,
          failed: scrapingStatus.failedCount,
          skipped: scrapingStatus.skippedCount,
          duration: scrapingStatus.endTime - scrapingStatus.startTime
        }
      });
    } else {
      addLog('error', `Scraping failed with code ${code}`);
      io.emit('scraping-complete', {
        success: false,
        error: `Process exited with code ${code}`
      });
    }
    
    scrapingSessions.delete('current');
    io.emit('status-update', scrapingStatus);
  });
}

// Handle events from scraper
function handleScraperEvent(event) {
  switch (event.type) {
    case 'progress':
      scrapingStatus.processedCompanies = event.processed;
      scrapingStatus.progress = (event.processed / scrapingStatus.totalCompanies) * 100;
      scrapingStatus.currentCompany = event.currentCompany;
      
      // Calculate speed and ETA
      const elapsed = Date.now() - scrapingStatus.startTime;
      const companiesPerMs = scrapingStatus.processedCompanies / elapsed;
      scrapingStatus.companiesPerMinute = Math.round(companiesPerMs * 60000);
      
      const remaining = scrapingStatus.totalCompanies - scrapingStatus.processedCompanies;
      scrapingStatus.estimatedTimeRemaining = remaining / companiesPerMs;
      
      io.emit('progress-update', {
        progress: scrapingStatus.progress,
        current: event.currentCompany,
        processed: event.processed,
        total: scrapingStatus.totalCompanies,
        companiesPerMinute: scrapingStatus.companiesPerMinute,
        eta: scrapingStatus.estimatedTimeRemaining
      });
      break;
      
    case 'success':
      scrapingStatus.successCount++;
      addLog('success', `Successfully scraped: ${event.company}`);
      io.emit('company-scraped', {
        status: 'success',
        company: event.company,
        data: event.data
      });
      break;
      
    case 'failed':
      scrapingStatus.failedCount++;
      scrapingStatus.errors.push({
        time: new Date(),
        company: event.company,
        error: event.error
      });
      addLog('error', `Failed to scrape ${event.company}: ${event.error}`);
      io.emit('company-scraped', {
        status: 'failed',
        company: event.company,
        error: event.error
      });
      break;
      
    case 'skipped':
      scrapingStatus.skippedCount++;
      addLog('info', `Skipped ${event.company}: already synced`);
      io.emit('company-scraped', {
        status: 'skipped',
        company: event.company
      });
      break;
      
    case 'status':
      Object.assign(scrapingStatus, event.data);
      io.emit('status-update', scrapingStatus);
      break;
  }
}

// Stop scraping
function stopScraping() {
  const process = scrapingSessions.get('current');
  if (process) {
    process.kill('SIGTERM');
    addLog('warn', 'Scraping stopped by user');
    io.emit('scraping-stopped');
  }
}

// Add log entry
function addLog(level, message) {
  const logEntry = {
    time: new Date(),
    level,
    message: message.trim()
  };
  
  scrapingStatus.logs.push(logEntry);
  
  // Keep only last 1000 logs
  if (scrapingStatus.logs.length > 1000) {
    scrapingStatus.logs.shift();
  }
  
  io.emit('log-entry', logEntry);
}

// Get recent logs from file
async function getRecentLogs() {
  try {
    const files = await fs.readdir(__dirname);
    const logFiles = files.filter(f => f.startsWith('scraping-log-'));
    
    if (logFiles.length === 0) return [];
    
    // Get most recent log file
    logFiles.sort().reverse();
    const latestLog = path.join(__dirname, logFiles[0]);
    const content = await fs.readFile(latestLog, 'utf-8');
    
    return content.split('\n')
      .filter(line => line.trim())
      .slice(-100) // Last 100 entries
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      });
  } catch (error) {
    console.error('Failed to read logs:', error);
    return [];
  }
}

// Get recent errors
async function getRecentErrors() {
  try {
    const files = await fs.readdir(__dirname);
    const errorFiles = files.filter(f => f.startsWith('errors-'));
    
    if (errorFiles.length === 0) return [];
    
    // Get most recent error file
    errorFiles.sort().reverse();
    const latestErrors = path.join(__dirname, errorFiles[0]);
    const content = await fs.readFile(latestErrors, 'utf-8');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read errors:', error);
    return [];
  }
}

// Get all activities from database
app.get('/api/activities', async (req, res) => {
  console.log('[API] Getting activities from database...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .order('code', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    console.log(`[API] Found ${activities.length} activities`);
    res.json(activities);
    
  } catch (error) {
    console.error('[API] Error getting activities:', error);
    res.status(500).json({ 
      error: 'Failed to get activities' 
    });
  }
});

// Get activity statistics
app.get('/api/activities/stats', async (req, res) => {
  console.log('[API] Getting activity statistics...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, parent_id, is_leaf');
    
    if (error) {
      throw error;
    }
    
    // Calculate statistics
    const stats = {
      total: activities.length,
      mainSectors: activities.filter(a => !a.parent_id).length,
      subSectors: activities.filter(a => a.parent_id && !a.is_leaf).length,
      leafActivities: activities.filter(a => a.is_leaf).length
    };
    
    console.log('[API] Activity stats:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('[API] Error getting activity stats:', error);
    res.status(500).json({ 
      error: 'Failed to get activity statistics' 
    });
  }
});

// Get company counts by activity category
app.get('/api/companies/count-by-activity', async (req, res) => {
  console.log('[API] Getting company counts by activity...');
  
  try {
    // Since we don't have boniteti companies data yet, return empty counts
    // This will show all categories with 0 companies (red highlighting)
    // Once we scrape companies from boniteti.me, we'll have real data
    
    console.log('[API] No boniteti companies scraped yet - returning empty counts');
    res.json({}); // Empty object means all categories have 0 companies
    
  } catch (error) {
    console.error('[API] Error getting company counts:', error);
    res.status(500).json({ 
      error: 'Failed to get company counts' 
    });
  }
});

// Apply changes endpoint - saves comparison results to database
app.post('/api/apply-changes', async (req, res) => {
  console.log('[API] Starting apply-changes endpoint...');
  const { comparison, stats } = req.body;
  
  if (!comparison || !stats) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing comparison or stats data' 
    });
  }
  
  try {
    // Use the dedicated apply-changes script
    const applyProcess = spawn('node', ['apply-changes.js'], {
      cwd: __dirname,
      env: { 
        ...process.env, 
        RETURN_JSON: 'true'
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    // Send the comparison data to the process via stdin
    applyProcess.stdin.write(JSON.stringify({ comparison, stats }));
    applyProcess.stdin.end();
    
    applyProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    applyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Emit progress messages to clients
      const message = data.toString();
      if (message.includes('[INFO]') || message.includes('[SUCCESS]') || message.includes('[ERROR]')) {
        io.emit('activities-log', { message });
      }
    });
    
    applyProcess.on('close', (code) => {
      console.log('[API] Apply process closed with code:', code);
      console.log('[API] Output:', output);
      console.log('[API] Error output:', errorOutput);
      
      if (code === 0 && output) {
        try {
          const result = JSON.parse(output);
          if (result.success) {
            console.log('[API] Changes applied successfully');
            io.emit('activities-log', { message: '[SUCCESS] Database synchronized successfully' });
            res.json({ 
              success: true, 
              message: 'Changes applied to database',
              stats: stats
            });
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        } catch (parseError) {
          console.error('[API] Failed to parse result:', parseError);
          res.status(500).json({ 
            success: false, 
            error: 'Failed to parse apply result' 
          });
        }
      } else {
        console.error('[API] Failed to apply changes');
        res.status(500).json({ 
          success: false, 
          error: 'Failed to apply changes to database' 
        });
      }
    });
    
    applyProcess.on('error', (error) => {
      console.error('[API] Process error:', error);
      res.status(500).json({ 
        success: false, 
        error: `Process error: ${error.message}` 
      });
    });
    
  } catch (error) {
    console.error('[API] Error in apply-changes:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get activity counts endpoint
app.get('/api/activity-counts', async (req, res) => {
  console.log('[API] Starting activity-counts endpoint...');
  
  try {
    const { spawn } = await import('child_process');
    
    const countProcess = spawn('node', ['get-activity-counts.js'], {
      cwd: __dirname,
      env: { 
        ...process.env, 
        RETURN_JSON: 'true'
      }
    });
    
    let output = '';
    let errorOutput = '';
    
    countProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    countProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      const message = data.toString();
      if (message.includes('Fetching counts') || message.includes('companies')) {
        io.emit('activity-count-progress', { message });
      }
    });
    
    countProcess.on('close', (code) => {
      console.log('[API] Count process closed with code:', code);
      
      if (code === 0 && output) {
        try {
          // Find the JSON in output
          const jsonMatch = output.match(/\{.*"categories".*\}/s);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (result.success) {
              console.log('[API] Successfully got activity counts');
              res.json(result);
            } else {
              throw new Error(result.error || 'Failed to get counts');
            }
          } else {
            throw new Error('No JSON found in output');
          }
        } catch (parseError) {
          console.error('[API] Failed to parse result:', parseError);
          res.status(500).json({ 
            success: false, 
            error: 'Failed to parse activity counts' 
          });
        }
      } else {
        console.error('[API] Failed to get activity counts');
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get activity counts' 
        });
      }
    });
    
  } catch (error) {
    console.error('[API] Error in activity-counts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Compare activities endpoint
app.post('/api/compare-activities', async (req, res) => {
  console.log('[API] Starting compare-activities endpoint...');
  
  try {
    const { spawn } = await import('child_process');
    console.log('[API] Spawning fetch-activities.js process...');
    console.log('[API] Environment variables present:', {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    });
    
    // Get session token from request body if available
    const { sessionToken } = req.body || {};
    
    const fetchProcess = spawn('node', ['fetch-activities.js'], {
      cwd: __dirname,
      env: { 
        ...process.env, 
        RETURN_JSON: 'true',
        EMIT_PROGRESS: '1',
        COMPARISON_ONLY: '1',  // Compare only, don't save to database yet
        BONITETI_SESSION: sessionToken || '',  // Pass existing session token
        SKIP_LOGIN: sessionToken ? '1' : '0'   // Skip login if we have session
      }
    });
    
    let output = '';
    let errorOutput = '';
    let jsonResult = null;
    
    fetchProcess.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[FETCH-STDOUT]: Got', text.length, 'bytes');
      output += text;
      
      // Don't try to parse until we have all the data
      io.emit('activities-log', { message: text });
    });
    
    fetchProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('[FETCH-STDERR]:', error);
      errorOutput += error;
      
      // Emit progress messages from stderr to clients
      if (error.includes('[INFO]') || error.includes('[SUCCESS]') || error.includes('[ERROR]') || error.includes('[WARN]')) {
        io.emit('activities-log', { message: error });
      }
    });
    
    fetchProcess.on('error', (error) => {
      console.error('[API] Process spawn error:', error);
      res.status(500).json({ success: false, error: `Failed to spawn process: ${error.message}` });
    });
    
    fetchProcess.on('close', (code) => {
      console.log('[API] Process closed with code:', code);
      console.log('[API] Total output length:', output.length);
      console.log('[API] Error output:', errorOutput);
      
      // Try to parse the complete output as JSON
      if (code === 0 && output) {
        try {
          jsonResult = JSON.parse(output.trim());
          console.log('[API] Successfully parsed JSON result');
        } catch (e) {
          console.log('[API] Failed to parse complete output as JSON:', e.message);
          // Try to find JSON in the output
          const jsonMatch = output.match(/\{.*"comparison".*\}/s);
          if (jsonMatch) {
            try {
              jsonResult = JSON.parse(jsonMatch[0]);
              console.log('[API] Found and parsed JSON from output');
            } catch (e2) {
              console.log('[API] Failed to parse extracted JSON:', e2.message);
            }
          }
        }
      }
      
      if (code === 0 && jsonResult) {
        console.log('[API] Sending JSON result with', 
          jsonResult.stats ? `${jsonResult.stats.total} activities` : 'unknown count');
        io.emit('activities-compare-complete', jsonResult);
        res.json(jsonResult);
      } else if (code === 0) {
        console.log('[API] Process succeeded without JSON result');
        io.emit('activities-complete', { success: true });
        res.json({ success: true, message: 'Activities fetched successfully' });
      } else {
        console.error('[API] Process failed with code:', code);
        console.error('[API] Full error output:', errorOutput);
        if (output.length < 1000) {
          console.error('[API] Full standard output:', output);
        }
        io.emit('activities-complete', { success: false, error: errorOutput || 'Process failed' });
        res.status(500).json({ success: false, error: errorOutput || 'Process failed' });
      }
    });
  } catch (error) {
    console.error('[API] Endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch activities endpoint (old, for compatibility)
app.post('/api/fetch-activities', async (req, res) => {
  // Redirect to compare endpoint
  req.url = '/api/compare-activities';
  app.handle(req, res);
});

// Get activities from database
app.get('/api/activities', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // First check if table exists, if not return empty array
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .order('code');
    
    if (error) {
      console.error('Error fetching activities:', error);
      // If table doesn't exist, return empty array
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    
    res.json(activities || []);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message, activities: [] });
  }
});

// Get activities statistics
app.get('/api/activities/stats', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*');
    
    if (error) {
      console.error('Error fetching activities:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return res.json({
          total: 0,
          mainSectors: 0,
          subSectors: 0,
          leafActivities: 0,
          byLevel: {}
        });
      }
      throw error;
    }
    
    const stats = {
      total: activities?.length || 0,
      mainSectors: activities?.filter(a => !a.parent_id).length || 0,
      subSectors: activities?.filter(a => a.parent_id && !a.is_leaf).length || 0,
      leafActivities: activities?.filter(a => a.is_leaf).length || 0,
      byLevel: {}
    };
    
    // Count by level
    activities?.forEach(activity => {
      const level = activity.level || 0;
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: error.message, 
      total: 0,
      mainSectors: 0,
      subSectors: 0,
      leafActivities: 0,
      byLevel: {}
    });
  }
});

// REST API endpoints
app.get('/api/status', (req, res) => {
  res.json(scrapingStatus);
});

app.post('/api/start', (req, res) => {
  if (scrapingStatus.isRunning) {
    return res.status(400).json({ error: 'Scraping already in progress' });
  }
  
  startScraping(req.body);
  res.json({ message: 'Scraping started' });
});

app.post('/api/stop', (req, res) => {
  stopScraping();
  res.json({ message: 'Stop signal sent' });
});

app.get('/api/logs', async (req, res) => {
  const logs = await getRecentLogs();
  res.json(logs);
});

app.get('/api/errors', async (req, res) => {
  const errors = await getRecentErrors();
  res.json(errors);
});

app.get('/api/stats', async (req, res) => {
  // Get statistics from database
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: companies, count } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    const { data: recentSync } = await supabase
      .from('sync_log')
      .select('*')
      .order('sync_date', { ascending: false })
      .limit(10);
    
    res.json({
      totalCompanies: count || 0,
      recentSyncs: recentSync || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React dashboard - 5 steps version
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-5steps.html'));
});

// Serve 4-step dashboard as alternative
app.get('/4steps', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard-stepper.html'));
});

// Serve old simple dashboard as alternative
app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Proxy endpoints for Boniteti to bypass CORS
app.post('/api/boniteti/login', async (req, res) => {
  console.log('[API] Boniteti login proxy request');
  
  try {
    const axios = (await import('axios')).default;
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }
    
    // Form data for login
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('rememberMe', 'true');
    
    // First, get initial cookies from the site
    const initialResponse = await axios.get('https://www.boniteti.me/advanced-search-company', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      }
    });
    
    const initialCookies = initialResponse.headers['set-cookie'] || [];
    const cookieString = initialCookies.map(c => c.split(';')[0]).join('; ');
    
    const response = await axios.post('https://www.boniteti.me/user/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Referer': 'https://www.boniteti.me/advanced-search-company',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookieString,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    // Extract cookies from response
    const loginCookies = response.headers['set-cookie'] || [];
    
    // Parse cookies into a map to avoid duplicates
    const cookieMap = new Map();
    
    // Add initial cookies
    initialCookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name] = nameValue.split('=');
      cookieMap.set(name, nameValue);
    });
    
    // Add/override with login cookies (newer ones take precedence)
    loginCookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name] = nameValue.split('=');
      cookieMap.set(name, nameValue);
    });
    
    // Build final cookie string without duplicates
    let sessionToken = Array.from(cookieMap.values()).join('; ');
    
    if (sessionToken) {
      console.log('[API] Session cookies extracted:', sessionToken);
    } else {
      console.log('[API] Warning: No cookies received from Boniteti login');
    }
    
    // Check if login actually succeeded
    if (response.status === 200 || response.status === 302) {
      console.log('[API] Boniteti login successful (status:', response.status, ')');
    } else {
      console.log('[API] Boniteti login may have failed (status:', response.status, ')');
    }
    
    res.json({ 
      success: true, 
      sessionToken,
      cookies: loginCookies // Return original cookies for debugging
    });
    
  } catch (error) {
    console.error('[API] Boniteti login error:', error.message);
    if (error.response) {
      console.error('[API] Response status:', error.response.status);
      console.error('[API] Response data:', error.response.data);
    }
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check Boniteti session status
app.post('/api/boniteti/check-session', async (req, res) => {
  console.log('[API] Boniteti session check proxy request');
  
  try {
    const axios = (await import('axios')).default;
    const { sessionToken } = req.body;
    
    if (!sessionToken) {
      return res.status(400).json({ 
        success: false, 
        active: false,
        error: 'No session token provided' 
      });
    }
    
    // Try to access a protected page to check if session is valid
    const response = await axios.get('https://www.boniteti.me/advanced-search-company', {
      headers: {
        'Cookie': sessionToken,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Referer': 'https://www.boniteti.me',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1'
      },
      maxRedirects: 0,
      validateStatus: (status) => true // Accept all status codes
    });
    
    // If we get 200, session is active
    // If we get 302 redirect to login, session is expired
    const isActive = response.status === 200;
    
    // Debug: Log location header if redirected
    if (response.status === 302) {
      console.log('[API] Redirect location:', response.headers.location);
    }
    
    console.log(`[API] Boniteti session check: ${isActive ? 'active' : 'inactive'} (status: ${response.status})`);
    
    res.json({ 
      success: true, 
      active: isActive,
      status: response.status
    });
    
  } catch (error) {
    console.error('[API] Boniteti session check error:', error.message);
    res.status(500).json({ 
      success: false, 
      active: false,
      error: error.message 
    });
  }
});

// Proxy for Boniteti API calls
app.post('/api/boniteti/proxy', async (req, res) => {
  console.log('[API] Boniteti proxy request');
  
  try {
    const axios = (await import('axios')).default;
    const { endpoint, method = 'GET', data, sessionToken } = req.body;
    
    if (!endpoint || !sessionToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Endpoint and session token required' 
      });
    }
    
    const config = {
      method,
      url: `https://www.boniteti.me${endpoint}`,
      headers: {
        'Cookie': sessionToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.boniteti.me/advanced-search-company'
      }
    };
    
    if (method === 'POST' && data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const response = await axios(config);
    
    console.log(`[API] Boniteti proxy success: ${endpoint}`);
    res.json({ 
      success: true, 
      data: response.data
    });
    
  } catch (error) {
    console.error('[API] Boniteti proxy error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3456;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   🚀 Boniteti Scraper Dashboard           ║
║                                            ║
║   Server: http://localhost:${PORT}         ║
║   Dashboard: http://localhost:${PORT}      ║
║                                            ║
║   WebSocket: Connected ✓                  ║
║   API: Ready ✓                            ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});