const mongoose = require('mongoose');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Target = require('../models/Target');
const Team = require('../models/Team');
const User = require('../models/User');

// Employee creates a new order
exports.createOrder = async (req, res) => {
    try {
        const { clientId, orderAmount, orderQty, sourcingCost, date } = req.body;
        const employeeId = req.user.id;
        
        // Fetch client name using clientId
        const client = await Client.findById(clientId);
        if (!client) return res.status(404).json({ msg: 'Client not found' });

        const order = new Order({
            clientId,
            employeeId,
            clientName: client.name,
            orderAmount,
            orderQty,
            sourcingCost,
            date,
        });

        await order.save();
        res.status(201).json({ msg: 'Order added successfully', order });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to add order', error: err.message });
    }
};

// Admin gets all orders
exports.getOrders = async (req, res) => {
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
        // Apply year range filter if only years are provided
        else if (startYear && endYear) {
            const startDate = new Date(parseInt(startYear), 0, 1); // January 1st of start year
            const endDate = new Date(parseInt(endYear), 11, 31); // December 31st of end year
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        // Apply specific month/year filter if provided
        else if (month && year) {
            const monthInt = parseInt(month);
            const yearInt = parseInt(year);
            const startDate = new Date(yearInt, monthInt - 1, 1);
            const endDate = new Date(yearInt, monthInt, 0); // Last day of month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        // Default to current year if no filter is provided
        else if (Object.keys(req.query).length === 0) {
            const currentYear = new Date().getFullYear();
            const startDate = new Date(currentYear, 0, 1); // January 1st of current year
            const endDate = new Date(currentYear, 11, 31); // December 31st of current year
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        
        console.log("Order filter applied:", dateFilter);
        
        const orders = await Order.find(dateFilter)
            .populate('employeeId', 'name email')
            .sort({ date: -1 });
            
        res.status(200).json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ msg: 'Failed to retrieve orders', error: err.message });
    }
};

// Employee gets their own orders
exports.getEmployeeOrders = async (req, res) => {
    try {
        const employeeId = req.user.id;
        // Populate clientId to get client information and include clientName in response
        const orders = await Order.find({ employeeId })
            .populate('clientId', 'name')
            .sort({ date: -1 });
            
        // Ensure each order has clientName property
        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject();
            // If clientName is not present but clientId is populated, use its name
            if (!orderObj.clientName && orderObj.clientId && orderObj.clientId.name) {
                orderObj.clientName = orderObj.clientId.name;
            }
            return orderObj;
        });
        
        res.status(200).json(formattedOrders);
    } catch (err) {
        console.error('Error fetching employee orders:', err);
        res.status(500).json({ msg: 'Failed to retrieve employee orders', error: err.message });
    }
};

// Admin updates an order
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, orderAmount, orderQty, sourcingCost, date } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        // Handle clientId from frontend (could be an object or string)
        let clientIdValue;
        if (clientId && typeof clientId === 'object' && clientId.value) {
            clientIdValue = clientId.value;
        } else if (clientId) {
            clientIdValue = clientId;
        }

        // If clientId changed, update clientName
        if (clientIdValue && clientIdValue !== order.clientId.toString()) {
            const client = await Client.findById(clientIdValue);
            if (!client) return res.status(404).json({ msg: 'Client not found' });
            order.clientId = clientIdValue;
            order.clientName = client.name;
        }

        order.orderAmount = orderAmount;
        order.orderQty = orderQty;
        order.sourcingCost = sourcingCost;
        order.date = date;

        await order.save();
        res.status(200).json({ msg: 'Order updated successfully', order });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update order', error: err.message });
    }
};

// Admin deletes an order
exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        await Order.findByIdAndDelete(id);
        res.status(200).json({ msg: 'Order deleted successfully' });
    } catch (err) {
        console.error('Delete order error:', err);
        res.status(500).json({ msg: 'Failed to delete order', error: err.message });
    }
};

// Get employee's order performance
exports.getEmployeePerformance = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const orders = await Order.find({ employeeId });
        
        const totalAmount = orders.reduce((sum, order) => sum + order.orderAmount, 0);
        const totalQuantity = orders.reduce((sum, order) => sum + order.orderQty, 0);
        
        res.status(200).json({
            totalOrders: orders.length,
            totalAmount,
            totalQuantity
        });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve order performance', error: err.message });
    }
};

