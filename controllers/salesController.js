// controllers/salesController.js
const mongoose = require('mongoose');
const Sales = require('../models/Sales');
const Client = require('../models/Client');
const Target = require('../models/Target');
const Team = require('../models/Team');
// Employee adds a new sale
exports.addSale = async (req, res) => {
    try {
        const { clientId, salesAmount, salesQty, sourcingCost, date } = req.body;
        const employeeId = req.user.id;
        // Fetch client name using clientId
        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ msg: 'Client not found' });

        const sale = new Sales({
            clientId,
            employeeId,
            clientName: client.name, // ✅ Store clientName separately
            salesAmount,
            salesQty,
            sourcingCost,
            date,
        });

        await sale.save();
        res.status(201).json({ msg: 'Sale added successfully', sale });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to add sale', error: err.message });
    }
};

// Admin gets all sales
exports.getSales = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let dateFilter = {};
        
        // Apply date range filter if provided
        if (startMonth && startYear && endMonth && endYear) {
            const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
            const endDate = new Date(parseInt(endYear), parseInt(endMonth), 0); // Last day of end month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        
        const sales = await Sales.find(dateFilter)
            .populate('employeeId', 'name email')
            .sort({ date: -1 });
        res.status(200).json(sales);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve sales', error: err.message });
    }
};


exports.getEmployeeSales = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const sales = await Sales.find({ employeeId });
        res.status(200).json(sales);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve employee sales', error: err.message });
    }
};

// Employee updates their own sale
exports.updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, salesAmount, salesQty, sourcingCost, date } = req.body;
        
        // Find the sale first to check if it exists
        const sale = await Sales.findById(id);
        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found' });
        }
        
        // Prepare update payload
        const updateData = {
            salesAmount,
            salesQty,
            sourcingCost,
            date
        };
        
        // Handle clientId from frontend (could be an object or string)
        let clientIdValue;
        if (clientId && typeof clientId === 'object' && clientId.value) {
            clientIdValue = clientId.value;
        } else if (clientId) {
            clientIdValue = clientId;
        }
        
        // If clientId is provided and changed, update clientName too
        if (clientIdValue && clientIdValue !== sale.clientId.toString()) {
            // Find the client to get the name
            const client = await Client.findById(clientIdValue);
            if (!client) {
                return res.status(404).json({ msg: 'Client not found' });
            }
            
            updateData.clientId = clientIdValue;
            updateData.clientName = client.name;
        }
        
        // Update the sale with the prepared data
        const updatedSale = await Sales.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updatedSale);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update sale', error: err.message });
    }
};

// Employee deletes their own sale
exports.deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sales.findById(id);

        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found' });
        }
        await Sales.findByIdAndDelete(id);
        res.status(200).json({ msg: 'Sale deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete sale', error: err.message });
    }
};

exports.getEmployeePerformance = async (req, res) => {
    try {
        const employeeId = req.user.id;

        const totalSales = await Sales.aggregate([
            {
                $match: { employeeId: new mongoose.Types.ObjectId(req.user.id) } // ✅ Convert to ObjectId
            },
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" },
                }
            }
        ]);
        console.log(totalSales)
        res.status(200).json(totalSales.length > 0 ? totalSales[0] : { totalSalesAmount: 0, totalSalesQty: 0 });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve performance data', error: err.message });
    }
};


