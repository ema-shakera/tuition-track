const mongoose = require("mongoose");

const connectToDatabase = async (mongoUri) => {
  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
};

const disconnectFromDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
};
