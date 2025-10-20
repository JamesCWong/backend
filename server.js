class Server {
    constructor(){
        this.http = require('http');
        this.url = require('url');

        this.PORT = process.env.PORT || 3000;

        this.db = new MyDB();

        this.server = this.http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                return res.end();
            }

            const parsedUrl = this.url.parse(req.url, true);
            let body = '';

            //put the request together
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                if(req.method === 'POST') {
                    this.handlePost(req, res, body);
                } else if (req.method === 'GET') {
                    this.handleGet(req, res, parsedUrl);
                } else {
                    res.writeHead(405);
                    res.end('Method not allowed');
                }
            });
        });

        this.server.listen(this.PORT, () => {
            console.log(`Server running on port ${this.PORT}`);
        });
    }

    handleGet(req, res, parsedUrl) {
        const query = parsedUrl.query.q;

        //Error handling for GET
        if(!query) {
            //Handle empty requests
            res.writeHead(400);
            return res.end('Request contained no data.');
        } else if (!query.toLowerCase().startsWith('select')) {
            //Not allowed to attempt requests that don't SELECT for GET.
            res.writeHead(403);
            return res.end('Only SELECT allowed for GET requests.')
        }

        this.db.query(query, (err, results) => {
            if(err) {
                //Internal server error
                res.writeHead(500);
                return res.end('Database Error: ' + err.message);
            }

            //If it works
            res.writeHead(200, { 'Content-Type': 'application/json'});
            res.end(JSON.stringify(results));
        });
    }

    handlePost(req, res, body) {
        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch (err) {
            //Bad request
            res.writeHead(400);
            return res.end('Invalid JSON');
        }

        const query = parsed.query;

        //Error handling for POST
        if(!query) {
            //Handle empty requests
            res.writeHead(400);
            return res.end('Request contained no data.');
        } else if (!query.toLowerCase().startsWith('insert')) {
            //Not allowed to attempt requests that don't insert for post.
            res.writeHead(403);
            return res.end('Only INSERT allowed for POST requests.')
        }

        this.db.query(query, (err) => {
            if (err) {
                //Internal Server Error
                res.writeHead(500);
                return res.end('Database Error: ' + err.message);
            }

            res.writeHead(200);
            res.end('Successfully inserted into database');
        })
    }
    
}

class MyDB {
    constructor() {
        this.mysql = require('mysql');

        this.db = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        this.db.connect(err =>{
            if(err) throw err;

            //The SQL query that will attempt to create a database upon loading.
            const createTable = `
            CREATE TABLE IF NOT EXISTS patients (
                patientid INT(11) PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100),
                dateOfBirth DATETIME
            ) ENGINE=InnoDB;
            `;

            this.db.query(createTable);
        });
    }

    query(...args) {
        this.db.query(...args);
    }
}

const myServer = new Server();