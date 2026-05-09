const mongoose = require('mongoose');
const User = require('./src/models/User');
mongoose.connect('mongodb://127.0.0.1:27017/expense-tracker').then(async () => {
  const rohit = await User.findOne({ phone: '41034251808832' });
  if (rohit) {
    rohit.phone = '918307706276';
    rohit.jid = '41034251808832@lid';
    await rohit.save();
    console.log('Fixed Rohit');
  }

  const others = await User.find({ phone: { $ne: '918307706276' } });
  for (const u of others) {
    if (u.phone.length > 13 && !u.jid) {
      u.jid = u.phone + '@lid';
      await u.save();
      console.log('Set JID for', u.name);
    }
  }

  process.exit(0);
});
