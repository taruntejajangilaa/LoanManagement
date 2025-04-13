import React, { useState, useEffect } from 'react';
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
  CardContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function PersonalLoanOutstandings() {
  const [personalLoans, setPersonalLoans] = useState([]);
  const [monthlyOutstandings, setMonthlyOutstandings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPersonalLoans();
  }, []);

  const fetchPersonalLoans = async () => {
    try {
      const response = await axios.get(`${API_URL}/loans`);
      const personalLoans = response.data.filter(loan => !loan.loanType || loan.loanType === 'personal');
      setPersonalLoans(personalLoans);
      calculateMonthlyOutstandings(personalLoans);
    } catch (error) {
      console.error('Error fetching personal loans:', error);
    }
  };

  const calculateMonthlyOutstandings = (loans) => {
    const outstandings = {};
    const currentDate = new Date();
    const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    loans.forEach(loan => {
      const startDate = new Date(loan.startDate);
      const term = loan.term;
      const monthlyRate = loan.interestRate / 100 / 12;
      const emi = (loan.amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                 (Math.pow(1 + monthlyRate, term) - 1);
      let remainingAmount = loan.amount;

      // Sort prepayments by date
      const sortedPrepayments = (loan.prepayments || [])
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate all months from start to end
      for (let i = 0; i < term; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!outstandings[monthYear]) {
          outstandings[monthYear] = {
            loans: {},
            total: 0,
            totalEMI: 0,
            totalPrepayment: 0,
            totalPrincipal: 0,
            isCurrentMonth: monthYear === currentMonthYear
          };
        }

        // Calculate prepayment for this month
        const monthPrepayment = sortedPrepayments
          .filter(p => {
            const prepaymentDate = new Date(p.date);
            return prepaymentDate.getFullYear() === currentDate.getFullYear() &&
                   prepaymentDate.getMonth() === currentDate.getMonth();
          })
          .reduce((sum, p) => sum + p.amount, 0);

        // Calculate interest and principal for this month
        const interest = remainingAmount * monthlyRate;
        const principal = emi - interest;

        // Calculate outstanding after payment
        const outstandingAfterPayment = Math.max(0, remainingAmount - principal - monthPrepayment);

        outstandings[monthYear].loans[loan._id] = {
          outstanding: outstandingAfterPayment,
          emi: emi,
          prepayment: monthPrepayment,
          principal: principal,
          interest: interest,
          previousOutstanding: remainingAmount
        };
        outstandings[monthYear].total += outstandingAfterPayment;
        outstandings[monthYear].totalEMI += emi;
        outstandings[monthYear].totalPrepayment += monthPrepayment;
        outstandings[monthYear].totalPrincipal += principal;
        
        // Update remaining amount for next month
        remainingAmount = outstandingAfterPayment;
      }
    });

    // Convert to array and sort by date in ascending order
    const sortedOutstandings = Object.entries(outstandings)
      .map(([monthYear, data]) => ({
        monthYear,
        ...data
      }))
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    setMonthlyOutstandings(sortedOutstandings);
  };

  const formatMonthYear = (monthYear) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCurrentMonthData = () => {
    if (monthlyOutstandings.length === 0) return null;
    // Find the current month's data
    const currentDate = new Date();
    const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return monthlyOutstandings.find(data => data.monthYear === currentMonthYear) || monthlyOutstandings[monthlyOutstandings.length - 1];
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
    <Box sx={{ 
      maxWidth: '1200px', 
      mx: 'auto', 
      p: { xs: 1, sm: 2, md: 3 },
      overflowX: 'auto'
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/personal-loans')}
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
            background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Personal Loans Outstandings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ 
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 3,
                gap: 1
              }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  }}
                >
                  Current Month Summary
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'primary.main',
                    background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                  }}
                >
                  {getCurrentMonthData() ? formatMonthYear(getCurrentMonthData().monthYear) : 'Loading...'}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%'
                  }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Active Loans
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}>
                      {getActiveLoansCount(getCurrentMonthData())}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      out of {personalLoans.length} total loans
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 1,
                    bgcolor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.100',
                    height: '100%'
                  }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Current Month Outstanding
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}>
                      {formatCurrency(getCurrentMonthData()?.total || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Total outstanding amount
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ 
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 1,
                    bgcolor: 'error.50',
                    border: '1px solid',
                    borderColor: 'error.100',
                    height: '100%'
                  }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Current Month EMI
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700, 
                      color: 'error.main',
                      fontSize: { xs: '1.5rem', sm: '2rem' }
                    }}>
                      {formatCurrency(getCurrentMonthData()?.totalEMI || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Total EMI for this month
                    </Typography>
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
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
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
                minWidth: '800px',
                '& .MuiTableCell-root': {
                  py: { xs: 1, sm: 2 },
                  px: { xs: 1.5, sm: 3 },
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
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
                    {personalLoans.map(loan => (
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
                  {monthlyOutstandings.map((monthData, index) => (
                    <TableRow 
                      key={monthData.monthYear}
                      data-current-month={monthData.isCurrentMonth}
                      sx={{ 
                        '&:nth-of-type(odd)': { 
                          bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.04)' : 'grey.50' 
                        },
                        '&:hover': { 
                          bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.08)' : 'grey.100' 
                        },
                        '& td': {
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                          '&:hover': {
                            bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.08)' : 'inherit'
                          }
                        }
                      }}
                    >
                      <TableCell 
                        sx={{ 
                          fontWeight: 500,
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          position: 'sticky',
                          left: 0,
                          bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                          zIndex: 1,
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: monthData.isCurrentMonth ? 'rgba(0, 0, 0, 0.08)' : 'inherit'
                          }
                        }}
                      >
                        {formatMonthYear(monthData.monthYear)}
                        {monthData.isCurrentMonth && (
                          <Typography 
                            component="span" 
                            sx={{ 
                              ml: 1,
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                              fontWeight: 600,
                              bgcolor: 'rgba(0, 0, 0, 0.1)',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1
                            }}
                          >
                            Current Month
                          </Typography>
                        )}
                      </TableCell>
                      {personalLoans.map(loan => {
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
                            <Box sx={{ mb: 1 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: { xs: '0.875rem', sm: '1rem' }
                                }}
                              >
                                {formatCurrency(loanData?.outstanding || 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ mb: 1 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'error.main',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                <span>EMI:</span>
                                {formatCurrency(loanData?.emi || 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ mb: 1 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'info.main',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.5,
                                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }}
                              >
                                <span>Principal:</span>
                                {formatCurrency(loanData?.principal || 0)}
                              </Typography>
                            </Box>
                            {loanData?.prepayment > 0 && (
                              <Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'success.main',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 0.5,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}
                                >
                                  <span>Prepayment:</span>
                                  {formatCurrency(loanData.prepayment)}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell align="right">
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 700,
                              color: 'primary.main',
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            {formatCurrency(monthData.total)}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'error.main',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                          >
                            <span>EMI:</span>
                            {formatCurrency(monthData.totalEMI)}
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'info.main',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 0.5,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}
                          >
                            <span>Principal:</span>
                            {formatCurrency(monthData.totalPrincipal)}
                          </Typography>
                        </Box>
                        {monthData.totalPrepayment > 0 && (
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'success.main',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 0.5,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            >
                              <span>Prepayment:</span>
                              {formatCurrency(monthData.totalPrepayment)}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PersonalLoanOutstandings; 