import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  var options = {
    root: __dirname,
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };
  let fileName = 'index.html';
  res.sendFile(fileName, options, function (err) {
    if (err) {
      console.error(err);
      return res.status(err.status).end();
    } else {
      console.log('Sent:', fileName);
    }
  });
});

export default router;