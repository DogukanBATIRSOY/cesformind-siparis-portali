import { Router } from 'express';
import { 
  syncData,
  getLastSyncTime,
  getOfflineData,
  pushOfflineChanges,
  resolveConflicts
} from '../controllers/sync.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Offline sync endpoints (el terminalleri için)
router.get('/last-sync', getLastSyncTime);
router.get('/offline-data', getOfflineData);
router.post('/push', pushOfflineChanges);
router.post('/sync', syncData);
router.post('/resolve-conflicts', resolveConflicts);

export default router;
