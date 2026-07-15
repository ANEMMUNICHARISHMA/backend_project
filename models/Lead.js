import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  /**
   * The full name of the lead.
   */
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minLength: [2, 'Name must be at least 2 characters long'],
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  /**
   * The company the lead belongs to.
   */
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true
  },
  /**
   * The email address of the lead.
   */
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email must be a valid email address']
  },
  /**
   * The phone number of the lead.
   */
  phone: {
    type: String,
    trim: true
  },
  /**
   * The current status of the lead in the sales pipeline.
   */
  status: {
    type: String,
    enum: {
      values: ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'],
      message: '{VALUE} is not a valid status'
    },
    default: 'New'
  },
  /**
   * The source from which this lead was acquired.
   */
  source: {
    type: String,
    enum: {
      values: ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'],
      message: '{VALUE} is not a valid source'
    },
    default: 'Website'
  },
  /**
   * Any additional notes or context regarding the lead.
   */
  notes: {
    type: String,
    maxLength: [1000, 'Notes cannot exceed 1000 characters']
  },
  /**
   * The user who created or is assigned to this lead.
   */
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for age (in days)
leadSchema.virtual('age').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Indexes
leadSchema.index({ owner: 1, status: 1 });
leadSchema.index({ owner: 1, createdAt: -1 }); // Fast sorting for getLeads
leadSchema.index({ owner: 1, source: 1 }); // Filtering by source
leadSchema.index({ owner: 1, name: 1, company: 1, email: 1 }); // Regex search support
leadSchema.index({ email: 1 });

const Lead = mongoose.model('Lead', leadSchema);

export { leadSchema, Lead };
export default Lead;
