import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="527332905735-09ghcgs94fd2g3l39dbcabbq101spclp.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
