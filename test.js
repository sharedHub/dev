const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require("cors")
const app = express();


app.use(cors());

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specify the destination folder where files will be saved
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use the current timestamp as the filename
  }
});

// Create a multer instance with the storage settings
const upload = multer({ storage: storage });

// Route for file upload
app.post('/upload', upload.single('file'), (req, res) => {
  // Handle the uploaded file
  res.send('File uploaded successfully');
});

app.get('/upload', (req, res) => {
  // const filename = req.query.filename; // Access filename from query parameter
  const filePath = path.join(__dirname, 'uploads/');
  console.log(filePath);
  res.send(filePath);
});




// Start the server
const PORT =  3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
