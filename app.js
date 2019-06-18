const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const PouchDB = require('pouchdb');

app.set('view engine', 'ejs');
app.use(express.static('public'));

var db = new PouchDB('dna_database');

app.get('/', function (req, res) {
    res.render('index')
});

function generateUniqueID() {
    return Math.random().toString(36).substr(2, 9);
}


io.on('connection', function (socket) {

    db.allDocs({
        include_docs: true,
        attachments: true
    }).then(function (result) {
        socket.emit('init', {data: result.rows.map(r => r.doc)});
    }).catch(function (err) {
        console.log(err);
    });


    socket.on('notifyUse', function (data) {


        db.get(data._id)
            .then(doc => {
                return db.put({
                    _id: doc._id,
                    available: doc.available > 0 ? doc.available - 1 : 0,
                    name: doc.name,
                    _rev: doc._rev
                })
            })
            .then(savedDoc => {
                return db.get(data._id)
            })
            .then(refreshedDoc => {
                io.emit('update', refreshedDoc);
            })
            .catch(err => {
                console.error(err);
                io.emit('error', err);
            })


    });

    socket.on('refill', function (data) {
        db.get(data._id)
            .then(doc => {
                return db.put({
                    _id: doc._id,
                    available: 50,
                    name: doc.name,
                    _rev: doc._rev
                })
            })
            .then(savedDoc => {
                return db.get(data._id)
            })
            .then(refreshedDoc => {
                io.emit('update', refreshedDoc);
            })
            .catch(err => {
                console.error(err);
                io.emit('error', err);
            })
    });

    socket.on('newItem', function (data) {

        const newID = generateUniqueID();
        db.put({
            _id: newID,
            name: data.name,
            available: 50
        })
            .then(() => {
                return db.get(newID)
            })
            .then((item) => {
                io.emit('newItem', item)
            })
            .catch(err => {
                console.log(err);
            });

    })

});


//start
server.listen(3000);