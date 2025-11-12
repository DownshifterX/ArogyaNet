const mongoose = require('mongoose');
require("dotenv").config()

const MONGO_URL = process.env.MONGODB_URI;

mongoose.connect(MONGO_URL)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));
