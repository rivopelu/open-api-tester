import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
