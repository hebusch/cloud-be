import multer from 'multer';
import { config } from 'dotenv';

config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
});

const upload = multer({ storage: storage });

export default upload;
