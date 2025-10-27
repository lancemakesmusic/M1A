// Import and re-export all functions
const { generateContentWithGPT } = require('./ai/gptContentGenerator');
const { autoSchedule } = require('./autoSchedule');

// Export all functions
module.exports = {
  generateContentWithGPT,
  autoSchedule
};
