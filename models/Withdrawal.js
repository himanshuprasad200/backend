const withdrawalSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  payoutId: String,         // Razorpay payout id
  requestedAt: Date,
  processedAt: Date,
});