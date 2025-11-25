const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/paymentRoutes');
const connectDB = require('./config/db');
const bookingRoutes  = require ("./routes/bookingRoutes.js");

const app = express();
app.use(express.json());

connectDB();

app.use(cors({
  origin: [
    // "http://localhost:8080",
    // "http://192.168.1.4:8080",
     "http://localhost:5173",
     "https://educate-me.in"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}));


app.use('/api/payments', paymentRoutes);
app.use('/user', require('./routes/userRoute'));

app.use('/admin', require('./routes/adminRoutes'));


app.use('/user/ug-applications', require('./routes/ugApplications'));
app.use('/user/pg-applications', require('./routes/pgApplications'));

app.use("/booking", bookingRoutes);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

module.exports = app;
