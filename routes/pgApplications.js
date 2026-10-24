const express = require('express');
const {
  getAllPGApplications,
  getPGApplicationById,
  createPGApplication,
  updatePGApplication,
  deletePGApplication,
  getPGApplicationsStats,
  downloadPGApplicationsPDF,
  getPGApplicationsByUserId
} = require('../controllers/pgApplicationController');

const router = express.Router();

router.post('/createpg', createPGApplication);

router.get('/getpg', getAllPGApplications);

router.get('/by-user/:userId', getPGApplicationsByUserId);

router.get('/stats/overview', getPGApplicationsStats);
router.get('/download-pdf', downloadPGApplicationsPDF);
router.get('/:id', getPGApplicationById);

router.put('/:id', updatePGApplication);
router.delete('/:id', deletePGApplication);

module.exports = router;