const { faker } = require('@faker-js/faker');
const majors = require('./majors.json');
const sortBy = require('lodash/sortBy');
const studentsByIp = {};

const getStudentsByIp = async ip => {
	if (!studentsByIp[ip]) {
		studentsByIp[ip] = {};
		for (let i = 0; i < 20; i++) {
			const student = {
				id: 100000000 + i,
				dateOfBirth: faker.date.birthdate({min: 18, max: 25, mode: 'age'}).toLocaleDateString(),
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				year: faker.number.int({min: 1, max: 4}),
				major: faker.helpers.arrayElement(majors),
				gpa: faker.number.float({min: 2, max: 4, precision: 0.01}),
				advisor: `${faker.person.firstName()} ${faker.person.lastName()}`,
				isRegistered: faker.datatype.boolean({ probability: 0.75 })
			};
			student.email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@uj.edu`;

			if (student.isRegistered) {
				student.registrationDate = faker.date.recent({days: student.year * 365}).toLocaleString();
			}

			studentsByIp[ip][student.id] = student;
			sortBy(studentsByIp[ip], ['id']);
		}
		console.log(`Created students object for IP ${ip}`);
	}
	return Promise.resolve(studentsByIp[ip]);
};

module.exports = {
	getAllStudents: async ip => {
		const students = await getStudentsByIp(ip);
		return Promise.resolve({body: JSON.stringify(Object.values(students))});
	},
	getStudentById: async (ip, id) => {
		const students = await getStudentsByIp(ip);
		if (!students[id]) return Promise.resolve({status: 404});
		return Promise.resolve({body: JSON.stringify(students[id])});
	},
	addStudent: async (ip, json) => {
		const students = await getStudentsByIp(ip);
		if (!json || !json.id) {
			return Promise.resolve({status: 400, body: 'id is a required field.'});
		}
		if (students[json.id]) {
			return Promise.resolve({status: 409, body: `Student with ID ${json.id} already exists.`});
		}
		students[json.id] = json;
		return Promise.resolve({status: 201});
	},
	modifyStudent: async (ip, json, id, isPatch) => {
		const students = await getStudentsByIp(ip);
		if (!students[id]) return Promise.resolve({status: 404, body: `Student with ID ${id} not found.`});
		if (isPatch) {
			students[id] = Object.assign({}, students[id], json);
			return Promise.resolve();
		} else {
			if (!json.id) json.id = id;
			students[id] = json;
			return Promise.resolve({status: 201});
		}
	},
	deleteStudent: async (ip, id) => {
		const students = await getStudentsByIp(ip);
		if (!students[id]) return Promise.resolve({status: 404, body: `Student with ID ${id} not found.`});
		delete students[id];
		return Promise.resolve();
	},
	resetStudents: async ip => {
		delete studentsByIp[ip];
		await getStudentsByIp(ip);
		return Promise.resolve();
	}
};

