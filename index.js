const express = require("express");
const app = express();
const port = 5000;

app.get("/", (req, res) => {
  res.send("Share bite server is running!");
});

app.listen(port, () => {
  console.log(`Share bite server app listening on port ${port}`);
});
