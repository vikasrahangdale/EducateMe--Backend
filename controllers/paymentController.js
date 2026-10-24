const razorpay = require('../utils/razorpay');
const crypto = require('crypto');

// ✅ Create Order
exports.createOrder = async (req, res) => {
  try {
    let { amount } = req.body;

    // Validate and parse amount
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be a positive number.'
      });
    }

    const platformCharge = 10;
    const finalAmount = amount + platformCharge;

    const options = {
      amount: Math.round(finalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      platformCharge,
      payableAmount: finalAmount,
      order
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// ✅ Verify Payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac('sha256', secret)
      .update(sign)
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      res.json({ 
        success: true, 
        message: 'Payment verified successfully!',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid signature. Payment verification failed.' 
      });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
