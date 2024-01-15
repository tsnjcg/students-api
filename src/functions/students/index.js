const { app } = require('@azure/functions');
const { faker } = require('@faker-js/faker');
const service = require('./services/students-service');

app.http('students', {
	route: 'students/{id?}',
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    handler: async (req, ctx) => {
		try {
			let ip = 'unknown';
			for (const header of req.headers) {
				if (header[0].toLowerCase() === 'x-forwarded-for') {
					ip = header[1].split(':')[0];
				}
			}
			console.log(`Request received from ${ip}`);

			// Call the appropriate function based on the HTTP method name
			const body = await services[req.method.toLowerCase()](req, ip);
			const payload = Object.assign({},
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						// Custom header
						'X-Server-Event-ID': faker.number.int({min: 100000, max: 999999})
					}
				},
				body || {});
			// Return the result
			return Promise.resolve(payload);
		} catch (err) {
			ctx.error(err);
			return Promise.resolve({ status: 500 });
		}
    }
});

const services = {
	get: async (req, ip) => {
		if (req.params.id === 'reset') {
			await service.resetStudents(ip);
			return Promise.resolve({ body: 'Students list successfully reset' });
		} else {
			const body = req.params.id ? await service.getStudentById(ip, parseInt(req.params.id)) :
				await service.getAllStudents(ip);
			return Promise.resolve(body);
		}
	},
	post: async (req, ip) => {
		const json = await parseJson(req);
		if (!json) return Promise.resolve({ status: 400, body: 'Invalid JSON body' });
		const body = await service.addStudent(ip, json);
		return Promise.resolve(body);
	},
	put: async (req, ip) => {
		const json = await parseJson(req);
		const isPatch = req.method.toUpperCase() === 'PATCH';
		if (isPatch && !req.params.id) return Promise.resolve({ status: 400, body: 'ID required in URL' });
		const id = isPatch ? parseInt(req.params.id) : json.id;
		if (!id || !json) return Promise.resolve({ status: 400, body: 'Invalid JSON body' });
		const body = await service.modifyStudent(ip, json, id, isPatch);
		return Promise.resolve(body);
	},
	patch: async (req, ip) => await services.put(req, ip),
	delete: async (req, ip) => {
		const body = await service.deleteStudent(ip, req.params.id);
		return Promise.resolve(body);
	}
};

const parseJson = async req => {
	try {
		return await req.json();
	} catch (err) {
		// JSON parse error
		return null;
	}
}