exports.getMonthlyEmployeePerformance = async (req, res) => {
    try {
        const employeeId = req.user.id;

        const salesReport = await Sales.aggregate([
            { $match: { employeeId: new mongoose.Types.ObjectId(employeeId) } }, // Filter by employee
            {
                $group: {
                    _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        const targetReport = await Target.find({ employeeId }).select('targetAmount date');

        const monthNames = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const formattedReport = salesReport.map((data) => {
            const targetData = targetReport.find(target =>
                new Date(target.date).getMonth() + 1 === data._id.month &&
                new Date(target.date).getFullYear() === data._id.year
            );

            const targetAmount = targetData ? targetData.targetAmount : 0;
            const performance = targetAmount ? ((data.totalSalesAmount / targetAmount) * 100).toFixed(2) : 0;

            return {
                month: data._id.month,
                monthName: monthNames[data._id.month],
                year: data._id.year,
                totalSalesAmount: data.totalSalesAmount,
                totalSalesQty: data.totalSalesQty,
                targetAmount,
                performance: `${performance}%`
            };
        });
        console.log(formattedReport)
        res.status(200).json(formattedReport);
    } catch (error) {
        res.status(500).json({ msg: 'Failed to retrieve employee monthly performance', error: error.message });
    }
};


const User = require("../models/User");

exports.getAllEmployeesMonthlyPerformance = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let dateMatch = {};
        let targetFilter = {};
        
        // Apply date range filter if provided
        if (startMonth && startYear && endMonth && endYear) {
            const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
            const endDate = new Date(parseInt(endYear), parseInt(endMonth), 0); // Last day of end month
            
            dateMatch = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            // Target filter for date range
            targetFilter = {
                $or: []
            };
            
            // Add a condition for each month in the range
            let currentDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
            const endDate2 = new Date(parseInt(endYear), parseInt(endMonth), 0);
            
            while (currentDate <= endDate2) {
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();
                
                targetFilter.$or.push({
                    month: currentMonth,
                    year: currentYear,
                    targetType: 'sales'
                });
                
                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            
            dateMatch = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                month: parseInt(month),
                year: parseInt(year),
                targetType: 'sales'
            };
        }
        // Default to current year if no filters
        else {
            const currentDate = new Date();
            const thisYear = currentDate.getFullYear();
            
            const startDate = new Date(thisYear, 0, 1); // January 1st of current year
            const endDate = new Date(thisYear, 11, 31); // December 31st of current year
            
            dateMatch = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                year: thisYear,
                targetType: 'sales'
            };
        }
        
        console.log('Date filter for sales:', dateMatch);
        console.log('Filter for targets:', targetFilter);
        
        // Get all sales employees (those with sales permission)
        const salesEmployees = await User.find({
            'permissions': { $in: ['Sales', 'Sales & Orders', 'All Permissions'] }
        }).select('_id name');
        
        console.log(`Found ${salesEmployees.length} sales employees`);
        
        // Aggregate sales data by employee
        const salesReport = await Sales.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: "$employeeId",
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            }
        ]);
        
        console.log(`Found sales data for ${salesReport.length} employees`);
        
        // Fetch all targets matching the filter
        const targetReport = await Target.find({
            ...targetFilter,
            assignedToModel: 'User' // Ensure we're only getting user targets, not team targets
        }).populate('assignedTo', 'name');
        
        console.log(`Found ${targetReport.length} targets for the period`);
        
        // Create a map to track which employees already had targets counted
        // This prevents duplicates for employees with multiple permission types
        const processedTargets = new Set();
        
        // Create a map of employeeId -> total target
        const employeeTargets = {};
        
        targetReport.forEach(target => {
            const employeeId = target.assignedTo?._id.toString();
            if (!employeeId) return;
            
            // Create unique key for this target to prevent duplicates
            const targetKey = `${employeeId}-${target._id}`;
            
            // Skip if we've already processed this target
            if (processedTargets.has(targetKey)) return;
            processedTargets.add(targetKey);
            
            if (!employeeTargets[employeeId]) {
                employeeTargets[employeeId] = {
                    targetAmount: 0,
                    targetQty: 0,
                    employeeName: target.assignedTo.name
                };
            }
            
            employeeTargets[employeeId].targetAmount += target.targetAmount || 0;
            employeeTargets[employeeId].targetQty += target.targetQty || 0;
        });
        
        // Create a map of employeeId -> sales
        const employeeSales = {};
        
        salesReport.forEach(sale => {
            const employeeId = sale._id?.toString();
            if (!employeeId) return;
            
            employeeSales[employeeId] = {
                totalSalesAmount: sale.totalSalesAmount || 0,
                totalSalesQty: sale.totalSalesQty || 0
            };
        });
        
        // Combine the data for all sales employees
        const formattedReport = salesEmployees.map(employee => {
            const employeeId = employee._id.toString();
            const targetData = employeeTargets[employeeId] || { targetAmount: 0, targetQty: 0 };
            const salesData = employeeSales[employeeId] || { totalSalesAmount: 0, totalSalesQty: 0 };
            
            const totalSalesAmount = salesData.totalSalesAmount;
            const totalSalesQty = salesData.totalSalesQty;
            const targetAmount = targetData.targetAmount;
            const targetQty = targetData.targetQty;
            
            // Calculate performance percentages
            const performanceAmount = targetAmount > 0 
                ? ((totalSalesAmount / targetAmount) * 100).toFixed(2) 
                : "0.00";
                
            const performanceQty = targetQty > 0 
                ? ((totalSalesQty / targetQty) * 100).toFixed(2) 
                : "0.00";
            
            return {
                employeeId,
                employeeName: employee.name,
                totalSalesAmount,
                totalSalesQty,
                targetAmount,
                targetQty,
                performanceAmount: `${performanceAmount}%`,
                performanceQty: `${performanceQty}%`
            };
        });
        
        // Targets out employees with no sales target (they shouldn't be in the chart)
        // But keep employees with targets even if they have 0 sales
        const finalReport = formattedReport.filter(employee => 
            employee.targetAmount > 0 || employee.totalSalesAmount > 0
        );

        console.log(`✅ Final Report: ${finalReport.length} employees with sales or targets`);
        res.status(200).json(finalReport);
    } catch (error) {
        console.error("Error in getAllEmployeesMonthlyPerformance:", error);
        res.status(500).json({ 
            msg: "Failed to retrieve all employees monthly performance", 
            error: error.message 
        });
    }
};

