import './env.js';
// Imported before anything that loads config/env.js (ES imports are hoisted, so assignments in a test body are too late).
process.env.RAZORPAY_KEY_ID = 'rzp_test_unit';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-razorpay-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';
