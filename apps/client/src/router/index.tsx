import { createBrowserRouter, Navigate } from 'react-router-dom'
import { router } from '../routes'
import RequireAuth from '../components/RequireAuth'
import DashboardPage from '../pages/dashboard/dashboard-page'
import { DesignerPanel } from '../components/designer/DesignerPanel';
import { ConverterPanel } from '../components/converter/ConverterPanel';
import { ComponentsPanel } from '../components/components/ComponentsPanel';
import { SecurityPanel } from '../components/security/SecurityPanel';
import { PreviewPanel } from '../components/preview/PreviewPanel';
import LabLayout from '../pages/lab/lab-layout';
import LabIndexPage from '../pages/lab/lab-index-page';
import ButtonLabPage from '../pages/lab/button-lab-page';
import CardLabPage from '../pages/lab/card-lab-page';
import TypographyLabPage from '../pages/lab/typography-lab-page';
import CheckboxLabPage from '../pages/lab/checkbox-lab-page';
import SelectLabPage from '../pages/lab/select-lab-page';
import InputLabPage from '../pages/lab/input-lab-page';
import AvatarLabPage from '../pages/lab/avatar-lab-page';
import SpinnerLabPage from '../pages/lab/spinner-lab-page';
import ShowcaseLabPage from '../pages/lab/showcase-lab-page';
import AuthCallbackPage from '../pages/auth-callback-page';
import SignInPage from '../pages/auth/sign-in-page';
import EditorLayout from '../pages/editor/editor-layout';
import EditorHomePage from '../pages/editor/editor-home-page';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to={router.dashboard()} replace />,
  },
  {
    path: '/auth',
    element: <AuthCallbackPage />,
  },
  {
    path: '/auth/sign-in',
    element: <SignInPage />,
  },
  {
    path: '/lab',
    element: <LabLayout />,
    children: [
      { index: true, element: <LabIndexPage /> },
      { path: 'button', element: <ButtonLabPage /> },
      { path: 'card', element: <CardLabPage /> },
      { path: 'typography', element: <TypographyLabPage /> },
      { path: 'checkbox', element: <CheckboxLabPage /> },
      { path: 'select', element: <SelectLabPage /> },
      { path: 'input', element: <InputLabPage /> },
      { path: 'avatar', element: <AvatarLabPage /> },
      { path: 'spinner', element: <SpinnerLabPage /> },
      { path: 'showcase', element: <ShowcaseLabPage /> },
    ],
  },
  {
    // Protected area — requires a valid session before rendering the app shell.
    element: <RequireAuth />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/editor',
        element: <EditorLayout />,
        children: [
          { index: true, element: <EditorHomePage /> },
          { path: 'designer', element: <DesignerPanel /> },
          { path: 'converter', element: <ConverterPanel /> },
          { path: 'schemas', element: <ComponentsPanel /> },
          { path: 'security', element: <SecurityPanel /> },
          { path: 'preview', element: <PreviewPanel /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={router.dashboard()} replace />,
  },
]);