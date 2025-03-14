// Import necessary Cloudflare Workers modules
import { Router } from 'itty-router';

// Create a new router
const router = Router();

// Study Timeline Constants
const STUDY_START = new Date(2024, 7, 24); // August 24, 2024
const INICET_DATE = new Date(2025, 4, 17); // May 17, 2025 (updated)
const NEET_PG_DATE = new Date(2025, 5, 15); // June 15, 2025

// Updated Milestones
const MILESTONES = [
  { date: new Date(2025, 2, 20), text: '1st Revision' }, // March 19, 2025
  { date: new Date(2025, 4, 14), text: '2nd Revision' }, // May 14, 2025
  { date: new Date(2025, 5, 9), text: 'Final Revision' } // June 9, 2025
];

// Gotify notification function
async function sendGotifyNotification(stats) {
  // Use the environment variables from wrangler.toml
  const GOTIFY_URL = GOTIFY_URL || 'http://68.233.115.164:6940';
  const GOTIFY_TOKEN = GOTIFY_TOKEN || 'A9Y55xTVo1QZNUt';
  
  const message = {
    title: `Study Progress Update - ${stats.days_passed} Days Gone`,
    message: `INICET: ${stats.days_to_inicet} days left (${stats.inicet_progress}%)\nNEET PG: ${stats.days_to_neet} days left (${stats.neet_progress}%)`,
    priority: 8 // High priority
  };
  
  try {
    const response = await fetch(`${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Gotify notification failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending Gotify notification:', error);
    return false;
  }
}

// Calculate milestone positions for the progress bar
function calculateMilestonePositions() {
  const totalDuration = (NEET_PG_DATE - STUDY_START) / 1000; // in seconds
  const now = new Date();
  
  return MILESTONES.map(milestone => {
    const timeUntilMilestone = (milestone.date - STUDY_START) / 1000;
    const position = (timeUntilMilestone / totalDuration) * 100;
    const status = now > milestone.date ? 'completed' : 'upcoming';
    
    return {
      text: milestone.text,
      position: position,
      status: status
    };
  });
}

// Calculate all study statistics
function calculateStats() {
  const now = new Date();
  const daysPassed = Math.floor((now - STUDY_START) / (1000 * 60 * 60 * 24));
  
  // Check if exams are completed
  const inicetCompleted = now > INICET_DATE;
  const neetCompleted = now > NEET_PG_DATE;
  
  // Calculate days to exams (don't go negative)
  const daysToInicet = inicetCompleted ? 0 : Math.max(0, Math.floor((INICET_DATE - now) / (1000 * 60 * 60 * 24)));
  const daysToNeet = neetCompleted ? 0 : Math.max(0, Math.floor((NEET_PG_DATE - now) / (1000 * 60 * 60 * 24)));
  
  // Calculate days to milestones (don't go negative)
  const milestoneStatus = MILESTONES.map(milestone => now > milestone.date);
  const daysToFirstRevision = milestoneStatus[0] ? 0 : Math.max(0, Math.floor((MILESTONES[0].date - now) / (1000 * 60 * 60 * 24)));
  const daysToSecondRevision = milestoneStatus[1] ? 0 : Math.max(0, Math.floor((MILESTONES[1].date - now) / (1000 * 60 * 60 * 24)));
  const daysToFinalRevision = milestoneStatus[2] ? 0 : Math.max(0, Math.floor((MILESTONES[2].date - now) / (1000 * 60 * 60 * 24)));
  
  // Calculate progress percentages
  const totalDaysInicet = Math.floor((INICET_DATE - STUDY_START) / (1000 * 60 * 60 * 24));
  const totalDaysNeet = Math.floor((NEET_PG_DATE - STUDY_START) / (1000 * 60 * 60 * 24));
  
  const inicetProgress = inicetCompleted ? 100 : Math.min(100, (daysPassed / totalDaysInicet) * 100);
  const neetProgress = neetCompleted ? 100 : Math.min(100, (daysPassed / totalDaysNeet) * 100);
  
  return {
    current_time: now.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST',
    days_passed: daysPassed,
    days_to_inicet: daysToInicet,
    days_to_neet: daysToNeet,
    days_to_first_revision: daysToFirstRevision,
    days_to_second_revision: daysToSecondRevision,
    days_to_final_revision: daysToFinalRevision,
    inicet_progress: Math.round(inicetProgress * 10) / 10,
    neet_progress: Math.round(neetProgress * 10) / 10,
    milestones: calculateMilestonePositions(),
    inicet_completed: inicetCompleted,
    neet_completed: neetCompleted,
    milestone_1_completed: milestoneStatus[0],
    milestone_2_completed: milestoneStatus[1],
    milestone_3_completed: milestoneStatus[2]
  };
}

// Main route to serve the HTML
router.get('/', async () => {
  const stats = calculateStats();
  
  return new Response(renderHTML(stats), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
});

// Route to trigger Gotify notification
router.get('/notify', async () => {
  const stats = calculateStats();
  const success = await sendGotifyNotification(stats);
  
  return new Response(JSON.stringify({ success }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});

// Function to render the HTML
function renderHTML(stats) {
  // Generate exam status HTML based on completion
  const inicetStatusHTML = stats.inicet_completed 
    ? `<div class="completed-badge">COMPLETED!</div>` 
    : `<div class="days-number inicet">${stats.days_to_inicet}</div><div class="exam-label">Days Until INICET</div>`;
  
  const neetStatusHTML = stats.neet_completed 
    ? `<div class="completed-badge">COMPLETED!</div>` 
    : `<div class="days-number neet">${stats.days_to_neet}</div><div class="exam-label">Days Until NEET PG</div>`;
  
  // Generate milestone status for stat cards
  const milestone1Status = stats.milestone_1_completed 
    ? `<div class="status-completed">COMPLETED</div>` 
    : `<div class="stat-value">${stats.days_to_first_revision}</div>`;
  
  const milestone2Status = stats.milestone_2_completed 
    ? `<div class="status-completed">COMPLETED</div>` 
    : `<div class="stat-value">${stats.days_to_second_revision}</div>`;
  
  const milestone3Status = stats.milestone_3_completed 
    ? `<div class="status-completed">COMPLETED</div>` 
    : `<div class="stat-value">${stats.days_to_final_revision}</div>`;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Exam Countdown</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #FF6B6B;
            --secondary: #4ECDC4;
            --dark: #1A535C;
            --light: #F7FFF7;
            --warning: #FFE66D;
            --accent: #6B48FF;
            --success: #2ecc71;
        }
        
        body {
            font-family: 'Montserrat', sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            color: var(--dark);
            line-height: 1.6;
        }
        
        .container {
            background: linear-gradient(135deg, #ffffff 0%, #f7f7f7 100%);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            border: 1px solid rgba(255,255,255,0.7);
        }
        
        .main-quote {
            text-align: center;
            font-size: 28px;
            font-weight: 900;
            margin: 20px 0 30px;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            background: linear-gradient(to right, var(--primary), var(--accent));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .warning-text {
            text-align: center;
            color: #FF6347;
            font-weight: 600;
            margin: 20px 0;
            font-size: 18px;
            padding: 10px;
            background: rgba(255, 99, 71, 0.05);
            border-radius: 10px;
            line-height: 1.5;
        }
        
        .countdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
        }
        
        .countdown-box {
            text-align: center;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
        }
        
        .countdown-box:hover {
            transform: translateY(-5px);
        }
        
        .countdown-box.inicet {
            background: linear-gradient(135deg, #ff6b6b22 0%, #ff6b6b11 100%);
            border: 2px solid var(--primary);
        }
        
        .countdown-box.neet {
            background: linear-gradient(135deg, #4ecdc422 0%, #4ecdc411 100%);
            border: 2px solid var(--secondary);
        }
        
        .days-number {
            font-size: 64px;
            font-weight: 900;
            margin: 10px 0;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .days-number.inicet {
            color: var(--primary);
        }
        
        .days-number.neet {
            color: var(--secondary);
        }
        
        .completed-badge {
            font-size: 38px;
            font-weight: 900;
            color: var(--success);
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            animation: glow 2s infinite alternate;
        }
        
        @keyframes glow {
            from {
                text-shadow: 0 0 5px rgba(46, 204, 113, 0.5);
            }
            to {
                text-shadow: 0 0 20px rgba(46, 204, 113, 0.8);
            }
        }
        
        .exam-label {
            font-size: 20px;
            font-weight: 700;
            margin-top: 10px;
            position: relative;
            z-index: 1;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 30px 0;
        }
        
        .stat-card {
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 8px 16px rgba(0,0,0,0.05);
            background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(247,247,247,0.8) 100%);
            border: 1px solid rgba(230,230,230,0.8);
            position: relative;
        }
        
        .stat-card:hover {
            transform: translateY(-7px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.08);
        }
        
        .stat-card h3 {
            font-weight: 700;
            margin-bottom: 15px;
            color: var(--dark);
            font-size: 18px;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: 800;
            color: var(--accent);
            margin: 10px 0;
        }
        
        .status-completed {
            font-size: 24px;
            font-weight: 700;
            color: var(--success);
            margin: 15px 0;
            position: relative;
        }
        
        .status-completed:after {
            content: "✓";
            display: inline-block;
            margin-left: 5px;
            font-size: 22px;
        }
        
        .progress-container {
            margin: 35px 0;
        }
        
        .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .progress-bar {
            width: 100%;
            height: 30px;
            background-color: #f0f0f0;
            border-radius: 15px;
            margin: 15px 0;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .progress-fill {
            height: 100%;
            transition: width 1s ease-in-out;
            position: absolute;
            top: 0;
            border-radius: 15px;
        }
        
        .progress-fill.inicet {
            background: linear-gradient(to right, var(--primary), #ff9e9e);
            opacity: 0.7;
            z-index: 1;
        }
        
        .progress-fill.neet {
            background: linear-gradient(to right, var(--secondary), #8af1eb);
            opacity: 0.7;
            z-index: 2;
        }
        
        .milestone {
            position: absolute;
            width: 3px;
            height: 100%;
            background-color: var(--dark);
            z-index: 3;
            opacity: 0.7;
        }
        
        .milestone.completed:after {
            background-color: var(--success);
        }
        
        .milestone:after {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            background-color: var(--dark);
            border-radius: 50%;
            top: -6px;
            left: -5px;
        }
        
        .milestone-label {
            position: absolute;
            font-size: 12px;
            font-weight: 600;
            transform: translate(-50%, -140%);
            padding: 5px 10px;
            background-color: var(--dark);
            color: white;
            border-radius: 5px;
            white-space: nowrap;
            z-index: 4;
        }
        
        .milestone-label.completed {
            background-color: var(--success);
        }
        
        .milestone-label:after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid var(--dark);
        }
        
        .milestone-label.completed:after {
            border-top: 5px solid var(--success);
        }
        
        .days-counter {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, var(--light) 0%, #e8f7e8 100%);
            border-radius: 15px;
            margin: 30px 0;
            position: relative;
            box-shadow: 0 10px 20px rgba(0,0,0,0.05);
            border: 1px solid rgba(230,230,230,0.8);
        }
        
        .days-counter h1 {
            font-size: 36px;
            font-weight: 900;
            margin: 0;
            background: linear-gradient(to right, var(--dark), var(--accent));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .last-updated {
            text-align: center;
            color: #888;
            margin-top: 30px;
            font-size: 0.9em;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .countdown-grid {
                grid-template-columns: 1fr;
            }
            
            .days-number {
                font-size: 48px;
            }
            
            .main-quote {
                font-size: 24px;
            }
        }
        
        /* Pulsating animation for days counter */
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-quote pulse">APNA TIME APUN KHUD LAYEGA</div>
        
        <div class="days-counter">
            <h1>${stats.days_passed} Days Gone. Keep Pushing!</h1>
        </div>
        
        <p class="warning-text">
            YouTube, Twitter, Website, CODE, Engineering almost destroyed you and your career.<br>
            <span style="font-size: 20px; display: block; margin-top: 10px;">Lost 1 year already, Don't F*&%king Give it Away again</span>
        </p>
        
        <div class="countdown-grid">
            <div class="countdown-box inicet">
                ${inicetStatusHTML}
            </div>
            <div class="countdown-box neet">
                ${neetStatusHTML}
            </div>
        </div>
        
        <div class="progress-container">
            <div class="progress-label">
                <span>Overall Progress</span>
                <span>INICET: ${stats.inicet_progress}% | NEET PG: ${stats.neet_progress}%</span>
            </div>
            <div class="progress-bar">
                ${!stats.inicet_completed ? `<div class="progress-fill inicet" style="width: ${stats.inicet_progress}%;"></div>` : ''}
                <div class="progress-fill neet" style="width: ${stats.neet_progress}%;"></div>
                ${stats.milestones.map(milestone => `
                    <div class="milestone ${milestone.status === 'completed' ? 'completed' : ''}" style="left: ${milestone.position}%;">
                        <span class="milestone-label ${milestone.status === 'completed' ? 'completed' : ''}">${milestone.text}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Days to 1st Revision</h3>
                ${milestone1Status}
            </div>
            <div class="stat-card">
                <h3>Days to 2nd Revision</h3>
                ${milestone2Status}
            </div>
            <div class="stat-card">
                <h3>Days to Final Revision</h3>
                ${milestone3Status}
            </div>
        </div>
        
        <p class="last-updated">Last updated: ${stats.current_time}</p>
    </div>
    
    <script>
        // Auto refresh every hour
        setTimeout(() => {
            window.location.reload();
        }, 3600000);
        
        // Schedule notifications at 8 AM and 6 PM IST
        function scheduleNotification(hour, minute) {
            const now = new Date();
            const scheduledTime = new Date(now);
            scheduledTime.setUTCHours(hour + 5, minute + 30, 0); // Convert IST to UTC
            
            if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }
            
            const timeoutMillis = scheduledTime - now;
            
            setTimeout(() => {
                fetch('/notify')
                    .then(response => response.json())
                    .then(data => {
                        console.log('Notification sent:', data);
                        // Schedule next notification for the same time tomorrow
                        setTimeout(() => scheduleNotification(hour, minute), 24 * 60 * 60 * 1000);
                    })
                    .catch(error => {
                        console.error('Error sending notification:', error);
                        // Retry after 10 minutes in case of failure
                        setTimeout(() => scheduleNotification(hour, minute), 10 * 60 * 1000);
                    });
            }, timeoutMillis);
        }
        
        // Schedule notifications
        scheduleNotification(8, 0);  // 8:00 AM IST
        scheduleNotification(18, 0); // 6:00 PM IST
    </script>
</body>
</html>
  `;
}

// Handle all requests
addEventListener('fetch', event => {
  event.respondWith(router.handle(event.request));
});