// Get monthly order performance
exports.getMonthlyPerformance = async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const orders = await Order.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const totalAmount = orders.reduce((sum, order) => sum + order.orderAmount, 0);
        const totalQuantity = orders.reduce((sum, order) => sum + order.orderQty, 0);

        res.status(200).json({
            totalOrders: orders.length,
            totalAmount,
            totalQuantity
        });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve monthly performance', error: err.message });
    }
};

// Get monthly order performance for all employees (similar to sales)
exports.getAllOrdersMonthlyPerformance = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let dateFilter = {};
        let targetFilter = {};
        
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
            
            // Target filter for date range
            targetFilter = {
                $or: []
            };
            
            // Add a condition for each month in the range
            let currentDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
            const endDateForTarget = new Date(parseInt(endYear), parseInt(endMonth), 0);
            
            while (currentDate <= endDateForTarget) {
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();
                
                targetFilter.$or.push({
                    month: currentMonth,
                    year: currentYear,
                    targetType: 'order'
                });
                
                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            const monthInt = parseInt(month);
            const yearInt = parseInt(year);
            const startDate = new Date(yearInt, monthInt - 1, 1);
            const endDate = new Date(yearInt, monthInt, 0); // Last day of month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                month: monthInt,
                year: yearInt,
                targetType: 'order'
            };
        }
        // Default to current month
        else {
            const currentDate = new Date();
            const targetMonth = currentDate.getMonth() + 1;
            const targetYear = currentDate.getFullYear();
            
            const startDate = new Date(targetYear, targetMonth - 1, 1); // First day of month
            const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                targetType: 'order',
                month: targetMonth,
                year: targetYear
            };
        }
        
        // Get all orders based on filter
        const orders = await Order.find(dateFilter).populate('employeeId', 'name');
        
        // Get all order targets based on filter
        const orderTargets = await Target.find(targetFilter).populate('assignedTo');
        
        // Calculate aggregated performance
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.orderAmount, 0);
        const totalOrderQty = orders.reduce((sum, order) => sum + order.orderQty, 0);
        const totalTargetAmount = orderTargets.reduce((sum, target) => sum + target.targetAmount, 0);
        const totalTargetQty = orderTargets.reduce((sum, target) => sum + target.targetQty, 0);
        
        const response = {
            // Display range or specific month based on filter
            period: startMonth && endMonth ? 
                `${startMonth}/${startYear} to ${endMonth}/${endYear}` : 
                month && year ? `${month}/${year}` : `Current Month`,
            totalOrders: orders.length,
            totalOrderAmount,
            totalOrderQty,
            totalTargetAmount,
            totalTargetQty,
            performanceAmount: totalTargetAmount > 0 
                ? ((totalOrderAmount / totalTargetAmount) * 100).toFixed(2) + '%' 
                : '0%',
            performanceQty: totalTargetQty > 0 
                ? ((totalOrderQty / totalTargetQty) * 100).toFixed(2) + '%' 
                : '0%'
        };
        
        res.status(200).json(response);
    } catch (err) {
        console.error('Error getting order performance:', err);
        res.status(500).json({ msg: 'Failed to retrieve monthly order performance', error: err.message });
    }
};

