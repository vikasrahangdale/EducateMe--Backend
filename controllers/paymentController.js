const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ✅ Create Order
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Convert to paise
    const options = {
      amount: Number(amount) * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};

// ✅ Verify Payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      res.json({ success: true, message: 'Payment verified successfully!' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};
