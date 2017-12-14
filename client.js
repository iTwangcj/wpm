const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const io = require('socket.io-client');
const config = require('./config');

let socket = null;

const connectionSocket = (params) => {
	// 获取用户认证令牌(本地获取)
	const authPath = path.join(__dirname, './auth');
	if (!fs.existsSync(authPath)) {
		fs.writeFileSync(authPath, '', 'utf-8');
	}
	const authInfo = fs.readFileSync(authPath, 'utf-8');
	
	// 连接socket后端服务器
	socket = io.connect(config.socketUrl);
	socket.on('connect', function () {
		socket.emit('data', { authInfo, params });
	});
	let finished = false;
	socket.on('data', function (dataList) {
		if (dataList && dataList.length && typeof dataList === 'object') {
			for (const data of dataList) {
				// 写入数据（binary）
				if (!fse.ensureFileSync(data.path)) { // 文件不存在则创建
					fs.writeFileSync(data.path, data.data);
				}
			}
		}
		finished = true;
	});
	socket.on('result', function (result) {
		const timer = setInterval(() => {
			if (finished) {
				console.log(result);
				clearInterval(timer);
				socket.disconnect();
			}
		}, 500);
	});
	
	const command = params.command.toLowerCase();
	if (!authInfo || command === 'login' || command === 'l') {
		let username = null, password = null;
		process.stdin.setEncoding('utf8');
		process.stdout.write('Username: ');
		process.stdin.on('data', function (chunk) {
			if (chunk !== null) {
				if (!username) {
					username = chunk;
					process.stdout.write('Password: ');
				} else {
					password = chunk;
					process.stdin.emit('login');
				}
			}
		});
		process.stdin.on('login', () => {
			if (username && password) {
				socket.emit('login', { username: username.replace('\n', ''), password: password.replace('\n', '') });
			}
		});
		socket.on('validation', function (msg) {
			process.stdout.write(msg + ',请重新登陆\n');
			username = password = null;
			process.stdout.write('Username: ');
		});
		socket.on('login_success', function (result) {
			fs.writeFileSync(authPath, result.toString(), 'utf-8');
			process.stdout.write('用户登陆成功, 请开始愉快的玩耍吧!\n');
			process.exit(0);
		});
	}
};

module.exports.connectionSocket = connectionSocket;