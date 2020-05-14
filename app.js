express = require('express');
var nunjucks = require('nunjucks');
var bodyParser = require('body-parser');
var db = require('./database.js');
var adminRouter = require('./Routes/admin.js');

var app = express();
var port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: true }));

var PATH_TO_TEMPLATES = './Templates';
nunjucks.configure(PATH_TO_TEMPLATES, {
    autoescape: true,
    express: app
});

app.get('/', function(req, res) {
    return res.send("Thing");
});

app.use('/admin', adminRouter);

app.listen(port, () => console.log(`Example app listening at ${port}`));