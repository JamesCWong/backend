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

    async handleGet(req, res, parsedUrl) {
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

        try {
            const result = await this.db.query(query);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.rows));
        } catch (err) {
            res.writeHead(500);
            res.end('Database Error: ' + err.message);
        }
    }

    async handlePost(req, res, body) {
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

        try {
            await this.db.query(query);
            res.writeHead(200);
            res.end('Successfully inserted into database');
        } catch (err) {
            res.writeHead(500);
            res.end('Database Error: ' + err.message);
        }
    }
    
}

class MyDB {
    constructor() {
        const { Pool } = require('pg');

        this.db = new Pool ({
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
            //Needed for Render
            ssl: { rejectUnauthorized: false}
        });

        this.init();
    }

    async init() {
        const createTable = `
            CREATE TABLE IF NOT EXISTS patients (
                patientid SERIAL PRIMARY KEY,
                name VARCHAR(100),
                dateOfBirth TIMESTAMP
            );
        `;

        try {
            await this.pool.query(createTable);
            console.log("Table created");
        } catch (err) {
            console.error("Error creating table:", err.message);
        }
    }

    async query(...args) {
        return this.pool.query(...args);
    }
}

const myServer = new Server();