exports.getEmployeeMonthlyPerformance = async (req, res) => {
    try {
        const employeeId = req.user.id; 

        if (!employeeId) {
            return res.status(400).json({ msg: "Employee ID is required" });
        }

        // Fetch sales data for the given employee
        const salesReport = await Sales.aggregate([
            {
                $match: { employeeId: new mongoose.Types.ObjectId(employeeId) }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        year: { $year: "$date" },
                    },
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        // Fetch target data for the employee - specifically only sales targets
        const targetReport = await Target.find({ 
            assignedTo: employeeId,
            assignedToModel: 'User',
            targetType: 'sales'  // Only include sales targets
        }).select("targetAmount targetQty month year");

        // Track processed targets to prevent duplicates
        const processedMonths = new Set();

        // Fetch employee name
        const employee = await User.findById(employeeId).select("name");
        if (!employee) {
            return res.status(404).json({ msg: "Employee not found" });
        }

        // Format the report correctly
        const formattedReport = salesReport.map((data) => {
            // Create a unique key for this month/year combination
            const monthYearKey = `${data._id.month}-${data._id.year}`;
            
            // Find target for this month/year
            const targetData = targetReport.find(target =>
                target.month === data._id.month && target.year === data._id.year
            );

            // Skip if we've already processed this month/year
            if (processedMonths.has(monthYearKey)) return null;
            processedMonths.add(monthYearKey);

            const targetAmount = targetData ? targetData.targetAmount : 0;
            const targetQty = targetData ? targetData.targetQty : 0;

            const performanceAmount = targetAmount ? ((data.totalSalesAmount / targetAmount) * 100).toFixed(2) : 0;
            const performanceQty = targetQty ? ((data.totalSalesQty / targetQty) * 100).toFixed(2) : 0;

            return {
                employeeName: employee.name,
                month: data._id.month,
                year: data._id.year,
                totalSalesAmount: data.totalSalesAmount,
                totalSalesQty: data.totalSalesQty,
                targetAmount,
                targetQty,
                performanceAmount: `${performanceAmount}%`,
                performanceQty: `${performanceQty}%`
            };
        }).filter(Boolean); // Remove any null values

        console.log(`✅ Performance Report for Employee (${employeeId}):`, formattedReport);
        res.status(200).json(formattedReport);
    } catch (error) {
        res.status(500).json({ msg: "Failed to retrieve employee monthly performance", error: error.message });
    }
};







exports.getSalesPerformanceByEmployee = async (req, res) => {
    try {
        const report = await Sales.aggregate([
            {
                $group: {
                    _id: "$employeeId",
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { employeeId: { $toObjectId: "$_id" } },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$employeeId"] } } },
                        { $project: { name: 1, email: 1 } }
                    ],
                    as: "employeeDetails"
                }
            },
            { $unwind: "$employeeDetails" },
            {
                $project: {
                    _id: 1,
                    employeeName: "$employeeDetails.name",
                    employeeEmail: "$employeeDetails.email",
                    totalSalesAmount: 1,
                    totalSalesQty: 1
                }
            }
        ]);

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ msg: 'Failed to fetch sales performance by employee', error: error.message });
    }
};
exports.getMonthlyPerformance = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let dateMatch = {};
        
        // Apply date range filter if provided
        if (startMonth && startYear && endMonth && endYear) {
            const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
            const endDate = new Date(parseInt(endYear), parseInt(endMonth), 0); // Last day of end month
            
            dateMatch = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            
            dateMatch = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        
        const report = await Sales.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        const monthNames = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const formattedReport = report.map((data) => ({
            month: data._id.month,
            monthName: monthNames[data._id.month],
            year: data._id.year,
            totalSalesAmount: data.totalSalesAmount,
            totalSalesQty: data.totalSalesQty
        }));

        res.status(200).json(formattedReport);
    } catch (error) {
        res.status(500).json({ msg: 'Failed to generate monthly performance report', error: error.message });
    }
};

