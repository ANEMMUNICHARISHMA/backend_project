import Lead from '../models/Lead.js';

/**
 * Valid Lead Statuses and Sources (can be imported from the Model in a real app)
 */
const VALID_STATUSES = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'];
const VALID_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Other'];

/**
 * @desc    Get all leads with pagination, filtering, and sorting
 * @route   GET /api/leads
 * @access  Private (Owner only)
 * 
 * Inputs: req.query (status, search, page, limit, sortBy, sortOrder, source, dateFrom, dateTo)
 * Outputs: Paginated list of leads
 * Side effects: None
 */
export const getLeads = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', source, dateFrom, dateTo } = req.query;
    
    // Build filter object, isolating to current user
    const filter = { owner: req.user._id };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex }
      ];
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute queries
    const leads = await Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);


    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new lead
 * @route   POST /api/leads
 * @access  Private
 * 
 * Inputs: req.body (name, company, email, phone, status, source, value, notes, etc)
 * Outputs: Created Lead object
 * Side effects: Creates document in DB
 */
export const createLead = async (req, res, next) => {
  try {
    const body = req.body;
    
    // Create lead with the current user as owner
    const lead = await Lead.create({
      ...body,
      owner: req.user._id
    });


    return res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single lead by ID
 * @route   GET /api/leads/:id
 * @access  Private (Owner only)
 * 
 * Inputs: req.params.id
 * Outputs: Lead object
 * Side effects: None
 */
export const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update lead details
 * @route   PUT /api/leads/:id
 * @access  Private (Owner only)
 * 
 * Inputs: req.params.id, req.body
 * Outputs: Updated Lead object
 * Side effects: Modifies document in DB
 */
export const updateLead = async (req, res, next) => {
  try {
    const body = { ...req.body };
    
    // Do NOT allow changing the owner field
    if (body.owner) {
      delete body.owner;
    }

    let lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Update using findOneAndUpdate to apply runValidators
    lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      body,
      { new: true, runValidators: true }
    );


    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update only lead status
 * @route   PATCH /api/leads/:id/status
 * @access  Private (Owner only)
 * 
 * Inputs: req.params.id, req.body.status
 * Outputs: Updated Lead object
 * Side effects: Modifies document status in DB
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }


    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a lead
 * @route   DELETE /api/leads/:id
 * @access  Private (Owner only)
 * 
 * Inputs: req.params.id
 * Outputs: Success message
 * Side effects: Deletes document from DB
 */
export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await lead.deleteOne();


    return res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate stats for dashboard
 * @route   GET /api/leads/stats/summary
 * @access  Private (Owner only)
 * 
 * Inputs: req.user._id
 * Outputs: Aggregate stats object
 * Side effects: None
 */
export const getLeadStats = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Current month boundaries
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Last month boundaries
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const pipeline = [
      { $match: { owner: req.user._id } },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          statusStats: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          sourceStats: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
          timeStats: [
            {
              $group: {
                _id: null,
                thisMonth: {
                  $sum: { $cond: [{ $gte: ['$createdAt', startOfThisMonth] }, 1, 0] }
                },
                lastMonth: {
                  $sum: { 
                    $cond: [
                      { $and: [
                        { $gte: ['$createdAt', startOfLastMonth] },
                        { $lte: ['$createdAt', endOfLastMonth] }
                      ]}, 1, 0
                    ] 
                  }
                }
              }
            }
          ]
        }
      }
    ];

    const results = await Lead.aggregate(pipeline);
    const data = results[0];

    const totalLeads = data.totalCount.length > 0 ? data.totalCount[0].count : 0;
    
    const statusBreakdown = {};
    let wonLeads = 0;
    data.statusStats.forEach(stat => {
      statusBreakdown[stat._id] = stat.count;
      if (stat._id === 'Won') wonLeads = stat.count;
    });

    const sourceBreakdown = {};
    data.sourceStats.forEach(stat => {
      sourceBreakdown[stat._id] = stat.count;
    });

    const timeData = data.timeStats.length > 0 ? data.timeStats[0] : { thisMonth: 0, lastMonth: 0 };
    const thisMonthLeads = timeData.thisMonth;
    const lastMonthLeads = timeData.lastMonth;

    let growthRate = 0;
    if (lastMonthLeads > 0) {
      growthRate = ((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100;
    } else if (thisMonthLeads > 0) {
      growthRate = 100;
    }

    const conversionRate = totalLeads > 0 ? parseFloat(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        statusBreakdown,
        conversionRate,
        sourceBreakdown,
        thisMonthLeads,
        lastMonthLeads,
        growthRate: parseFloat(growthRate.toFixed(1))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly lead stats for charts
 * @route   GET /api/leads/stats/monthly
 * @access  Private (Owner only)
 * 
 * Inputs: req.user._id
 * Outputs: Array of monthly stats for last 6 months
 * Side effects: None
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    const now = new Date();
    // Generate dates for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const pipeline = [
      {
        $match: { 
          owner: req.user._id,
          createdAt: { $gte: sixMonthsAgo } 
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ];

    const results = await Lead.aggregate(pipeline);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Map results to easily look up by year-month string
    const resultMap = {};
    results.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      const convRate = item.total > 0 ? parseFloat(((item.won / item.total) * 100).toFixed(1)) : 0;
      resultMap[key] = {
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        total: item.total,
        won: item.won,
        lost: item.lost,
        conversionRate: convRate
      };
    });

    const formattedData = [];
    // Build the array from 5 months ago up to this month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // getMonth is 0-indexed
      const key = `${year}-${month}`;

      if (resultMap[key]) {
        formattedData.push(resultMap[key]);
      } else {
        formattedData.push({
          month: `${monthNames[month - 1]} ${year}`,
          total: 0,
          won: 0,
          lost: 0,
          conversionRate: 0
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick search for autocomplete
 * @route   GET /api/leads/search
 * @access  Private (Owner only)
 * 
 * Inputs: req.query.q, req.query.limit
 * Outputs: List of simplified leads
 * Side effects: None
 */
export const searchLeads = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const limitNum = parseInt(req.query.limit, 10) || 5;

    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    const searchRegex = new RegExp(q, 'i');
    const filter = {
      owner: req.user._id,
      $or: [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex }
      ]
    };

    const leads = await Lead.find(filter)
      .select('_id name company email status')
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      data: leads
    });
  } catch (error) {
    next(error);
  }
};
