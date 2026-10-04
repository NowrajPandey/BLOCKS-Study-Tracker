import { createRoot } from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import {markInstall,startBackupWatcher} from '@/backup';
import {startSyncWatcher} from '@/sync';
import {requestDurableStorage,watchForUpdates} from '@/version';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/,'')}>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);

requestDurableStorage();
markInstall();
startBackupWatcher();
startSyncWatcher();
if(import.meta.env.PROD)watchForUpdates();
