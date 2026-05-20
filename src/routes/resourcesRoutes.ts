import { Router } from 'express';
import {
  createResourceHandler,
  deleteResourceHandler,
  getResourcesHandler,
  photoUpload,
  updateResourceHandler,
  uploadResourcePhotoHandler,
} from '../controllers/resourcesController.js';

const router = Router({ mergeParams: true });

router.get('/', getResourcesHandler);
router.post('/', createResourceHandler);
router.patch('/:resourceId', updateResourceHandler);
router.post('/:resourceId/photo', photoUpload.single('photo'), uploadResourcePhotoHandler);
router.delete('/:resourceId', deleteResourceHandler);

export default router;
