const http = require('http');

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    try {
        // 1. List teachers
        console.log('Listing teachers...');
        const listRes = await request('GET', '/api/teachers');
        console.log('List response:', listRes.status);
        const teachers = JSON.parse(listRes.body);
        if (!teachers.length) {
            console.log('No teachers found.');
            return;
        }
        const teacherId = teachers[0].id;
        console.log('Using teacher ID:', teacherId);

        // 2. Update extracurricular
        console.log('Updating extracurricular...');
        const updateRes = await request('PUT', `/api/teachers/${teacherId}/extracurricular`, {
            activities: [{ title: 'Test Activity', type: 'Test', date: '2025-01-01' }]
        });
        console.log('Update response:', updateRes.status, updateRes.body);

        // 3. Verify update
        console.log('Verifying update...');
        const getRes = await request('GET', `/api/teachers/${teacherId}/extracurricular`);
        console.log('Get response:', getRes.status, getRes.body);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
