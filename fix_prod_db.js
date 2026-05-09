require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const uri = process.env.MONGO_URI;
console.log('Connecting to:', uri);

mongoose.connect(uri).then(async () => {
  const rohit = await User.findOne({ phone: '41034251808832' });
  if (rohit) {
    rohit.phone = '918307706276';
    rohit.jid = '41034251808832@lid';
    await rohit.save();
    console.log('Fixed Rohit in PROD DB');
  } else {
    console.log('Rohit LID not found. Maybe already fixed?');
  }

  const others = await User.find({ phone: { $ne: '918307706276' } });
  for (const u of others) {
    if (u.phone && u.phone.length > 13 && !u.jid) {
      u.jid = u.phone + '@lid';
      await u.save();
      console.log('Set JID for', u.name, 'in PROD DB');
    }
  }

  process.exit(0);
}).catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
