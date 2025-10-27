#!/usr/bin/env node
/**
 * M1A AutoPoster API Server
 * Simple Node.js server for React Native integration
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// In-memory storage
let scheduledPosts = [];
let mediaLibrary = [
    {
        id: "1",
        name: "Sample Image 1",
        url: "https://via.placeholder.com/300x300/007AFF/FFFFFF?text=Sample+1",
        type: "image",
        createdAt: new Date().toISOString()
    },
    {
        id: "2",
        name: "Sample Video 1", 
        url: "https://via.placeholder.com/300x300/34C759/FFFFFF?text=Video+1",
        type: "video",
        createdAt: new Date().toISOString()
    }
];
let autoPosterStatus = { enabled: false };

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
};

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, corsHeaders);
    res.end(JSON.stringify(data));
}

// Helper function to parse JSON body
function parseJSONBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            callback(null, data);
        } catch (error) {
            callback(error, null);
        }
    });
}

// API Routes
const routes = {
    'GET /': (req, res) => {
        sendJSON(res, 200, {
            message: "M1A AutoPoster API is running!",
            version: "1.0.0",
            status: "operational"
        });
    },

    'GET /api/health': (req, res) => {
        sendJSON(res, 200, {
            status: "healthy",
            timestamp: new Date().toISOString(),
            server: "operational",
            posts_count: scheduledPosts.length,
            auto_poster_enabled: autoPosterStatus.enabled
        });
    },

    'POST /api/generate-content': (req, res) => {
        parseJSONBody(req, (err, data) => {
            if (err) {
                sendJSON(res, 400, {
                    success: false,
                    message: "Invalid JSON data"
                });
                return;
            }

            const { prompt, content_type, platform, brand_voice, target_audience } = data;
            
            const generatedContent = `
🎯 **${content_type.charAt(0).toUpperCase() + content_type.slice(1)} for ${platform.charAt(0).toUpperCase() + platform.slice(1)}**

**Prompt:** ${prompt}

**Brand Voice:** ${brand_voice}
**Target Audience:** ${target_audience}

**Generated Content:**
This is a professionally generated post based on your prompt. The content is optimized for ${platform} and tailored for your ${target_audience} audience with a ${brand_voice} tone.

Key points covered:
• Engaging hook that captures attention
• Clear value proposition  
• Call-to-action that drives engagement
• Relevant hashtags for maximum reach

#content #socialmedia #automation #m1a
            `.trim();

            sendJSON(res, 200, {
                success: true,
                content: generatedContent,
                message: "Content generated successfully"
            });
        });
    },

    'POST /api/schedule-post': (req, res) => {
        parseJSONBody(req, (err, data) => {
            if (err) {
                sendJSON(res, 400, {
                    success: false,
                    message: "Invalid JSON data"
                });
                return;
            }

            const postId = Date.now().toString();
            const post = {
                id: postId,
                ...data
            };
            scheduledPosts.push(post);

            sendJSON(res, 200, {
                success: true,
                postId: postId,
                message: "Post scheduled successfully"
            });
        });
    },

    'GET /api/scheduled-posts': (req, res) => {
        sendJSON(res, 200, {
            success: true,
            posts: scheduledPosts,
            message: "Scheduled posts retrieved successfully"
        });
    },

    'GET /api/media-library': (req, res) => {
        sendJSON(res, 200, {
            success: true,
            media: mediaLibrary,
            message: "Media library retrieved successfully"
        });
    },

    'GET /api/auto-poster-status': (req, res) => {
        sendJSON(res, 200, {
            success: true,
            enabled: autoPosterStatus.enabled,
            message: "Auto poster status retrieved successfully"
        });
    },

    'POST /api/toggle-auto-poster': (req, res) => {
        parseJSONBody(req, (err, data) => {
            if (err) {
                sendJSON(res, 400, {
                    success: false,
                    message: "Invalid JSON data"
                });
                return;
            }

            const enabled = data.enabled || false;
            autoPosterStatus.enabled = enabled;

            sendJSON(res, 200, {
                success: true,
                enabled: enabled,
                message: `Auto poster ${enabled ? 'enabled' : 'disabled'} successfully`
            });
        });
    },

    'GET /api/analytics': (req, res) => {
        const analytics = {
            totalPosts: scheduledPosts.length,
            activePosts: scheduledPosts.filter(p => p.status === 'scheduled').length,
            completedPosts: scheduledPosts.filter(p => p.status === 'completed').length,
            autoPosterEnabled: autoPosterStatus.enabled,
            mediaCount: mediaLibrary.length
        };
        
        sendJSON(res, 200, {
            success: true,
            analytics: analytics
        });
    },

    'GET /api/platform-settings': (req, res) => {
        const settings = {
            instagram: { enabled: true, connected: false, name: "Instagram" },
            facebook: { enabled: true, connected: false, name: "Facebook" },
            twitter: { enabled: true, connected: false, name: "Twitter" }
        };
        
        sendJSON(res, 200, {
            success: true,
            settings: settings
        });
    }
};

// Server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const route = `${method} ${path}`;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }

    // Route handling
    if (routes[route]) {
        routes[route](req, res);
    } else {
        sendJSON(res, 404, {
            error: "Not found",
            available_routes: Object.keys(routes)
        });
    }
});

const PORT = 8001;

server.listen(PORT, () => {
    console.log('🚀 M1A AutoPoster API Server running!');
    console.log(`📱 API available at: http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log('Press Ctrl+C to stop the server');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Trying port ${PORT + 1}`);
        server.listen(PORT + 1);
    } else {
        console.error('❌ Server error:', err);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped');
    process.exit(0);
});
