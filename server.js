'use strict';

// import module
const express = require('express');

// create instance and desired port
const app = express();
const PORT = 3000;

// serves files in public
app.use(express.static('public'));


// serves at root
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// serve static files
app.use(express.static('public'));


// start app
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

