const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');

// MongoDB connection URI
const mongoURI = process.env.MONGO_URI;

// Create a mongoose connection
const conn = mongoose.createConnection(mongoURI);

let gfs;
conn.once('open', () => {
  // Initialize GridFS
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads',
  });
});

// GridFS storage configuration
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = `${buf.toString('hex')}${path.extname(file.originalname)}`;
        console.log('Generated filename:', filename);  // Log the generated filename

        const fileInfo = {
          filename,
          bucketName: 'uploads',
        };
        resolve(fileInfo);
      });
    });
  },
});

// Multer middleware
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Example: Set file size limit to 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only jpg, png, gif are allowed.'));
    }
  }
});

// Utility to upload images directly to GridFS
const uploadToGridFS = async (buffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = gfs.openUploadStream(filename, { contentType });
    uploadStream.write(buffer);
    uploadStream.end();

    uploadStream.on('finish', (file) => {
      console.log('File uploaded to GridFS:', file);  // Log the file object
      resolve(file);
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });
  });
};

// Middleware to handle URL or actual image uploads
const handleImageUpload = async (req, res, next) => {
  try {
    console.log('Files received by multer:', req.files);

    if (req.body.imageUrl) {
      // Use image URL directly
      req.body.image = req.body.imageUrl;
    } else if (req.files?.imageFile && req.files.imageFile[0]) {
      // Directly access file details from GridFS
      const file = req.files.imageFile[0];
      console.log('Processing uploaded file:', file);

      // Use the already uploaded file's data
      req.body.imageId = file.id;
      req.body.image = `/uploads/${file.filename}`;

      console.log('Stored image info:', {
        imageId: req.body.imageId,
        image: req.body.image,
      });
    }

    next();
  } catch (error) {
    console.error('Error in handleImageUpload:', error);
    res.status(500).json({ message: 'Image upload failed', error: error.message });
  }
};



module.exports = {
  upload,
  handleImageUpload,
};