// Get performance data per employee
exports.getAllEmployeesOrderPerformance = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let dateFilter = {};
        let targetFilter = {};
        
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
                    targetType: 'order'
                });
                
                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            const monthInt = parseInt(month);
            const yearInt = parseInt(year);
            const startDate = new Date(yearInt, monthInt - 1, 1);
            const endDate = new Date(yearInt, monthInt, 0); // Last day of month
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                month: parseInt(month),
                year: parseInt(year),
                targetType: 'order'
            };
        }
        // Default to current year if no filters
        else {
            const currentDate = new Date();
            const thisYear = currentDate.getFullYear();
            
            const startDate = new Date(thisYear, 0, 1); // January 1st of current year
            const endDate = new Date(thisYear, 11, 31); // December 31st of current year
            
            dateFilter = {
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            targetFilter = {
                year: thisYear,
                targetType: 'order'
            };
        }
        
        console.log('Date filter for orders:', dateFilter);
        console.log('Filter for order targets:', targetFilter);
        
        // Get all employees with Orders permission
        const ordersEmployees = await User.find({
            'permissions': { $in: ['Orders', 'Sales & Orders', 'All Permissions'] }
        }).select('_id name');
        
        console.log(`Found ${ordersEmployees.length} employees with Orders permission`);
        
        // Aggregate orders data by employee
        const ordersReport = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$employeeId",
                    totalOrderAmount: { $sum: "$orderAmount" },
                    totalOrderQty: { $sum: "$orderQty" }
                }
            }
        ]);
        
        console.log(`Found orders data for ${ordersReport.length} employees`);
        
        // Fetch all targets matching the filter
        const targetReport = await Target.find({
            ...targetFilter,
            assignedToModel: 'User' // Ensure we're only getting user targets, not team targets
        }).populate('assignedTo', 'name');
        
        console.log(`Found ${targetReport.length} order targets for the period`);
        
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
        
        // Create a map of employeeId -> orders
        const employeeOrders = {};
        
        ordersReport.forEach(order => {
            const employeeId = order._id?.toString();
            if (!employeeId) return;
            
            employeeOrders[employeeId] = {
                totalOrderAmount: order.totalOrderAmount || 0,
                totalOrderQty: order.totalOrderQty || 0
            };
        });
        
        // Combine the data for all employees with Orders permission
        const formattedReport = ordersEmployees.map(employee => {
            const employeeId = employee._id.toString();
            const targetData = employeeTargets[employeeId] || { targetAmount: 0, targetQty: 0 };
            const orderData = employeeOrders[employeeId] || { totalOrderAmount: 0, totalOrderQty: 0 };
            
            const totalOrderAmount = orderData.totalOrderAmount;
            const totalOrderQty = orderData.totalOrderQty;
            const targetAmount = targetData.targetAmount;
            const targetQty = targetData.targetQty;
            
            // Calculate performance percentages
            const performanceAmount = targetAmount > 0 
                ? ((totalOrderAmount / targetAmount) * 100).toFixed(2) 
                : "0.00";
                
            const performanceQty = targetQty > 0 
                ? ((totalOrderQty / targetQty) * 100).toFixed(2) 
                : "0.00";
            
            return {
                employeeId,
                employeeName: employee.name,
                totalOrderAmount,
                totalOrderQty,
                targetAmount,
                targetQty,
                performanceAmount: `${performanceAmount}%`,
                performanceQty: `${performanceQty}%`
            };
        });
        
        // Filter out employees with no order target (they shouldn't be in the chart)
        // But keep employees with targets even if they have 0 orders
        const finalReport = formattedReport.filter(employee => 
            employee.targetAmount > 0 || employee.totalOrderAmount > 0
        );

        console.log(`✅ Final Report: ${finalReport.length} employees with orders or targets`);
        res.status(200).json(finalReport);
    } catch (err) {
        console.error("Error in getAllEmployeesOrderPerformance:", err);
        res.status(500).json({ 
            msg: "Failed to retrieve all employees order performance", 
            error: err.message 
        });
    }
};

// Get employee's monthly order performance
exports.getEmployeeMonthlyOrderPerformance = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const { month, year } = req.query;
        
        let dateFilter = {};
        
        // Apply specific month/year filter if provided
        if (month && year) {
            const monthInt = parseInt(month);
            const yearInt = parseInt(year);
            const startDate = new Date(yearInt, monthInt - 1, 1);
            const endDate = new Date(yearInt, monthInt, 0); // Last day of month
            
            dateFilter = {
                employeeId, // Filter by the current employee
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        } else {
            // Default to current month if no filter provided
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            
            const startDate = new Date(currentYear, currentMonth - 1, 1);
            const endDate = new Date(currentYear, currentMonth, 0);
            
            dateFilter = {
                employeeId, // Filter by the current employee
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
        }
        
        const orders = await Order.find(dateFilter);
        
        const totalAmount = orders.reduce((sum, order) => sum + order.orderAmount, 0);
        const totalQuantity = orders.reduce((sum, order) => sum + order.orderQty, 0);
        
        res.status(200).json({
            totalOrders: orders.length,
            totalAmount,
            totalQuantity
        });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve employee monthly order performance', error: err.message });
    }
};

