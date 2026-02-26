import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { EmployeeDashboard } from '@/pages/dashboards/EmployeeDashboard';
import { SearchPage } from '@/pages/SearchPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import InboxPage from '@/pages/InboxPage';
import { ChatPage } from '@/pages/ChatPage';
import { HolidaysPage } from '@/pages/HolidaysPage';
import { ProfilePage } from '@/pages/ProfilePage';
import OrganisationPage from '@/pages/OrganisationPage';

export const DashboardRoutes = (
    <>
        <Route
            path="/dashboard/personal"
            element={
                <ProtectedRoute>
                    <EmployeeDashboard />
                </ProtectedRoute>
            }
        />
        <Route
            path="/search"
            element={
                <ProtectedRoute>
                    <SearchPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/notifications"
            element={
                <ProtectedRoute>
                    <NotificationsPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/calendar"
            element={
                <ProtectedRoute>
                    <CalendarPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/inbox"
            element={
                <ProtectedRoute>
                    <InboxPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/chat"
            element={
                <ProtectedRoute>
                    <ChatPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/holidays"
            element={
                <ProtectedRoute>
                    <HolidaysPage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/profile"
            element={
                <ProtectedRoute>
                    <ProfilePage />
                </ProtectedRoute>
            }
        />
        <Route
            path="/organisation"
            element={
                <ProtectedRoute requiredPermissions={['view_organization_structure']}>
                    <OrganisationPage />
                </ProtectedRoute>
            }
        />
    </>
);
