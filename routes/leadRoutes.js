import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getLeads,
  createLead,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  getMonthlyStats,
  searchLeads
} from '../controllers/leadController.js';

const router = Router();

const VALID_STATUSES = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'];
const VALID_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'];

// Validation rules for creating or updating a lead
const leadValidation = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('company').notEmpty().withMessage('Company is required'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('status').optional().isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('source').optional().isIn(VALID_SOURCES).withMessage(`Source must be one of: ${VALID_SOURCES.join(', ')}`)
];

// Apply protect middleware to ALL routes in this file
router.use(protect);

// -----------------------------------------------------
// Stats endpoints MUST be defined before /:id routes
// to avoid 'stats' being interpreted as a lead ID
// -----------------------------------------------------
router.get('/stats/summary', getLeadStats);
router.get('/stats/monthly', getMonthlyStats);

// -----------------------------------------------------
// Search endpoint MUST be defined before /:id routes
// -----------------------------------------------------
router.get('/search', searchLeads);

// -----------------------------------------------------
// Standard CRUD endpoints
// -----------------------------------------------------
router.route('/')
  .get(getLeads)
  .post(validate(leadValidation), createLead);

router.route('/:id')
  .get(getLeadById)
  .put(validate(leadValidation), updateLead)
  .delete(deleteLead);

// Endpoint specifically for updating status (e.g. drag & drop on Kanban)
router.patch('/:id/status', updateLeadStatus);

export default router;
