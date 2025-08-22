#!/usr/bin/env node

// Simple script to test API routes locally
const { spawn } = require('child_process');

async function testApiRoutes() {
  console.log('🚀 Testing API routes locally...\n');

  // Start the Next.js dev server
  const serverProcess = spawn('bun', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  // Wait for server to start
  await new Promise((resolve) => {
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Ready in')) {
        console.log('✅ Server started successfully\n');
        resolve();
      }
    });
  });

  // Test API routes
  const testRoutes = [
    '/api/test',
    '/api/health'
  ];

  for (const route of testRoutes) {
    try {
      console.log(`Testing ${route}...`);
      const response = await fetch(`http://localhost:3000${route}`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${route}: Status ${response.status}`);
        console.log(`   Message: ${data.message || 'No message'}`);
      } else {
        console.log(`❌ ${route}: Status ${response.status}`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${route}: Failed to connect`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }

  // Kill the server
  serverProcess.kill();
  console.log('🛑 Test completed\n');
}

if (require.main === module) {
  testApiRoutes().catch(console.error);
}
