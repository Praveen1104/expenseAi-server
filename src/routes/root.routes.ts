import { Router } from 'express';
import { getRootInfo } from '../controllers/root.controller.js';

const router = Router();

router.get('/', getRootInfo);

export default router;