// Get Team Members' Order Performance (Team Manager Only)
exports.getTeamMembersOrderPerformance = async (req, res) => {
    try {
        // Get the team manager's ID from the authenticated user
        const teamManagerId = req.user.id;
        console.log(`Getting order performance for team managed by: ${teamManagerId}`);
        
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
        
        // Get all team members (those with orders permission)
        const User = require("../models/User");
        const Order = require("../models/Order");
        const Target = require("../models/Target");
        
        const teamMembers = await User.find({
            _id: { $in: uniqueTeamMemberIds },
            'permissions': { $in: ['Orders', 'Sales & Orders', 'All Permissions'] }
        }).select('_id name permissions');
        
        console.log(`Found ${teamMembers.length} team members with orders permissions`);
        
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
        
        // Aggregate order data by team member
        const orderReport = await Order.aggregate([
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
                    totalOrderAmount: { $sum: "$orderAmount" },
                    totalOrderQty: { $sum: "$orderQty" }
                }
            }
        ]);
        
        console.log(`Found order data for ${orderReport.length} team members`);
        
        // Also aggregate order data by month for the team
        const monthlyOrderReport = await Order.aggregate([
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
                    _id: {
                        month: { $month: "$date" },
                        year: { $year: "$date" }
                    },
                    totalOrderAmount: { $sum: "$orderAmount" },
                    totalOrderQty: { $sum: "$orderQty" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);
        
        console.log(`Found monthly order data: ${monthlyOrderReport.length} records`);
        
        // Prepare target filter based on date criteria
        let targetFilter = {
            targetType: { $in: ['orders', 'order', 'Orders'] },
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
        
        // Convert orders to a map for easy lookup
        const employeeOrders = {};
        orderReport.forEach(order => {
            employeeOrders[order._id] = {
                totalOrderAmount: order.totalOrderAmount,
                totalOrderQty: order.totalOrderQty
            };
        });
        
        // Combine the data for all team members
        const formattedReport = teamMembers.map(member => {
            const employeeId = member._id.toString();
            const targetData = employeeTargets[employeeId] || { targetAmount: 0, targetQty: 0 };
            const orderData = employeeOrders[employeeId] || { totalOrderAmount: 0, totalOrderQty: 0 };
            
            const totalOrderAmount = orderData.totalOrderAmount;
            const totalOrderQty = orderData.totalOrderQty;
            const targetAmount = targetData.targetAmount;
            const targetQty = targetData.targetQty;
            
            // Calculate performance percentages
            const performanceAmount = targetAmount > 0 
                ? ((totalOrderAmount / targetAmount) * 100).toFixed(2) 
                : "0.00";
                
            const performanceQty = targetQty > 0 
                ? ((totalOrderQty / targetQty) * 100).toFixed(2) 
                : "0.00";
                
            return {
                employeeId,
                employeeName: member.name,
                totalOrderAmount,
                totalOrderQty,
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
                    targetType: { $in: ['orders', 'order', 'Orders'] },
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

        // Format monthly order data
        const formattedMonthlyOrders = monthlyOrderReport.map(data => {
            const month = data._id.month;
            const year = data._id.year;
            const key = `${year}-${month}`;
            
            const targetData = monthlyTargets[key] || { targetAmount: 0, targetQty: 0 };
            const totalOrderAmount = data.totalOrderAmount;
            const targetAmount = targetData.targetAmount;
            
            // Calculate performance percentage
            const performance = targetAmount > 0 
                ? Math.round((totalOrderAmount / targetAmount) * 100)
                : 0;
                
            return {
                month,
                year,
                name: getMonthName(month),
                totalAmount: totalOrderAmount,
                totalOrderQty: data.totalOrderQty,
                targetAmount,
                targetQty: targetData.targetQty,
                performance,
                // Add fields expected by the MonthlyPerformanceChart component
                actualValue: totalOrderAmount,
                targetValue: targetAmount,
                actual: totalOrderAmount,
                target: targetAmount,
                // Compatibility with different field names used in the chart
                totalSalesAmount: totalOrderAmount,
                totalSales: totalOrderAmount
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
        responseData.monthlyOrders = formattedMonthlyOrders;
        
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in getTeamMembersOrderPerformance:", error);
        res.status(500).json({ msg: 'Failed to retrieve team members order performance', error: error.message });
    }
};