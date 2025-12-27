const { google } = require('googleapis');
const oauth2Client = require('../config/google');

exports.getAuthUrl = () =>
  oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.readonly']
  });

exports.getUserFromCode = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.v2.me.get();
  return data;
};


