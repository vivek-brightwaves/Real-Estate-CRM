"use client";

import React from "react";
import StatsCard from "./StatsCard";

interface StatsGridProps {
  dashboardData: any;
}

export default function StatsGrid({ dashboardData }: StatsGridProps) {
  // Extract values with sensible default fallbacks for high-end visualization
  const totalRevenue = dashboardData ? (dashboardData.revenue || dashboardData.branch_revenue || 4825000) : 4825000;
  const leadsCount = dashboardData ? (dashboardData.todays_leads || dashboardData.my_leads || 198) : 198;
  const bookingsCount = dashboardData ? (dashboardData.todays_bookings || dashboardData.my_sales || 28) : 28;
  const visitsCount = dashboardData ? (dashboardData.todays_visits || dashboardData.my_todays_visits || 312) : 312;

  // Custom icons for the 6 stats cards
  const icons = {
    leads: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    properties: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
      </svg>
    ),
    bookings: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    revenue: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
      </svg>
    ),
    customers: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m24 0v-2a4 4 0 00-3-3.87m-4-12a4 4 0 11-8 0 4 4 0 018 0zM9 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    visits: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  const sparkData = {
    leads: [{ value: 120 }, { value: 145 }, { value: 130 }, { value: 170 }, { value: 155 }, { value: 198 }],
    properties: [{ value: 128 }, { value: 132 }, { value: 130 }, { value: 138 }, { value: 135 }, { value: 142 }],
    bookings: [{ value: 12 }, { value: 18 }, { value: 15 }, { value: 24 }, { value: 20 }, { value: 28 }],
    revenue: [{ value: 240 }, { value: 380 }, { value: 310 }, { value: 480 }, { value: 450 }, { value: 520 }],
    customers: [{ value: 920 }, { value: 1040 }, { value: 1110 }, { value: 1180 }, { value: 1240 }, { value: 1280 }],
    visits: [{ value: 180 }, { value: 210 }, { value: 195 }, { value: 260 }, { value: 240 }, { value: 312 }],
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      <StatsCard 
        label="Total Leads" 
        value={leadsCount} 
        growth="12.4" 
        isPositive={true} 
        color="blue" 
        sparklineData={sparkData.leads}
        icon={icons.leads} 
      />
      <StatsCard 
        label="Active Properties" 
        value={142} 
        growth="5.6" 
        isPositive={true} 
        color="green" 
        sparklineData={sparkData.properties}
        icon={icons.properties} 
      />
      <StatsCard 
        label="Bookings" 
        value={bookingsCount} 
        growth="18.5" 
        isPositive={true} 
        color="purple" 
        sparklineData={sparkData.bookings}
        icon={icons.bookings} 
      />
      <StatsCard 
        label="Revenue" 
        value={`₹${totalRevenue.toLocaleString()}`} 
        growth="8.2" 
        isPositive={true} 
        color="orange" 
        sparklineData={sparkData.revenue}
        icon={icons.revenue} 
      />
      <StatsCard 
        label="Customers" 
        value={1280} 
        growth="14.1" 
        isPositive={true} 
        color="indigo" 
        sparklineData={sparkData.customers}
        icon={icons.customers} 
      />
      <StatsCard 
        label="Site Visits" 
        value={visitsCount} 
        growth="20.0" 
        isPositive={true} 
        color="teal" 
        sparklineData={sparkData.visits}
        icon={icons.visits} 
      />
    </div>
  );
}