// Get Team Members' Sales Performance (Team Manager Only)
exports.getTeamMembersSalesPerformance = async (req, res) => {
    try {
        // Get the team manager's ID from the authenticated user
        const teamManagerId = req.user.id;
        console.log(`Getting sales performance for team managed by: ${teamManagerId}`);
        
        // Find teams managed by this team manager
        const Team = require("../models/Team");
        const managedTeams = await Team.find({ teamManager: teamManagerId });
        
        if (!managedTeams || managedTeams.length === 0) {
            console.log(`No teams found for team manager ID: ${teamManagerId}`);
            return res.status(200).json([]);
        }
        
        console.log(`Found ${managedTeams.length} teams managed by team manager ${teamManagerId}`);
        
        // Extract all team member IDs
        let teamMemberIds = [];
        managedTeams.forEach(team => {
            if (team.members && team.members.length > 0) {
                teamMemberIds.push(...team.members);
            }
        });
        
        // Remove duplicates
        const uniqueTeamMemberIds = [...new Set(teamMemberIds.map(id => id.toString()))];
        
        console.log(`Team Manager ${teamManagerId} manages ${managedTeams.length} teams with ${uniqueTeamMemberIds.length} unique members`);
        
        if (uniqueTeamMemberIds.length === 0) {
            return res.status(200).json([]);
        }
        
        // Get all team members (those with sales permission)
        const User = require("../models/User");
        const Sales = require("../models/Sales");
        const Target = require("../models/Target");
        
        const teamMembers = await User.find({
            _id: { $in: uniqueTeamMemberIds },
            'permissions': { $in: ['Sales', 'Sales & Orders', 'All Permissions'] }
        }).select('_id name permissions');
        
        console.log(`Found ${teamMembers.length} team members with sales permissions`);
        
        // Parse filter parameters for date filtering
        const { startDate, endDate, year, month, startMonth, startYear, endMonth, endYear } = req.query;
        let dateMatch = {};
        
        if (startDate && endDate) {
            dateMatch.date = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            };
        } else if (startMonth && startYear && endMonth && endYear) {
            // Month range filter using startMonth/startYear to endMonth/endYear
            const startOfMonth = new Date(startYear, startMonth - 1, 1);
            const endOfMonth = new Date(endYear, endMonth, 0); // Last day of end month
            dateMatch.date = { 
                $gte: startOfMonth, 
                $lte: endOfMonth 
            };
            console.log(`Filtering between ${startMonth}/${startYear} and ${endMonth}/${endYear}`);
        } else if (year && month) {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);
            dateMatch.date = { 
                $gte: startOfMonth, 
                $lte: endOfMonth 
            };
        } else if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31);
            dateMatch.date = { 
                $gte: startOfYear, 
                $lte: endOfYear 
            };
        }
        
        console.log("Date filter applied:", dateMatch);
        
        // Aggregate sales data by team member
        const salesReport = await Sales.aggregate([
            { 
                $match: { 
                    ...dateMatch,
                    // Make sure we match employee IDs in string format OR as ObjectId
                    $or: [
                        { employeeId: { $in: uniqueTeamMemberIds.map(id => id.toString()) } },
                        { employeeId: { $in: uniqueTeamMemberIds.map(id => new mongoose.Types.ObjectId(id)) } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$employeeId",
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            }
        ]);
        
        console.log(`Found sales data for ${salesReport.length} team members`);

        // Also aggregate sales data by month for the team
        const monthlySalesReport = await Sales.aggregate([
            {
                $match: {
                    ...dateMatch,
                    employeeId: { $in: uniqueTeamMemberIds.map(id => id.toString()) }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$date" },
                        year: { $year: "$date" }
                    },
                    totalSalesAmount: { $sum: "$salesAmount" },
                    totalSalesQty: { $sum: "$salesQty" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);
        
        console.log(`Found monthly sales data: ${monthlySalesReport.length} records`);
        
        // Prepare target filter based on date criteria
        let targetFilter = {
            targetType: { $in: ['sales', 'sale', 'Sales'] },
        };
        
        if (year && month) {
            targetFilter.year = parseInt(year);
            targetFilter.month = parseInt(month);
        } else if (year) {
            targetFilter.year = parseInt(year);
        }
        
        // Fetch all targets matching the filter
        const targetReport = await Target.find({
            ...targetFilter,
            assignedToModel: 'User',
            assignedTo: { $in: uniqueTeamMemberIds }
        }).populate('assignedTo', 'name');
        
        console.log(`Found ${targetReport.length} targets for team members`);
        
        // Convert targets to a map for easy lookup
        const employeeTargets = {};
        targetReport.forEach(target => {
            const employeeId = target.assignedTo._id.toString();
            
            if (!employeeTargets[employeeId]) {
                employeeTargets[employeeId] = {
                    targetAmount: 0,
                    targetQty: 0
                };
            }
            
            employeeTargets[employeeId].targetAmount += parseFloat(target.targetAmount) || 0;
            employeeTargets[employeeId].targetQty += parseInt(target.targetQty) || 0;
        });
        
        // Convert sales to a map for easy lookup
        const employeeSales = {};
        salesReport.forEach(sale => {
            employeeSales[sale._id] = {
                totalSalesAmount: sale.totalSalesAmount,
                totalSalesQty: sale.totalSalesQty
            };
        });
        
        // Combine the data for all team members
        const formattedReport = teamMembers.map(member => {
            const employeeId = member._id.toString();
            const targetData = employeeTargets[employeeId] || { targetAmount: 0, targetQty: 0 };
            const salesData = employeeSales[employeeId] || { totalSalesAmount: 0, totalSalesQty: 0 };
            
            const totalSalesAmount = salesData.totalSalesAmount;
            const totalSalesQty = salesData.totalSalesQty;
            const targetAmount = targetData.targetAmount;
            const targetQty = targetData.targetQty;
            
            // Calculate performance percentages
            const performanceAmount = targetAmount > 0 
                ? ((totalSalesAmount / targetAmount) * 100).toFixed(2) 
                : "0.00";
                
            const performanceQty = targetQty > 0 
                ? ((totalSalesQty / targetQty) * 100).toFixed(2) 
                : "0.00";
                
            return {
                employeeId,
                employeeName: member.name,
                totalSalesAmount,
                totalSalesQty,
                targetAmount,
                targetQty,
                performanceAmount: `${performanceAmount}%`,
                performanceQty: `${performanceQty}%`,
                performance: parseInt(performanceAmount)
            };
        });

        // Fetch monthly targets
        const monthlyTargetReport = await Target.aggregate([
            {
                $match: {
                    targetType: { $in: ['sales', 'sale', 'Sales'] },
                    assignedToModel: 'User',
                    assignedTo: { $in: uniqueTeamMemberIds.map(id => id.toString()) }
                }
            },
            {
                $group: {
                    _id: {
                        month: "$month",
                        year: "$year"
                    },
                    totalTarget: { $sum: "$targetAmount" },
                    targetQty: { $sum: "$targetQty" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        // Map monthly targets for easy lookup
        const monthlyTargets = {};
        monthlyTargetReport.forEach(target => {
            const key = `${target._id.year}-${target._id.month}`;
            monthlyTargets[key] = {
                targetAmount: target.totalTarget,
                targetQty: target.targetQty
            };
        });

        // Format monthly sales data
        const formattedMonthlySales = monthlySalesReport.map(data => {
            const month = data._id.month;
            const year = data._id.year;
            const key = `${year}-${month}`;
            
            const targetData = monthlyTargets[key] || { targetAmount: 0, targetQty: 0 };
            const totalSalesAmount = data.totalSalesAmount;
            const targetAmount = targetData.targetAmount;
            
            // Calculate performance percentage
            const performance = targetAmount > 0 
                ? Math.round((totalSalesAmount / targetAmount) * 100)
                : 0;
                
            return {
                month,
                year,
                name: getMonthName(month),
                totalSalesAmount,
                totalSalesQty: data.totalSalesQty,
                targetAmount,
                targetQty: targetData.targetQty,
                performance,
                // Add fields expected by the MonthlyPerformanceChart component
                actualValue: totalSalesAmount,
                targetValue: targetAmount,
                actual: totalSalesAmount,
                target: targetAmount
            };
        });

        // Helper function to get month name
        function getMonthName(month) {
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            return monthNames[month - 1];
        }
        
        // Return both team members' performance and monthly performance data
        const responseData = [...formattedReport];
        responseData.monthlySales = formattedMonthlySales;
        
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in getTeamMembersSalesPerformance:", error);
        res.status(500).json({ msg: 'Failed to retrieve team members sales performance', error: error.message });
    }
};