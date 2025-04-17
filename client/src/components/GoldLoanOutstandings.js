import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function GoldLoanOutstandings() {
  const [goldLoans, setGoldLoans] = useState([]);
  const [monthlyOutstandings, setMonthlyOutstandings] = useState([]);
  const navigate = useNavigate();
  const currentDate = new Date();

  const calculateMonthlyOutstandings = useCallback((loans) => {
    const outstandings = {};

    loans.forEach(loan => {
      const startDate = new Date(loan.startDate);
      let remainingAmount = loan.amount;
      let accumulatedInterest = 0;

      // Calculate all months from loan start to current date
      let currentDate = new Date(startDate);
      const endDate = new Date();
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthKey = `${year}-${month}`;

        // Initialize month data if not exists
        if (!outstandings[monthKey]) {
          outstandings[monthKey] = {
            month,
            year,
            loans: {},
            totalOutstanding: 0,
            totalInterest: 0,
            accumulatedInterest: 0,
            totalPayment: 0,
            totalPrepayment: 0,
            interestPaidByPrepayment: 0,
            principalPaidByPrepayment: 0
          };
        }

        // Calculate monthly interest
        const monthlyInterest = (remainingAmount * loan.interestRate) / (12 * 100);
        
        // Get payments and prepayments for this month
        const payments = loan.payments?.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
        }) || [];

        const prepayments = loan.prepayments?.filter(p => {
          const prepaymentDate = new Date(p.date);
          return prepaymentDate.getMonth() === month && prepaymentDate.getFullYear() === year;
        }) || [];

        const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
        const totalPrepayment = prepayments.reduce((sum, p) => sum + p.amount, 0);

        // Add monthly interest to accumulated interest
        accumulatedInterest += monthlyInterest;

        // Process prepayments
        let interestPaidByPrepayment = 0;
        let principalPaidByPrepayment = 0;

        if (totalPrepayment > 0) {
          // First pay accumulated interest
          if (accumulatedInterest > 0) {
            interestPaidByPrepayment = Math.min(totalPrepayment, accumulatedInterest);
            accumulatedInterest -= interestPaidByPrepayment;
            
            // If there's remaining prepayment after paying interest, apply to principal
            if (totalPrepayment > interestPaidByPrepayment) {
              principalPaidByPrepayment = totalPrepayment - interestPaidByPrepayment;
              remainingAmount = Math.max(0, remainingAmount - principalPaidByPrepayment);
            }
          } else {
            // If no accumulated interest, all prepayment goes to principal
            principalPaidByPrepayment = totalPrepayment;
            remainingAmount = Math.max(0, remainingAmount - principalPaidByPrepayment);
          }
        }

        // Process regular payments (after prepayments)
        if (totalPayment > 0) {
          // Regular payments first go towards accumulated interest
          const interestPayment = Math.min(totalPayment, accumulatedInterest);
          accumulatedInterest -= interestPayment;
          
          // Any remaining payment goes towards principal
          const principalPayment = totalPayment - interestPayment;
          if (principalPayment > 0) {
            remainingAmount = Math.max(0, remainingAmount - principalPayment);
          }
        }

        // Store loan data for this month
        outstandings[monthKey].loans[loan._id] = {
          name: loan.borrowerName,
          outstanding: remainingAmount,
          interest: monthlyInterest,
          accumulatedInterest: accumulatedInterest,
          payment: totalPayment,
          prepayment: totalPrepayment,
          interestPaidByPrepayment,
          principalPaidByPrepayment
        };

        // Update monthly totals
        outstandings[monthKey].totalOutstanding += remainingAmount;
        outstandings[monthKey].totalInterest += monthlyInterest;
        outstandings[monthKey].accumulatedInterest += accumulatedInterest;
        outstandings[monthKey].totalPayment += totalPayment;
        outstandings[monthKey].totalPrepayment += totalPrepayment;
        outstandings[monthKey].interestPaidByPrepayment += interestPaidByPrepayment;
        outstandings[monthKey].principalPaidByPrepayment += principalPaidByPrepayment;

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    const sortedOutstandings = Object.entries(outstandings)
      .map(([monthKey, data]) => ({
        monthKey,
        ...data
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    setMonthlyOutstandings(sortedOutstandings);
  }, []);

  const fetchGoldLoans = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/loans`);
      const goldLoans = response.data.filter(loan => loan.loanType === 'gold');
      setGoldLoans(goldLoans);
      calculateMonthlyOutstandings(goldLoans);
    } catch (error) {
      console.error('Error fetching gold loans:', error);
    }
  }, [calculateMonthlyOutstandings]);

  useEffect(() => {
    fetchGoldLoans();
  }, [fetchGoldLoans]);

  const formatMonthYear = (month, year) => {
    return new Date(year, month).toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })}`;
  };

  const getCurrentMonthData = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    return monthlyOutstandings.find(
      data => data.month === currentMonth && data.year === currentYear
    );
  };

  const scrollToCurrentMonth = () => {
    const currentMonthElement = document.querySelector('[data-current-month="true"]');
    if (currentMonthElement) {
      currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getActiveLoansCount = (monthData) => {
    if (!monthData) return 0;
    return Object.values(monthData.loans).filter(loan => loan.outstanding > 0).length;
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/gold-loans')}
          sx={{ 
            bgcolor: 'grey.100',
            '&:hover': { bgcolor: 'grey.200' }
          }}
        >
          Back
        </Button>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #b8860b 30%, #daa520 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Gold Loans Outstandings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ mb: 4, borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Current Month Summary {formatMonthYear(currentDate.getMonth(), currentDate.getFullYear())}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Active Loans</Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                      {getActiveLoansCount(getCurrentMonthData())}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      out of {goldLoans.length} total loans
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(180, 83, 9, 0.05)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Current Month Outstanding</Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: '#b45309' }}>
                      {formatCurrency(getCurrentMonthData()?.totalOutstanding || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Total outstanding amount</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Current Month Interest</Typography>
                    <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, color: 'error.main' }}>
                      {formatCurrency(getCurrentMonthData()?.totalInterest || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Total interest for this month</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3 
          }}>
            <Button
              variant="contained"
              onClick={scrollToCurrentMonth}
              sx={{
                bgcolor: '#b8860b',
                color: 'white',
                '&:hover': {
                  bgcolor: '#daa520'
                },
                px: 4,
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Show Current Month
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ 
            width: '100%',
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'grey.100',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'grey.400',
              borderRadius: '4px',
              '&:hover': {
                background: 'grey.500'
              }
            }
          }}>
            <TableContainer 
              component={Paper} 
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: '800px'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    bgcolor: 'grey.50',
                    '& th': {
                      fontWeight: 600,
                      color: 'text.primary',
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                      whiteSpace: 'nowrap'
                    }
                  }}>
                    <TableCell>Month</TableCell>
                    {goldLoans.map(loan => (
                      <TableCell 
                        key={loan._id} 
                        align="right"
                      >
                        {loan.borrowerName}
                      </TableCell>
                    ))}
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyOutstandings.map((monthData) => {
                    const isCurrentMonth = monthData.month === currentDate.getMonth() && 
                                         monthData.year === currentDate.getFullYear();
                    return (
                      <TableRow 
                        key={monthData.monthKey}
                        sx={{ 
                          bgcolor: isCurrentMonth ? 'rgba(180, 83, 9, 0.05)' : 'inherit',
                          '&:hover': { bgcolor: isCurrentMonth ? 'rgba(180, 83, 9, 0.1)' : 'grey.50' }
                        }}
                      >
                        <TableCell 
                          sx={{ 
                            fontWeight: 500,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            position: 'sticky',
                            left: 0,
                            bgcolor: isCurrentMonth ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                            zIndex: 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatMonthYear(monthData.month, monthData.year)}
                          {isCurrentMonth && (
                            <Chip 
                              label="Current Month" 
                              size="small" 
                              sx={{ ml: 1, bgcolor: 'rgba(180, 83, 9, 0.1)', color: '#b45309' }}
                            />
                          )}
                        </TableCell>
                        {goldLoans.map(loan => {
                          const loanData = monthData.loans[loan._id];
                          return (
                            <TableCell 
                              key={loan._id} 
                              align="right"
                              sx={{ 
                                borderRight: '1px solid',
                                borderColor: 'divider'
                              }}
                            >
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(loanData?.outstanding || 0)}
                                </Typography>
                                <Typography variant="body2" color="error.main">
                                  Interest: {formatCurrency(loanData?.interest || 0)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'error.dark', fontStyle: 'italic' }}>
                                  (Accumulated: {formatCurrency(loanData?.accumulatedInterest || 0)})
                                </Typography>
                                {loanData?.payment > 0 && (
                                  <Typography variant="body2" color="success.main">
                                    Payment: {formatCurrency(loanData.payment)}
                                  </Typography>
                                )}
                                {loanData?.prepayment > 0 && (
                                  <>
                                    <Typography variant="body2" color="success.dark">
                                      Prepayment: {formatCurrency(loanData.prepayment)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'success.dark', fontSize: '0.75rem', pl: 1 }}>
                                      (Interest: {formatCurrency(loanData.interestPaidByPrepayment)},
                                      Principal: {formatCurrency(loanData.principalPaidByPrepayment)})
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          );
                        })}
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#b45309' }}>
                              {formatCurrency(monthData.totalOutstanding)}
                            </Typography>
                            <Typography variant="body2" color="error.main">
                              Interest: {formatCurrency(monthData.totalInterest)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'error.dark', fontStyle: 'italic' }}>
                              (Accumulated: {formatCurrency(monthData.accumulatedInterest)})
                            </Typography>
                            {monthData.totalPayment > 0 && (
                              <Typography variant="body2" color="success.main">
                                Payment: {formatCurrency(monthData.totalPayment)}
                              </Typography>
                            )}
                            {monthData.totalPrepayment > 0 && (
                              <>
                                <Typography variant="body2" color="success.dark">
                                  Prepayment: {formatCurrency(monthData.totalPrepayment)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'success.dark', fontSize: '0.8rem', pl: 2 }}>
                                  (Interest: {formatCurrency(monthData.interestPaidByPrepayment)},
                                  Principal: {formatCurrency(monthData.principalPaidByPrepayment)})
                                </Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default GoldLoanOutstandings; 