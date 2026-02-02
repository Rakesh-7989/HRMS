// Dashboard Components Barrel Export
// This file provides a clean import interface for all dashboard components

export { StatCard } from './StatCard';
export { WelcomeCard } from './WelcomeCard';
export { ListCard } from './ListCard';
export { ChartCard } from './ChartCard';
export { MetricGrid } from './MetricGrid';
export { DashboardSection } from './DashboardSection';
export { DistributionCard } from './DistributionCard';
export { default as PeopleEventsCard } from './PeopleEventsCard';
export { default as CalendarCard } from './CalendarCard';

// Import the dashboard CSS so it's available when any component is imported
import './dashboard.css';
