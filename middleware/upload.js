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
});

// Utility to upload images directly to GridFS
const uploadToGridFS = async (buffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = gfs.openUploadStream(filename, { contentType });
    uploadStream.write(buffer);
    uploadStream.end();

    uploadStream.on('finish', (file) => {
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
    if (req.body.imageUrl) {
      // Handle image via URL
      req.body.image = req.body.imageUrl;
    } else if (req.file) {
      // Handle image via file upload to GridFS
      const file = req.file;
      const uploadedFile = await uploadToGridFS(file.buffer, file.originalname, file.mimetype);
      req.body.image = `/uploads/${uploadedFile.filename}`; // Save GridFS URL
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed', error: error.message });
  }
};

module.exports = {
  upload,
  handleImageUpload,
};
