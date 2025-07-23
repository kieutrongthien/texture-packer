require('dotenv').config();
const builder = require('electron-builder');

builder.build({
  publish: 'always',
}).then(() => {
  console.log('Build and publish complete.');
}).catch((error) => {
  console.error('Error during build:', error);
});